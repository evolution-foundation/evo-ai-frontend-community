import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TestRequestButton from './TestRequestButton';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockTestCustomTool = vi.fn();
vi.mock('@/services/agents/customToolsService', () => ({
  testCustomTool: (...args: unknown[]) => mockTestCustomTool(...args),
}));

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
});
