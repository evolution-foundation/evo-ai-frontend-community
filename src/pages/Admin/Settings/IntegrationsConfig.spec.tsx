import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { toast } from 'sonner';
import IntegrationsConfig from './IntegrationsConfig';
import { INTEGRATIONS } from './integrationsCatalog';

const stableT = (key: string) => key;

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: stableT }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();
const mockClearConfig = vi.fn();

vi.mock('@/services/admin/adminConfigService', () => ({
  adminConfigService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
    clearConfig: (...args: unknown[]) => mockClearConfig(...args),
  },
}));

vi.mock('@/utils/apiHelpers', () => ({
  extractError: () => ({ message: 'Test error' }),
}));

// The non-OAuth front-end services section self-loads its own config; stub it out
// so these tests cover only the OAuth catalog (covered in FrontendServicesSection.spec.tsx).
vi.mock('./FrontendServicesSection', () => ({ default: () => null }));

// Fixtures built from the catalog so the suite scales with INTEGRATIONS. Keyed by
// configType (what getConfig receives).
const EMPTY_DATA: Record<string, Record<string, unknown>> = Object.fromEntries(
  INTEGRATIONS.map((def) => [def.configType, { [def.clientIdKey]: '', [def.clientSecretKey]: null }]),
);

const CONFIGURED_DATA: Record<string, Record<string, unknown>> = Object.fromEntries(
  INTEGRATIONS.map((def) => [
    def.configType,
    { [def.clientIdKey]: `${def.key}-id`, [def.clientSecretKey]: '••••masked' },
  ]),
);

const TOTAL = INTEGRATIONS.length;

async function renderAndWait(data: Record<string, Record<string, unknown>> = EMPTY_DATA) {
  mockGetConfig.mockImplementation((type: string) => Promise.resolve(data[type] ?? {}));
  await act(async () => {
    render(<IntegrationsConfig />);
  });
}

// Open the configure dialog for an integration key and return its form element.
async function openDialog(key: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`${key}-card`));
  });
  return screen.getByTestId(`${key}-form`);
}

describe('IntegrationsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner before data loads', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    const { container } = render(<IntegrationsConfig />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads config from every catalog integration endpoint', async () => {
    await renderAndWait();
    INTEGRATIONS.forEach((def) => {
      expect(mockGetConfig).toHaveBeenCalledWith(def.configType);
    });
    expect(mockGetConfig).toHaveBeenCalledTimes(TOTAL);
  });

  it('renders title and description', async () => {
    await renderAndWait();
    expect(screen.getByText('integrations.title')).toBeInTheDocument();
    expect(screen.getByText('integrations.description')).toBeInTheDocument();
  });

  it('renders one card per catalog integration', async () => {
    const { container } = await act(async () => {
      mockGetConfig.mockImplementation((type: string) => Promise.resolve(EMPTY_DATA[type] ?? {}));
      return render(<IntegrationsConfig />);
    });
    expect(container.querySelectorAll('[data-testid$="-card"]')).toHaveLength(TOTAL);
    expect(screen.getByText('integrations.linear.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('integrations.github.cardTitle')).toBeInTheDocument();
  });

  it('shows configured status on every card when secrets are masked', async () => {
    await renderAndWait(CONFIGURED_DATA);
    expect(screen.getAllByText('integrations.statusConfigured')).toHaveLength(TOTAL);
  });

  it('shows not-configured status on every card when empty', async () => {
    await renderAndWait(EMPTY_DATA);
    expect(screen.getAllByText('integrations.statusNotConfigured')).toHaveLength(TOTAL);
  });

  it('does not render any form until a card is clicked', async () => {
    await renderAndWait();
    expect(screen.queryByTestId('linear-form')).not.toBeInTheDocument();
  });

  it('opens a focused dialog with both fields when a card is clicked', async () => {
    await renderAndWait();
    await openDialog('linear');
    expect(screen.getByLabelText('integrations.linear.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.linear.fields.clientSecret')).toBeInTheDocument();
  });

  it('saves the open integration with its client id', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    const form = await openDialog('linear');
    await act(async () => {
      fireEvent.click(within(form).getByText('integrations.save'));
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_ID: 'linear-id',
      }));
    });
  });

  it('sends null for an unmodified secret on save', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    const form = await openDialog('linear');
    await act(async () => {
      fireEvent.click(within(form).getByText('integrations.save'));
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_SECRET: null,
      }));
    });
  });

  it('sends the modified secret value on save after typing', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    await openDialog('linear');
    const secretInput = screen.getByLabelText('integrations.linear.fields.clientSecret');
    await act(async () => {
      fireEvent.change(secretInput, { target: { value: 'new-secret' } });
    });
    const form = screen.getByTestId('linear-form');
    await act(async () => {
      fireEvent.click(within(form).getByText('integrations.save'));
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_SECRET: 'new-secret',
      }));
    });
  });

  it('removes the configuration via clearConfig', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockClearConfig.mockResolvedValue(undefined);

    const form = await openDialog('linear');
    await act(async () => {
      fireEvent.click(within(form).getByText('integrations.remove'));
    });

    await waitFor(() => {
      expect(mockClearConfig).toHaveBeenCalledWith('linear');
    });
  });

  it('hides the remove action for unconfigured integrations', async () => {
    await renderAndWait(EMPTY_DATA);
    const form = await openDialog('linear');
    expect(within(form).queryByText('integrations.remove')).not.toBeInTheDocument();
  });

  it('shows error toast when save fails', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockRejectedValue(new Error('Network error'));

    const form = await openDialog('linear');
    await act(async () => {
      fireEvent.click(within(form).getByText('integrations.save'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('integrations.linear.saveError', {
        description: 'Test error',
      });
    });
  });

  it('shows error toast when config loading fails', async () => {
    mockGetConfig.mockRejectedValue(new Error('Network error'));
    await act(async () => {
      render(<IntegrationsConfig />);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('integrations.messages.loadError');
    });
  });
});
