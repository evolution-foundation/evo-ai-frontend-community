import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomToolTestResultDialog from './CustomToolTestResultDialog';
import type { CustomTool } from '@/types/ai';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const baseTool: CustomTool = {
  id: 'tool-1',
  name: 'My Tool',
  description: 'desc',
  method: 'GET',
  endpoint: 'https://api.example.com/x',
  headers: {},
  path_params: {},
  query_params: {},
  body_params: {},
  error_handling: {},
  values: {},
  tags: [],
  examples: [],
  input_modes: [],
  output_modes: [],
  created_at: '2026-06-24T00:00:00Z',
  updated_at: '2026-06-24T00:00:00Z',
};

describe('CustomToolTestResultDialog', () => {
  it('renders success title and metrics when test succeeded', () => {
    render(
      <CustomToolTestResultDialog
        open
        onOpenChange={() => {}}
        tool={baseTool}
        result={{
          success: true,
          status_code: 200,
          response_time: 0.123,
          headers: { 'content-type': 'application/json' },
          error: '',
        }}
      />,
    );
    expect(screen.getByText('testResult.titleSuccess')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
    // Backend sends seconds; UI renders rounded milliseconds.
    expect(screen.getByText('123ms')).toBeTruthy();
  });

  it('renders failure title and error message when test failed with DNS error', () => {
    render(
      <CustomToolTestResultDialog
        open
        onOpenChange={() => {}}
        tool={baseTool}
        result={{
          success: false,
          status_code: 0 as unknown as number,
          response_time: 0,
          headers: {},
          error: 'HTTP request failed: dial tcp: lookup api.example.com: no such host',
        }}
      />,
    );
    expect(screen.getByText('testResult.titleError')).toBeTruthy();
    expect(screen.getByText('testResult.errorLabel')).toBeTruthy();
    expect(
      screen.getByText(/HTTP request failed: dial tcp/),
    ).toBeTruthy();
    // Both metrics show "—" when status/time absent
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows "no data" hint when failure has neither error nor status', () => {
    render(
      <CustomToolTestResultDialog
        open
        onOpenChange={() => {}}
        tool={baseTool}
        result={{
          success: false,
          status_code: 0 as unknown as number,
          response_time: 0,
          headers: {},
          error: '',
        }}
      />,
    );
    expect(screen.getByText('testResult.noData')).toBeTruthy();
  });

  it('calls onOpenChange(false) when Close is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <CustomToolTestResultDialog
        open
        onOpenChange={onOpenChange}
        tool={baseTool}
        result={{
          success: true,
          status_code: 200,
          response_time: 50,
          headers: {},
          error: '',
        }}
      />,
    );
    fireEvent.click(screen.getByText('testResult.close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
