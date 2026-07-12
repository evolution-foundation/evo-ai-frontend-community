import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import NewChannel from './index';

// NewChannel is a heavy orchestrator (channel form hook, submission hook, tours,
// per-provider forms). We mock those seams and drive the hook state directly so
// the test exercises NewChannel's own logic added in EVO-2093: initialChannelId
// pre-select, Twilio "coming soon" gating, embedded onExit vs navigate, and the
// single footer band (generic submit path vs owned redirect flows).

const { h, cap } = vi.hoisted(() => {
  const fns = {
    updateForm: vi.fn(),
    handleChannelSelect: vi.fn(),
    handleProviderSelect: vi.fn(),
    setSelectedChannel: vi.fn(),
    setSelectedProvider: vi.fn(),
    goBack: vi.fn(() => false),
    testConnection: vi.fn(),
    submitCreate: vi.fn(),
  };
  const state: Record<string, unknown> = {
    selectedChannel: null,
    selectedProvider: null,
    form: {},
    hasEvolutionConfig: false,
    hasEvolutionGoConfig: false,
    canFB: true,
    canWpCloud: true,
    canIG: true,
    canEmailGoogle: true,
    canEmailMicrosoft: true,
    config: { evolutionHubEnabled: false },
    ...fns,
  };
  const cap: { ps: any; breadcrumbOnBack: (() => void) | null } = {
    ps: null,
    breadcrumbOnBack: null,
  };
  return { h: { state, fns }, cap };
});

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/hooks/channels', () => ({
  useChannelForm: () => h.state,
  useChannelSubmission: () => ({
    isSubmitting: false,
    isTesting: false,
    testConnection: h.fns.testConnection,
    submitCreate: h.fns.submitCreate,
    healthCheckPassed: null,
  }),
}));

vi.mock('@/constants/channelTypes', () => ({
  getChannelTypes: () => [
    {
      id: 'whatsapp',
      type: 'whatsapp',
      name: 'WhatsApp',
      providers: [
        { id: 'twilio', name: 'Twilio' },
        { id: 'whatsapp_cloud', name: 'Cloud' },
        { id: 'evolution', name: 'Evolution' },
      ],
    },
    {
      id: 'sms',
      type: 'sms',
      name: 'SMS',
      providers: [
        { id: 'twilio', name: 'Twilio' },
        { id: 'bandwidth', name: 'Bandwidth' },
      ],
    },
    { id: 'facebook', type: 'facebook', name: 'Facebook' },
  ],
}));

// Child components reduced to markers / prop captures.
vi.mock('@/components/channels', () => ({
  WebWidgetForm: () => null,
  FacebookChannelForm: () => null,
  InstagramForm: () => null,
  EmailForm: () => null,
}));
vi.mock('@/components/channels/ProviderSelection', () => ({
  default: (props: any) => {
    cap.ps = props;
    return <div data-testid="provider-selection" />;
  },
}));
vi.mock('@/components/channels/ChannelBreadcrumb', () => ({
  default: ({ onBack }: { onBack: () => void }) => {
    cap.breadcrumbOnBack = onBack;
    return <div data-testid="breadcrumb" />;
  },
}));
vi.mock('@/components/channels/channel-grid', () => ({
  ChannelGrid: () => <div data-testid="channel-grid" />,
}));
vi.mock('@/components/channels/layout/FormContainer', () => ({
  FormContainer: ({ children, footer }: { children: any; footer?: any }) => (
    <div data-testid="form-container">
      {footer}
      {children}
    </div>
  ),
}));
vi.mock('@/components/channels/shared/FormFooter', () => ({
  FormFooter: () => <div data-testid="form-footer" />,
}));
vi.mock('@/components/channels/forms/whatsapp', () => ({ WhatsappForms: () => null }));
vi.mock('@/components/channels/forms/SmsForm', () => ({ SmsForm: () => null }));
vi.mock('@/components/channels/forms/TelegramForm', () => ({ TelegramForm: () => null }));
vi.mock('@/components/channels/forms/ApiForm', () => ({ ApiForm: () => null }));

// Tours are no-ops in tests.
vi.mock('@/tours/NewChannelTour', () => ({ NewChannelTour: () => null }));
vi.mock('@/tours/ProviderSelectionTour', () => ({ ProviderSelectionTour: () => null }));
vi.mock('@/tours/WhatsappProviderTour', () => ({ WhatsappProviderTour: () => null }));
vi.mock('@/tours/TelegramChannelTour', () => ({ TelegramChannelTour: () => null }));
vi.mock('@/tours/ApiChannelTour', () => ({ ApiChannelTour: () => null }));
vi.mock('@/tours/WebWidgetChannelTour', () => ({ WebWidgetChannelTour: () => null }));
vi.mock('@/tours/WhatsappCloudChannelTour', () => ({ WhatsappCloudChannelTour: () => null }));
vi.mock('@/tours/SmsChannelTour', () => ({ SmsChannelTour: () => null }));
vi.mock('@/tours/InstagramChannelTour', () => ({ InstagramChannelTour: () => null }));
vi.mock('@/tours/FacebookChannelTour', () => ({ FacebookChannelTour: () => null }));
vi.mock('@/tours/EmailChannelTour', () => ({ EmailChannelTour: () => null }));

const resetState = () => {
  Object.assign(h.state, {
    selectedChannel: null,
    selectedProvider: null,
    form: {},
    canWpCloud: true,
    canEmailGoogle: true,
    canEmailMicrosoft: true,
    config: { evolutionHubEnabled: false },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.fns.goBack.mockReturnValue(false);
  cap.ps = null;
  cap.breadcrumbOnBack = null;
  resetState();
});

describe('NewChannel (EVO-2093)', () => {
  it('pre-selects the channel from initialChannelId (skips the channel grid)', () => {
    render(<NewChannel initialChannelId="whatsapp" />);
    // The pre-select effect fires handleChannelSelect with the matched channel.
    expect(h.fns.handleChannelSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'whatsapp' }),
    );
  });

  it('shows the provider grid (not the channel grid) once a channel is selected', () => {
    h.state.selectedChannel = { id: 'whatsapp', type: 'whatsapp', name: 'WhatsApp', providers: [] };
    render(<NewChannel initialChannelId="whatsapp" />);
    expect(screen.queryByTestId('channel-grid')).toBeNull();
    expect(screen.getByTestId('provider-selection')).toBeInTheDocument();
    // Effect must NOT re-select when a channel is already set.
    expect(h.fns.handleChannelSelect).not.toHaveBeenCalled();
  });

  it('marks Twilio disabled with a "coming soon" tooltip and ignores its selection', () => {
    h.state.selectedChannel = {
      id: 'whatsapp',
      type: 'whatsapp',
      name: 'WhatsApp',
      providers: [{ id: 'twilio' }, { id: 'evolution' }],
    };
    render(<NewChannel />);

    expect(cap.ps.isDisabled('twilio')).toBe(true);
    expect(cap.ps.isDisabled('evolution')).toBe(false);
    expect(cap.ps.disabledTooltip('twilio')).toBe('newChannel.providers.twilio.comingSoon');

    act(() => cap.ps.onProviderSelect({ id: 'twilio' }));
    expect(h.fns.handleProviderSelect).not.toHaveBeenCalled();

    act(() => cap.ps.onProviderSelect({ id: 'evolution' }));
    expect(h.fns.handleProviderSelect).toHaveBeenCalledWith({ id: 'evolution' });
  });

  it('closes via onExit instead of navigating when embedded', () => {
    render(<NewChannel onExit={vi.fn()} initialChannelId="whatsapp" />);
    // Nowhere left to go back to (goBack -> false) leaves the flow.
    act(() => cap.breadcrumbOnBack?.());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('navigates to /channels when not embedded', () => {
    render(<NewChannel />);
    act(() => cap.breadcrumbOnBack?.());
    expect(navigateMock).toHaveBeenCalledWith('/channels');
  });

  it('renders the generic footer band for a standard submit provider', () => {
    h.state.selectedChannel = { id: 'whatsapp', type: 'whatsapp', name: 'WhatsApp', providers: [{ id: 'evolution' }] };
    h.state.selectedProvider = { id: 'evolution', name: 'Evolution' };
    render(<NewChannel />);
    expect(screen.getByTestId('form-footer')).toBeInTheDocument();
  });

  it('omits the generic footer for owned redirect flows (Facebook renders its own action)', () => {
    h.state.selectedChannel = { id: 'facebook', type: 'facebook', name: 'Facebook' };
    h.state.selectedProvider = { id: 'facebook', name: 'Facebook' };
    render(<NewChannel />);
    expect(screen.queryByTestId('form-footer')).toBeNull();
  });
});
