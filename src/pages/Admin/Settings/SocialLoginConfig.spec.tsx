import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import SocialLoginConfig from './SocialLoginConfig';

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

const EMPTY_GOOGLE = {
  GOOGLE_OAUTH_CLIENT_ID: '',
  GOOGLE_OAUTH_CLIENT_SECRET: null,
  GOOGLE_OAUTH_CALLBACK_URL: '',
};

const EMPTY_MICROSOFT = {
  AZURE_APP_ID: '',
  AZURE_APP_SECRET: null,
};

const CONFIGURED_GOOGLE = {
  GOOGLE_OAUTH_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: '••••masked',
  GOOGLE_OAUTH_CALLBACK_URL: 'https://example.com/auth/google/callback',
};

const CONFIGURED_MICROSOFT = {
  AZURE_APP_ID: 'test-azure-app-id',
  AZURE_APP_SECRET: '••••masked',
};

async function renderAndWait(
  googleData: Record<string, unknown> = EMPTY_GOOGLE,
  microsoftData: Record<string, unknown> = EMPTY_MICROSOFT,
) {
  mockGetConfig.mockImplementation((type: string) => {
    if (type === 'google_oauth') return Promise.resolve(googleData);
    if (type === 'microsoft') return Promise.resolve(microsoftData);
    return Promise.resolve({});
  });
  await act(async () => {
    render(<SocialLoginConfig />);
  });
}

describe('SocialLoginConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner before data loads', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SocialLoginConfig />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads config from both google_oauth and microsoft endpoints', async () => {
    await renderAndWait();

    expect(mockGetConfig).toHaveBeenCalledWith('google_oauth');
    expect(mockGetConfig).toHaveBeenCalledWith('microsoft');
  });

  it('renders title and description', async () => {
    await renderAndWait();

    expect(screen.getByText('socialLogin.title')).toBeInTheDocument();
    expect(screen.getByText('socialLogin.description')).toBeInTheDocument();
  });

  it('renders both section card titles', async () => {
    await renderAndWait();

    expect(screen.getByText('socialLogin.google.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('socialLogin.microsoft.cardTitle')).toBeInTheDocument();
  });

  it('renders all 4 form fields (2 Google + 2 Microsoft)', async () => {
    await renderAndWait();

    expect(screen.getByLabelText('socialLogin.google.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('socialLogin.google.fields.clientSecret')).toBeInTheDocument();
    expect(screen.getByLabelText('socialLogin.microsoft.fields.appId')).toBeInTheDocument();
    expect(screen.getByLabelText('socialLogin.microsoft.fields.appSecret')).toBeInTheDocument();
  });

  it('shows a read-only callback URL with copy button on each provider card', async () => {
    await renderAndWait();

    // One callback URL box per card (Gmail channel + Outlook channel).
    expect(screen.getAllByText('socialLogin.callbackUrl.label')).toHaveLength(2);
    expect(
      screen.getByDisplayValue(`${window.location.origin}/google/callback`),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(`${window.location.origin}/microsoft/callback`),
    ).toBeInTheDocument();
  });

  it('shows secret configured status for masked secrets', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);

    const googleConfigured = screen.getAllByText('socialLogin.google.secretConfigured');
    expect(googleConfigured).toHaveLength(1);
    const microsoftConfigured = screen.getAllByText('socialLogin.microsoft.secretConfigured');
    expect(microsoftConfigured).toHaveLength(1);
  });

  it('shows secret not configured when secrets are empty', async () => {
    await renderAndWait(EMPTY_GOOGLE, EMPTY_MICROSOFT);

    const googleNotConfigured = screen.getAllByText('socialLogin.google.secretNotConfigured');
    expect(googleNotConfigured).toHaveLength(1);
    const microsoftNotConfigured = screen.getAllByText('socialLogin.microsoft.secretNotConfigured');
    expect(microsoftNotConfigured).toHaveLength(1);
  });

  it('renders two independent save buttons', async () => {
    await renderAndWait();

    const saveButtons = screen.getAllByText('socialLogin.save');
    expect(saveButtons).toHaveLength(2);
  });

  it('saves Google section independently via google_oauth config type', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockResolvedValue(CONFIGURED_GOOGLE);

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('google_oauth', expect.objectContaining({
        GOOGLE_OAUTH_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
      }));
    });
  });

  it('saves Microsoft section independently via microsoft config type', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockResolvedValue(CONFIGURED_MICROSOFT);

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[1]);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('microsoft', expect.objectContaining({
        AZURE_APP_ID: 'test-azure-app-id',
      }));
    });
  });

  it('sends null for unmodified secrets on Google save', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockResolvedValue(CONFIGURED_GOOGLE);

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('google_oauth', expect.objectContaining({
        GOOGLE_OAUTH_CLIENT_SECRET: null,
      }));
    });
  });

  it('sends null for unmodified secrets on Microsoft save', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockResolvedValue(CONFIGURED_MICROSOFT);

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[1]);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('microsoft', expect.objectContaining({
        AZURE_APP_SECRET: null,
      }));
    });
  });

  it('shows error toast when Google save fails', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockRejectedValue(new Error('Network error'));

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('socialLogin.google.saveError', {
        description: 'Test error',
      });
    });
  });

  it('shows error toast when Microsoft save fails', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockRejectedValue(new Error('Network error'));

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[1]);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('socialLogin.microsoft.saveError', {
        description: 'Test error',
      });
    });
  });

  it('shows validation error when Google Client ID is empty', async () => {
    await renderAndWait();

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('socialLogin.validation.clientIdRequired')).toBeInTheDocument();
    });
  });

  it('shows validation error when Azure App ID is empty', async () => {
    await renderAndWait();

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[1]);
    });

    await waitFor(() => {
      expect(screen.getByText('socialLogin.validation.appIdRequired')).toBeInTheDocument();
    });
  });

  it('clear secret button marks secret as modified', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);

    const clearButtons = screen.getAllByTitle('socialLogin.google.clearSecret');
    expect(clearButtons).toHaveLength(1);

    await act(async () => {
      fireEvent.click(clearButtons[0]);
    });

    expect(screen.queryByText('socialLogin.google.secretConfigured')).not.toBeInTheDocument();
  });

  it('sends modified secret value on save after typing', async () => {
    await renderAndWait(CONFIGURED_GOOGLE, CONFIGURED_MICROSOFT);
    mockSaveConfig.mockResolvedValue(CONFIGURED_GOOGLE);

    const secretInput = screen.getByLabelText('socialLogin.google.fields.clientSecret');

    await act(async () => {
      fireEvent.change(secretInput, { target: { value: 'new-secret-value' } });
    });

    const saveButtons = screen.getAllByText('socialLogin.save');

    await act(async () => {
      fireEvent.click(saveButtons[0]);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('google_oauth', expect.objectContaining({
        GOOGLE_OAUTH_CLIENT_SECRET: 'new-secret-value',
      }));
    });
  });
});
