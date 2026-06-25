import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { toast } from 'sonner';
import IntegrationsConfig from './IntegrationsConfig';
import { INTEGRATIONS } from './integrationsCatalog';

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

// The non-OAuth front-end services section self-loads its own config; stub it out
// so these tests cover only the OAuth catalog (its own behavior is covered in
// FrontendServicesSection.spec.tsx).
vi.mock('./FrontendServicesSection', () => ({
  default: () => null,
}));

// Build fixtures from the catalog so the suite scales with INTEGRATIONS instead
// of hard-coding the original 4. Keyed by configType (what getConfig receives).
const EMPTY_DATA: Record<string, Record<string, unknown>> = Object.fromEntries(
  INTEGRATIONS.map((def) => [
    def.configType,
    { [def.clientIdKey]: '', [def.clientSecretKey]: null },
  ]),
);

const CONFIGURED_DATA: Record<string, Record<string, unknown>> = Object.fromEntries(
  INTEGRATIONS.map((def) => [
    def.configType,
    { [def.clientIdKey]: `${def.key}-id`, [def.clientSecretKey]: '••••masked' },
  ]),
);

const TOTAL = INTEGRATIONS.length;
const hubspotDef = INTEGRATIONS.find((d) => d.key === 'hubspot')!;

async function renderAndWait(data: Record<string, Record<string, unknown>> = EMPTY_DATA) {
  mockGetConfig.mockImplementation((type: string) => {
    return Promise.resolve(data[type] ?? {});
  });
  await act(async () => {
    render(<IntegrationsConfig />);
  });
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

  it('renders all 4 section card titles', async () => {
    await renderAndWait();

    expect(screen.getByText('integrations.linear.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('integrations.hubspot.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('integrations.shopify.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('integrations.slack.cardTitle')).toBeInTheDocument();
  });

  it('renders 8 form fields (2 per integration x 4)', async () => {
    await renderAndWait();

    expect(screen.getByLabelText('integrations.linear.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.linear.fields.clientSecret')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.hubspot.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.hubspot.fields.clientSecret')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.shopify.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.shopify.fields.clientSecret')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.slack.fields.clientId')).toBeInTheDocument();
    expect(screen.getByLabelText('integrations.slack.fields.clientSecret')).toBeInTheDocument();
  });

  it('shows secret configured status for masked secrets', async () => {
    await renderAndWait(CONFIGURED_DATA);

    const configured = screen.getAllByText('integrations.secretConfigured');
    expect(configured).toHaveLength(TOTAL);
  });

  it('shows secret not configured when secrets are empty', async () => {
    await renderAndWait(EMPTY_DATA);

    const notConfigured = screen.getAllByText('integrations.secretNotConfigured');
    expect(notConfigured).toHaveLength(TOTAL);
  });

  it('renders one independent save button per integration', async () => {
    await renderAndWait();

    const saveButtons = screen.getAllByText('integrations.save');
    expect(saveButtons).toHaveLength(TOTAL);
  });

  it('saves Linear section independently', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    const linearForm = screen.getByTestId('linear-form');
    const saveBtn = within(linearForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_ID: 'linear-id',
      }));
    });
  });

  it('saves HubSpot section independently', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.hubspot);

    const hubspotForm = screen.getByTestId('hubspot-form');
    const saveBtn = within(hubspotForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('hubspot', expect.objectContaining({
        [hubspotDef.clientIdKey]: 'hubspot-id',
      }));
    });
  });

  it('saves Shopify section independently', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.shopify);

    const shopifyForm = screen.getByTestId('shopify-form');
    const saveBtn = within(shopifyForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('shopify', expect.objectContaining({
        SHOPIFY_CLIENT_ID: 'shopify-id',
      }));
    });
  });

  it('saves Slack section independently', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.slack);

    const slackForm = screen.getByTestId('slack-form');
    const saveBtn = within(slackForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('slack', expect.objectContaining({
        SLACK_CLIENT_ID: 'slack-id',
      }));
    });
  });

  it('sends null for unmodified secrets on save', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    const linearForm = screen.getByTestId('linear-form');
    const saveBtn = within(linearForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_SECRET: null,
      }));
    });
  });

  it('shows error toast when save fails', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockRejectedValue(new Error('Network error'));

    const linearForm = screen.getByTestId('linear-form');
    const saveBtn = within(linearForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
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

  it('sends modified secret value on save after typing', async () => {
    await renderAndWait(CONFIGURED_DATA);
    mockSaveConfig.mockResolvedValue(CONFIGURED_DATA.linear);

    const secretInput = screen.getByLabelText('integrations.linear.fields.clientSecret');

    await act(async () => {
      fireEvent.change(secretInput, { target: { value: 'new-secret' } });
    });

    const linearForm = screen.getByTestId('linear-form');
    const saveBtn = within(linearForm).getByText('integrations.save');

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith('linear', expect.objectContaining({
        LINEAR_CLIENT_SECRET: 'new-secret',
      }));
    });
  });

  it('clear secret button marks secret as modified', async () => {
    await renderAndWait(CONFIGURED_DATA);

    const clearButtons = screen.getAllByTitle('integrations.clearSecret');
    expect(clearButtons).toHaveLength(TOTAL);

    await act(async () => {
      fireEvent.click(clearButtons[0]);
    });

    const configured = screen.getAllByText('integrations.secretConfigured');
    expect(configured).toHaveLength(TOTAL - 1);
  });
});
