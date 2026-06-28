import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import FrontendServicesSection from './FrontendServicesSection';

const stableT = (key: string) => key;

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: stableT,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();

vi.mock('@/services/admin/adminConfigService', () => ({
  adminConfigService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  },
}));

vi.mock('@/utils/apiHelpers', () => ({
  extractError: () => ({ message: 'Test error' }),
}));

async function renderAndWait(mockData: Record<string, unknown> = {
  RECAPTCHA_SITE_KEY: '',
  CLARITY_PROJECT_ID: '',
}) {
  mockGetConfig.mockImplementation(() => Promise.resolve(mockData));
  await act(async () => {
    render(<FrontendServicesSection />);
  });
}

describe('FrontendServicesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner before data loads', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    const { container } = render(<FrontendServicesSection />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads config from the frontend_runtime endpoint', async () => {
    await renderAndWait();

    expect(mockGetConfig).toHaveBeenCalledWith('frontend_runtime');
    expect(mockGetConfig).toHaveBeenCalledTimes(1);
  });

  it('renders section title, description and card title', async () => {
    await renderAndWait();

    expect(screen.getByText('frontendRuntime.title')).toBeInTheDocument();
    expect(screen.getByText('frontendRuntime.description')).toBeInTheDocument();
    expect(screen.getByText('frontendRuntime.fields.cardTitle')).toBeInTheDocument();
  });

  it('renders both form fields', async () => {
    await renderAndWait();

    expect(screen.getByLabelText('frontendRuntime.fields.recaptchaSiteKey')).toBeInTheDocument();
    expect(screen.getByLabelText('frontendRuntime.fields.clarityProjectId')).toBeInTheDocument();
  });

  it('populates fields with loaded config values', async () => {
    await renderAndWait({
      RECAPTCHA_SITE_KEY: '6Lc_test_key',
      CLARITY_PROJECT_ID: 'clarity_test_id',
    });

    expect(screen.getByLabelText('frontendRuntime.fields.recaptchaSiteKey')).toHaveValue('6Lc_test_key');
    expect(screen.getByLabelText('frontendRuntime.fields.clarityProjectId')).toHaveValue('clarity_test_id');
  });

  it('calls saveConfig with frontend_runtime on form submit', async () => {
    await renderAndWait({
      RECAPTCHA_SITE_KEY: '6Lc_test_key',
      CLARITY_PROJECT_ID: 'clarity_test_id',
    });
    mockSaveConfig.mockResolvedValue({
      RECAPTCHA_SITE_KEY: '6Lc_test_key',
      CLARITY_PROJECT_ID: 'clarity_test_id',
    });

    await act(async () => {
      fireEvent.click(screen.getByText('frontendRuntime.save'));
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('frontend_runtime', expect.objectContaining({
        RECAPTCHA_SITE_KEY: '6Lc_test_key',
        CLARITY_PROJECT_ID: 'clarity_test_id',
      }));
    });
  });

  it('shows error toast when save fails', async () => {
    const { toast } = await import('sonner');
    await renderAndWait();
    mockSaveConfig.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      fireEvent.click(screen.getByText('frontendRuntime.save'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('frontendRuntime.messages.saveError', {
        description: 'Test error',
      });
    });
  });
});
