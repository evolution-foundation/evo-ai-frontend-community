import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChannelTypeHub from './ChannelTypeHub';
import ChannelTypeCard from './ChannelTypeCard';
import ChannelConnectionsDrawer from './ChannelConnectionsDrawer';
import { buildChannelTypeStatuses } from '@/utils/channelStatus';
import { getChannelTypes } from '@/constants/channelTypes';
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

// Pick a built type-status by its catalog type id (e.g. 'whatsapp').
const statusFor = (type: string, inboxes: Inbox[]) => {
  const found = buildChannelTypeStatuses(getChannelTypes(), inboxes).find(s => s.type.type === type);
  if (!found) throw new Error(`no status for ${type}`);
  return found;
};

describe('ChannelTypeHub', () => {
  it('renders skeletons while loading', () => {
    const { container } = render(
      <ChannelTypeHub inboxes={[]} isLoading onAdd={noop} onOpenInbox={noop} onDelete={noop} />,
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows every catalog type as connectable when there are no inboxes', () => {
    render(
      <ChannelTypeHub inboxes={[]} isLoading={false} onAdd={noop} onOpenInbox={noop} onDelete={noop} />,
    );
    // All 8 catalog types are unconfigured -> every card exposes the "Connect" action.
    expect(screen.getAllByText('overview.actions.connect')).toHaveLength(8);
    expect(screen.queryByText('overview.actions.addConnection')).toBeNull();
  });

  it('switches a configured type to the add-connection action and summarizes it', () => {
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
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    // 7 empty backed types keep "Connect"; the configured one offers "Add connection".
    expect(screen.getAllByText('overview.actions.connect')).toHaveLength(7);
    expect(screen.getAllByText('overview.actions.addConnection')).toHaveLength(1);
    // The card no longer lists connections inline — it shows a one-line summary instead.
    expect(screen.getByText('overview.summary.connected')).toBeInTheDocument();
  });

  it('summarizes a disconnected inbox as an error state', () => {
    render(
      <ChannelTypeHub
        inboxes={[inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'disconnected' })]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    // A disconnected inbox pushes the type-level summary into the error breakdown.
    expect(screen.getByText(/overview\.summary\.error/)).toBeInTheDocument();
  });

  it('opens the connections drawer with the row details when a card summary is clicked', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({
            channel_type: 'Channel::Api',
            name: 'My API',
            connection_state: 'unknown',
            health_source: 'none',
          }),
        ]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    // The configured api card exposes a single clickable manage summary; the drawer is closed.
    expect(screen.queryByText('My API')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'overview.actions.manage' }));
    // Clicking it opens the drawer, which lists the connection and its unmonitored state.
    expect(screen.getByText('My API')).toBeInTheDocument();
    expect(screen.getByText(/overview\.inboxState\.unmonitored/)).toBeInTheDocument();
  });
});

describe('ChannelTypeCard', () => {
  it('renders capability chips for the type per the capability matrix', () => {
    // WhatsApp = conversations + campaigns (never publishing).
    render(<ChannelTypeCard typeStatus={statusFor('whatsapp', [])} onAdd={noop} onManage={noop} />);
    expect(screen.getByText('overview.capabilities.conversations')).toBeInTheDocument();
    expect(screen.getByText('overview.capabilities.campaigns')).toBeInTheDocument();
    expect(screen.queryByText('overview.capabilities.publishing')).toBeNull();
  });

  it('calls onManage with the type when the summary line is clicked', () => {
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
    ]);
    const onManage = vi.fn();
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onManage={onManage} />);
    fireEvent.click(screen.getByRole('button', { name: 'overview.actions.manage' }));
    expect(onManage).toHaveBeenCalledWith(status);
  });

  it('calls onAdd when the primary action is clicked', () => {
    const status = statusFor('whatsapp', []);
    const onAdd = vi.fn();
    render(<ChannelTypeCard typeStatus={status} onAdd={onAdd} onManage={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'overview.actions.connect' }));
    expect(onAdd).toHaveBeenCalledWith(status);
  });
});

describe('ChannelConnectionsDrawer', () => {
  it('labels an inbox as live only when the probe confirmed it, stored otherwise', () => {
    const live = inbox({ id: 'w-live', name: 'Live WA', channel_type: 'whatsapp' });
    const { rerender } = render(
      <ChannelConnectionsDrawer
        typeStatus={statusFor('whatsapp', [live])}
        open
        onOpenChange={noop}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set(['w-live'])}
      />,
    );
    expect(screen.getByText('overview.statusMeta.live')).toBeInTheDocument();
    expect(screen.queryByText(/overview\.statusMeta\.stored/)).toBeNull();

    // Same inbox, but not live-verified -> stored marker (with explanatory tooltip trigger).
    rerender(
      <ChannelConnectionsDrawer
        typeStatus={statusFor('whatsapp', [live])}
        open
        onOpenChange={noop}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set()}
      />,
    );
    expect(screen.getByText(/overview\.statusMeta\.stored/)).toBeInTheDocument();
    expect(screen.queryByText('overview.statusMeta.live')).toBeNull();
  });

  it('calls onDelete when the per-row trash is clicked', () => {
    const target = inbox({ id: 'w-del', name: 'Del WA', channel_type: 'whatsapp' });
    const onDelete = vi.fn();
    render(
      <ChannelConnectionsDrawer
        typeStatus={statusFor('whatsapp', [target])}
        open
        onOpenChange={noop}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'overview.actions.deleteConnection' }));
    expect(onDelete).toHaveBeenCalledWith(target);
  });

  it('calls onOpenInbox when the connection row is clicked', () => {
    const target = inbox({ id: 'w-open', name: 'Open WA', channel_type: 'whatsapp' });
    const onOpenInbox = vi.fn();
    render(
      <ChannelConnectionsDrawer
        typeStatus={statusFor('whatsapp', [target])}
        open
        onOpenChange={noop}
        onAdd={noop}
        onOpenInbox={onOpenInbox}
        onDelete={noop}
      />,
    );
    const row = screen.getByText('Open WA').closest('li') as HTMLElement;
    fireEvent.click(within(row).getByText('Open WA'));
    expect(onOpenInbox).toHaveBeenCalledWith(target);
  });

  it('lists every connection without the in-card row cap', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      inbox({ id: `w-${i}`, name: `WA ${i}`, channel_type: 'whatsapp' }),
    );
    render(
      <ChannelConnectionsDrawer
        typeStatus={statusFor('whatsapp', many)}
        open
        onOpenChange={noop}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    many.forEach(m => expect(screen.getByText(m.name)).toBeInTheDocument());
  });
});
