import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChannelSettings from './ChannelSettings';

// Router: provide the inbox id and a no-op navigate.
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'inbox-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

// A stable `t` reference: the real hook memoizes it, and ChannelSettings keys
// loadChannelData's useCallback on `t`, so a fresh `t` per render would loop.
const { t } = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t, currentLanguage: 'en' }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const inbox = {
  id: 'inbox-1',
  name: 'Support',
  display_name: 'Support',
  channel_type: 'Channel::Api',
  provider: '',
  medium: '',
};

const getById = vi.fn().mockResolvedValue({ data: inbox });
const update = vi.fn().mockResolvedValue({});
const updateWithAvatar = vi.fn().mockResolvedValue({});

vi.mock('@/services/channels/inboxesService', () => ({
  default: {
    getById: (...args: unknown[]) => getById(...args),
    update: (...args: unknown[]) => update(...args),
    updateWithAvatar: (...args: unknown[]) => updateWithAvatar(...args),
  },
}));

// Stub the channel component barrel so the page renders without pulling every
// heavy settings form into the test.
vi.mock('@/components/channels', () => {
  const stub = (name: string) => () => <div data-testid={name} />;
  return {
    BasicSettingsForm: stub('BasicSettingsForm'),
    GreetingSettingsForm: stub('GreetingSettingsForm'),
    WebWidgetAdvancedForm: stub('WebWidgetAdvancedForm'),
    SenderSettingsForm: stub('SenderSettingsForm'),
    AuthorizationBanners: () => null,
    LockToSingleConversationForm: stub('LockToSingleConversationForm'),
    DefaultConversationStatusForm: stub('DefaultConversationStatusForm'),
    CollaboratorsForm: stub('CollaboratorsForm'),
    BusinessHoursForm: stub('BusinessHoursForm'),
    CSATForm: stub('CSATForm'),
    PreChatForm: stub('PreChatForm'),
    WidgetBuilderForm: stub('WidgetBuilderForm'),
    AgentBotConfigurationForm: stub('AgentBotConfigurationForm'),
    ConfigurationForm: stub('ConfigurationForm'),
    ModerationDashboard: stub('ModerationDashboard'),
  };
});

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
});

const renderPage = async () => {
  const utils = render(<ChannelSettings />);
  // Wait for the async inbox load to settle (BasicSettingsForm is inbox_settings).
  await screen.findByTestId('BasicSettingsForm');
  return utils;
};

describe('ChannelSettings redesign', () => {
  it('renders a full-width container without the centered max-w-6xl gutter', async () => {
    const { container } = await renderPage();
    expect(container.querySelector('.max-w-6xl')).toBeNull();
  });

  it('renders the tab strip as a single scrollable row (no wrapping)', async () => {
    await renderPage();
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('overflow-x-auto');
    expect(tablist.className).not.toContain('flex-wrap');
  });

  it('marks the active tab with the primary token pill styling', async () => {
    await renderPage();
    const activeTab = screen.getByRole('tab', { name: /settings\.tabs\.inbox_settings/i });
    expect(activeTab.className).toContain('data-[state=active]:bg-primary/10');
    expect(activeTab.className).toContain('data-[state=active]:text-primary');
  });

  it('saves the active snapshot tab from the sticky footer', async () => {
    await renderPage();
    const saveButton = screen.getByRole('button', { name: /settings\.updateConfig/i });
    expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    await waitFor(() => expect(update).toHaveBeenCalled());
  });

  it('disables the footer with a hint on imperative tabs', async () => {
    await renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /settings\.tabs\.configuration/i }));

    await screen.findByTestId('ConfigurationForm');
    const saveButton = screen.getByRole('button', { name: /settings\.updateConfig/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('settings.info.tabSpecificSave')).toBeInTheDocument();
  });
});
