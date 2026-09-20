import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Step2_Connection from './Step2_Connection';
import { testCustomMcpServerConnection } from '@/services/agents/customMcpServerService';

// EVO-1739: a test result must never outlive the url/headers it was produced for.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
}));
vi.mock('@/services/agents/customMcpServerService', () => ({
  testCustomMcpServerConnection: vi.fn(),
}));

const okResult = {
  test_result: {
    success: true,
    tools_count: 3,
    error: '',
    message: '',
    response_time: 0.1,
    status_code: 200,
    url_tested: 'https://good.example/mcp',
  },
};

const renderStep = (url: string, headers: Record<string, unknown> = {}) => {
  const props = { onChange: vi.fn(), onNext: vi.fn(), onBack: vi.fn() };
  const { rerender } = render(<Step2_Connection data={{ url, headers }} {...props} />);
  return {
    ...props,
    setData: (nextUrl: string, nextHeaders: Record<string, unknown> = {}) =>
      rerender(<Step2_Connection data={{ url: nextUrl, headers: nextHeaders }} {...props} />),
  };
};

const clickTest = () => fireEvent.click(screen.getByText('wizard.test.button'));
const successPanel = () => screen.queryByText(/^wizard\.test\.ok/);

describe('Step2_Connection — test before save', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the typed url and headers to the stateless endpoint', async () => {
    vi.mocked(testCustomMcpServerConnection).mockResolvedValue(okResult);
    renderStep('  https://good.example/mcp  ', { Authorization: 'Bearer sk' });

    clickTest();

    await waitFor(() => expect(successPanel()).toBeTruthy());
    expect(testCustomMcpServerConnection).toHaveBeenCalledWith('https://good.example/mcp', {
      Authorization: 'Bearer sk',
    });
    // The count comes from the live handshake, not a persisted tools array.
    expect(successPanel()!.textContent).toContain('"count":3');
  });

  it('drops the result once the url changes', async () => {
    vi.mocked(testCustomMcpServerConnection).mockResolvedValue(okResult);
    const { setData } = renderStep('https://good.example/mcp');

    clickTest();
    await waitFor(() => expect(successPanel()).toBeTruthy());

    setData('https://typo.invalid/nope');

    expect(successPanel()).toBeNull();
  });

  it('drops the result once a header changes', async () => {
    vi.mocked(testCustomMcpServerConnection).mockResolvedValue(okResult);
    const { setData } = renderStep('https://good.example/mcp', { Authorization: 'Bearer old' });

    clickTest();
    await waitFor(() => expect(successPanel()).toBeTruthy());

    setData('https://good.example/mcp', { Authorization: 'Bearer new' });

    expect(successPanel()).toBeNull();
  });

  it('ignores a reply that lands after the user moved on', async () => {
    let resolveTest: (v: typeof okResult) => void = () => {};
    vi.mocked(testCustomMcpServerConnection).mockReturnValue(
      new Promise(resolve => {
        resolveTest = resolve;
      }),
    );
    const { setData } = renderStep('https://good.example/mcp');

    clickTest();
    setData('https://changed.example/mcp');
    resolveTest(okResult);

    await waitFor(() =>
      expect(screen.getByText('wizard.test.button')).toBeTruthy(),
    );
    expect(successPanel()).toBeNull();
  });

  it('shows the failure message when the handshake fails', async () => {
    vi.mocked(testCustomMcpServerConnection).mockResolvedValue({
      test_result: { ...okResult.test_result, success: false, message: 'connection refused' },
    });
    renderStep('https://bad.example/mcp');

    clickTest();

    await waitFor(() => expect(screen.getByText('connection refused')).toBeTruthy());
  });

  it('does not call the API for an unparseable url', () => {
    renderStep('not-a-url');

    clickTest();

    expect(testCustomMcpServerConnection).not.toHaveBeenCalled();
    expect(screen.getByText('form.validation.urlInvalid')).toBeTruthy();
  });
});
