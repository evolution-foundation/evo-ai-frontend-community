import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TestRequestButton from './TestRequestButton';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockTestCustomTool = vi.fn();
const mockTestCustomToolPayload = vi.fn();
vi.mock('@/services/agents/customToolsService', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/agents/customToolsService')
  >('@/services/agents/customToolsService');
  return {
    // getErrorMessage is exercised for real: asserting on the message the user
    // actually reads is the point of the failure tests below.
    getErrorMessage: actual.getErrorMessage,
    testCustomTool: (...args: unknown[]) => mockTestCustomTool(...args),
    testCustomToolPayload: (...args: unknown[]) => mockTestCustomToolPayload(...args),
  };
});

describe('TestRequestButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('in create mode the button is disabled', () => {
    render(<TestRequestButton mode="create" />);
    const btn = screen.getByRole('button', { name: 'testRequest.button' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('in edit mode without toolId the button is disabled', () => {
    render(<TestRequestButton mode="edit" />);
    const btn = screen.getByRole('button', { name: 'testRequest.button' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('in edit mode with toolId calls testCustomTool and renders result', async () => {
    mockTestCustomTool.mockResolvedValue({
      test_result: {
        error: '',
        headers: { 'content-type': 'application/json' },
        response_time: 0.123,
        status_code: 200,
        success: true,
      },
      tools: {},
    });
    render(<TestRequestButton mode="edit" toolId="abc-1" />);
    const btn = screen.getByRole('button', { name: 'testRequest.button' });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByTestId('test-request-result')).toBeTruthy();
    });
    expect(mockTestCustomTool).toHaveBeenCalledWith('abc-1');
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('123ms')).toBeTruthy();
  });

  it('surfaces error message on failure', async () => {
    mockTestCustomTool.mockRejectedValue(new Error('network down'));
    render(<TestRequestButton mode="edit" toolId="abc-2" />);
    fireEvent.click(screen.getByRole('button', { name: 'testRequest.button' }));
    await waitFor(() => {
      expect(screen.getByText('network down')).toBeTruthy();
    });
  });

  // EVO-1738 test-before-save (R1 review).
  describe('payload mode', () => {
    const payload = {
      method: 'GET',
      endpoint: 'https://api.example.com/users/{id}',
      headers: { 'X-Token': 'abc' },
      path_params: { id: '42' },
      query_params: { limit: 10 },
      body_params: {},
    };

    it('is enabled in create mode and tests the draft payload, not a saved tool', async () => {
      mockTestCustomToolPayload.mockResolvedValue({
        test_result: {
          error: '',
          headers: { 'content-type': 'application/json' },
          response_time: 0.25,
          status_code: 201,
          success: true,
          body: '{"id":1}',
        },
      });

      render(<TestRequestButton mode="create" getPayload={() => payload} />);
      const btn = screen.getByRole('button', { name: 'testRequest.button' });
      // The create-mode lockout only existed because an unsaved tool had no id.
      expect((btn as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(btn);
      await waitFor(() => {
        expect(screen.getByTestId('test-request-result')).toBeTruthy();
      });

      expect(mockTestCustomToolPayload).toHaveBeenCalledWith(payload);
      expect(mockTestCustomTool).not.toHaveBeenCalled();
      expect(screen.getByText('201')).toBeTruthy();
      expect(screen.getByText('250ms')).toBeTruthy();
      // The response body is the whole point of testing — it must be rendered.
      expect(screen.getByText(/"id": 1/)).toBeTruthy();
    });

    it("surfaces the API's reason, not axios's generic status line", async () => {
      // Core's envelope: { success:false, error:{ code, message, details } }.
      mockTestCustomToolPayload.mockRejectedValue({
        message: 'Request failed with status code 400',
        response: {
          data: {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'unsupported method: TRACE' },
          },
        },
      });

      render(<TestRequestButton mode="create" getPayload={() => payload} />);
      fireEvent.click(screen.getByRole('button', { name: 'testRequest.button' }));

      await waitFor(() => {
        expect(screen.getByText('unsupported method: TRACE')).toBeTruthy();
      });
      expect(screen.queryByText('Request failed with status code 400')).toBeNull();
    });

    it('appends validation field details so the user knows what to fix', async () => {
      mockTestCustomToolPayload.mockRejectedValue({
        message: 'Request failed with status code 400',
        response: {
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: { fields: [{ field: 'Endpoint', message: 'is required' }] },
            },
          },
        },
      });

      render(<TestRequestButton mode="create" getPayload={() => payload} />);
      fireEvent.click(screen.getByRole('button', { name: 'testRequest.button' }));

      await waitFor(() => {
        expect(
          screen.getByText('Validation failed (Endpoint: is required)'),
        ).toBeTruthy();
      });
    });
  });
});
