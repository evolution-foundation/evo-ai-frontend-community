import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChannelTypeHub from './ChannelTypeHub';
import { Inbox } from '@/types/channels/inbox';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// Icon rendering depends on brand assets; not relevant to the hub logic under test.
vi.mock('./ChannelIcon', () => ({ default: () => null }));

// The live overlay has its own spec; the hub tests exercise the stored state.
const liveStatusMock = vi.fn(() => ({
  states: {},
  loadingIds: new Set<string>(),
  failedIds: new Set<string>(),
}));
vi.mock('@/hooks/channels/useLiveChannelStatus', () => ({
  default: (inboxes: Inbox[]) => liveStatusMock(inboxes),
}));

const inbox = (overrides: Partial<Inbox>): Inbox =>
  ({ id: 'i', name: 'n', channel_id: 'c', channel_type: 'whatsapp', ...overrides }) as Inbox;

const noop = () => {};

describe('ChannelTypeHub', () => {
  it('renders skeletons while loading', () => {
    const { container } = render(
      <ChannelTypeHub inboxes={[]} isLoading onAdd={noop} onManage={noop} />,
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows every catalog type as available when there are no inboxes', () => {
    render(<ChannelTypeHub inboxes={[]} isLoading={false} onAdd={noop} onManage={noop} />);
    // All 8 catalog types are unconfigured -> all expose the "Add" action.
    expect(screen.getAllByText('overview.actions.add')).toHaveLength(8);
    expect(screen.queryByText('overview.actions.manage')).toBeNull();
  });

  it('switches a configured type to the manage action and shows the real state', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({
            channel_type: 'Channel::Whatsapp',
            connection_state: 'connected',
            health_source: 'provider_event',
            name: 'Main WA',
          }),
        ]}
        isLoading={false}
        onAdd={noop}
        onManage={noop}
      />,
    );
    expect(screen.getAllByText('overview.actions.add')).toHaveLength(7);
    expect(screen.getAllByText('overview.actions.manage')).toHaveLength(1);
    expect(screen.getByText('overview.summary.active')).toBeInTheDocument();
    expect(screen.getByText('Main WA')).toBeInTheDocument();
    expect(screen.getByText(/overview\.inboxState\.connected/)).toBeInTheDocument();
  });

  it('flags a disconnected inbox as error', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'disconnected' }),
        ]}
        isLoading={false}
        onAdd={noop}
        onManage={noop}
      />,
    );
    expect(screen.getByText('overview.summary.error')).toBeInTheDocument();
  });

  it('shows the explicit unmonitored label for channels without health support', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({
            channel_type: 'Channel::Api',
            connection_state: 'unknown',
            health_source: 'none',
          }),
        ]}
        isLoading={false}
        onAdd={noop}
        onManage={noop}
      />,
    );
    expect(screen.getByText(/overview\.inboxState\.unmonitored/)).toBeInTheDocument();
  });
});
