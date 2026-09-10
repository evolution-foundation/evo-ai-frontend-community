import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChannelTypeHub from './ChannelTypeHub';
import ChannelTypeCard from './ChannelTypeCard';
import ChannelConnectionsPopover from './ChannelConnectionsPopover';
import { buildChannelTypeStatuses } from '@/utils/channelStatus';
import { getChannelTypes } from '@/constants/channelTypes';
import { Inbox } from '@/types/channels/inbox';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // Radix Popover relies on pointer-capture / scrollIntoView APIs jsdom lacks;
  // without these shims the trigger click never toggles the content open.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

// Keys pass through untranslated, but interpolation values are appended so a test
// can assert what a label actually carries (e.g. the status in an aria-label).
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${Object.values(vars).join(' ')}` : key,
    currentLanguage: 'en',
  }),
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

  it('switches a configured type to the add-connection action and shows its connection count', () => {
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
    // The card no longer lists connections inline — it surfaces the count inside the
    // manage button (the popover trigger) instead of a summary line.
    const manageButton = screen.getByRole('button', { name: /overview\.actions\.manageAria/ });
    expect(within(manageButton).getByText('1')).toBeInTheDocument();
  });

  it('counts channels needing attention on the card face, not only inside the popover', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'connected', name: 'OK' }),
          inbox({ id: 'w2', channel_type: 'Channel::Whatsapp', connection_state: 'pending', name: 'Pendente' }),
        ]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );

    const manageButton = screen.getByRole('button', { name: /overview\.actions\.manageAria/ });
    expect(within(manageButton).getByText('2')).toBeInTheDocument();
    expect(within(manageButton).getByTestId('needs-attention-count')).toHaveTextContent('1');
  });

  it('announces the attention count, which the chip alone never reaches AT with', () => {
    render(
      <ChannelTypeHub
        inboxes={[
          inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'connected', name: 'OK' }),
          inbox({ id: 'w2', channel_type: 'Channel::Whatsapp', connection_state: 'pending', name: 'Pendente' }),
        ]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    // The button's aria-label replaces its contents, so a chip carrying only a
    // `title` is announced by nothing — the count has to be in the name itself.
    expect(
      screen.getByRole('button', { name: /overview\.needsAttention/ }),
    ).toBeInTheDocument();
  });

  it('leaves the accessible name without an attention clause when nothing needs it', () => {
    render(
      <ChannelTypeHub
        inboxes={[inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'connected' })]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /overview\.needsAttention/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: /overview\.actions\.manageAria/ }),
    ).toBeInTheDocument();
  });

  it('does not show the attention count when every channel is healthy', () => {
    render(
      <ChannelTypeHub
        inboxes={[inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'connected' })]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );

    expect(screen.queryByTestId('needs-attention-count')).toBeNull();
  });

  it('marks a configured type with a disconnected inbox as an error state', () => {
    render(
      <ChannelTypeHub
        inboxes={[inbox({ channel_type: 'Channel::Whatsapp', connection_state: 'disconnected' })]}
        isLoading={false}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      />,
    );
    // A disconnected inbox pushes the type-level status to error, which the card
    // spells out instead of relying on a red dot.
    expect(screen.getByText('overview.statusLabel.error')).toBeInTheDocument();
  });

  it('opens the connections popover with the row details when the manage button is clicked', async () => {
    const user = userEvent.setup();
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
    // The popover is closed until the manage button (its trigger) is clicked.
    expect(screen.queryByText('My API')).toBeNull();
    await user.click(screen.getByRole('button', { name: /overview\.actions\.manageAria/ }));
    // Clicking it opens the popover, which lists the connection and its unmonitored state.
    expect(await screen.findByText('My API')).toBeInTheDocument();
    expect(screen.getByText(/overview\.inboxState\.unmonitored/)).toBeInTheDocument();
  });
});

describe('ChannelTypeCard', () => {
  it('renders capability chips for the type per the capability matrix', () => {
    // WhatsApp = conversations + campaigns (never publishing).
    render(
      <ChannelTypeCard typeStatus={statusFor('whatsapp', [])} onAdd={noop} onOpenInbox={noop} onDelete={noop} />,
    );
    expect(screen.getByText('overview.capabilities.conversations')).toBeInTheDocument();
    expect(screen.getByText('overview.capabilities.campaigns')).toBeInTheDocument();
    expect(screen.queryByText('overview.capabilities.publishing')).toBeNull();
  });

  it('shows the connection count inside the manage button for a configured type', () => {
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    const manageButton = screen.getByRole('button', { name: /overview\.actions\.manageAria/ });
    expect(within(manageButton).getByText('1')).toBeInTheDocument();
  });

  it('states the connection status in words, not only as a colour', () => {
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
      inbox({ id: 'w2', name: 'WA2', channel_type: 'whatsapp', connection_state: 'pending' }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(screen.getByText('overview.statusLabel.attention')).toBeInTheDocument();
  });

  it('reads a fully connected type as active, so a pending one is distinguishable', () => {
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(screen.getByText('overview.statusLabel.active')).toBeInTheDocument();
    expect(screen.queryByText('overview.statusLabel.attention')).toBeNull();
  });

  it('names the manage button with the status and the count, not just "manage"', () => {
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'pending' }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(
      screen.getByRole('button', { name: /overview\.statusLabel\.attention/ }),
    ).toBeInTheDocument();
  });

  it('labels a configured type and stays silent on one with no connections', () => {
    const { unmount } = render(
      <ChannelTypeCard typeStatus={statusFor('whatsapp', [])} onAdd={noop} onOpenInbox={noop} onDelete={noop} />,
    );
    expect(screen.queryByText(/overview\.statusLabel\./)).toBeNull();
    unmount();

    const configured = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
    ]);
    render(<ChannelTypeCard typeStatus={configured} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(screen.getByText('overview.statusLabel.active')).toBeInTheDocument();
  });

  it('never claims "active" for a type the backend has no health signal for', () => {
    // What ConnectionStateResolver's `else` branch serves for Telegram, SMS, API
    // and Web Widget: unknown state, no source. Reading that as "active" is the
    // false positive this card was opened for, only written out instead of a dot.
    const status = statusFor('api', [
      inbox({
        id: 'a1',
        name: 'My API',
        channel_type: 'Channel::Api',
        connection_state: 'unknown',
        health_source: 'none',
      }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(screen.getByText('overview.statusLabel.unmonitored')).toBeInTheDocument();
    expect(screen.queryByText('overview.statusLabel.active')).toBeNull();
    // The accessible name carries the same verdict as the badge.
    expect(
      screen.getByRole('button', { name: /overview\.statusLabel\.unmonitored/ }),
    ).toBeInTheDocument();
  });

  it('keeps a type active when only some of its connections lack a signal', () => {
    // One confirmed connection is enough to call the type active; the popover
    // still shows the per-inbox truth.
    const status = statusFor('whatsapp', [
      inbox({ id: 'w1', name: 'WA', channel_type: 'whatsapp', connection_state: 'connected' }),
      inbox({ id: 'w2', name: 'WA2', channel_type: 'whatsapp', health_source: 'none' }),
    ]);
    render(<ChannelTypeCard typeStatus={status} onAdd={noop} onOpenInbox={noop} onDelete={noop} />);
    expect(screen.getByText('overview.statusLabel.active')).toBeInTheDocument();
  });

  it('calls onAdd when the primary action is clicked', () => {
    const status = statusFor('whatsapp', []);
    const onAdd = vi.fn();
    render(<ChannelTypeCard typeStatus={status} onAdd={onAdd} onOpenInbox={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'overview.actions.connect' }));
    expect(onAdd).toHaveBeenCalledWith(status);
  });
});

describe('ChannelConnectionsPopover', () => {
  it('labels an inbox as live only when the probe confirmed it, stored otherwise', async () => {
    const user = userEvent.setup();
    const live = inbox({ id: 'w-live', name: 'Live WA', channel_type: 'whatsapp' });
    const { rerender } = render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [live])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set(['w-live'])}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText('overview.statusMeta.live')).toBeInTheDocument();
    expect(screen.queryByText(/overview\.statusMeta\.stored/)).toBeNull();

    // Same inbox, but not live-verified -> stored marker (with explanatory tooltip trigger).
    // The popover is internally controlled, so it stays open across the rerender.
    rerender(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [live])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set()}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    expect(await screen.findByText(/overview\.statusMeta\.stored/)).toBeInTheDocument();
    expect(screen.queryByText('overview.statusMeta.live')).toBeNull();
  });

  it('keeps the state label when the probe confirms the inbox, so live never stands alone', async () => {
    const user = userEvent.setup();
    const pending = inbox({
      id: 'w-pending',
      name: 'Pending WA',
      channel_type: 'whatsapp',
      connection_state: 'pending',
    });
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [pending])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set(['w-pending'])}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText(/overview\.inboxState\.pending/)).toBeInTheDocument();
    expect(screen.getByText('overview.statusMeta.live')).toBeInTheDocument();
  });

  it('gives the QR session establishing its own label and dot color, not the shared pending one (CRM-490)', async () => {
    const user = userEvent.setup();
    const connecting = inbox({
      id: 'w-connecting',
      name: 'Connecting WA',
      channel_type: 'whatsapp',
      connection_state: 'connecting',
    });
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [connecting])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText(/overview\.inboxState\.connecting/)).toBeInTheDocument();
    expect(screen.queryByText(/overview\.inboxState\.pending/)).toBeNull();
    // The popover content portals to document.body, outside the render root — query it directly.
    const dot = document.body.querySelector('.rounded-full[aria-hidden="true"]');
    expect(dot).toHaveClass('bg-blue-500');
    expect(dot).not.toHaveClass('bg-amber-500');
  });

  it('drops the unmonitored label once the probe confirms the inbox', async () => {
    const user = userEvent.setup();
    const target = inbox({
      id: 'w-live',
      name: 'Live WA',
      channel_type: 'whatsapp',
      connection_state: 'connected',
      health_source: 'none',
    });
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [target])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
        liveVerifiedIds={new Set(['w-live'])}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    // "Not monitored · Live" contradicts itself: the probe just monitored it.
    expect(await screen.findByText(/overview\.inboxState\.connected/)).toBeInTheDocument();
    expect(screen.queryByText(/overview\.inboxState\.unmonitored/)).toBeNull();
    expect(screen.getByText('overview.statusMeta.live')).toBeInTheDocument();
  });

  it('calls onDelete when the per-row trash is clicked', async () => {
    const user = userEvent.setup();
    const target = inbox({ id: 'w-del', name: 'Del WA', channel_type: 'whatsapp' });
    const onDelete = vi.fn();
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [target])}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={onDelete}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(await screen.findByRole('button', { name: 'overview.actions.deleteConnection' }));
    expect(onDelete).toHaveBeenCalledWith(target);
  });

  it('calls onOpenInbox when the connection row is clicked', async () => {
    const user = userEvent.setup();
    const target = inbox({ id: 'w-open', name: 'Open WA', channel_type: 'whatsapp' });
    const onOpenInbox = vi.fn();
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', [target])}
        onAdd={noop}
        onOpenInbox={onOpenInbox}
        onDelete={noop}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(await screen.findByText('Open WA'));
    expect(onOpenInbox).toHaveBeenCalledWith(target);
  });

  it('lists every connection without the in-card row cap', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 5 }, (_, i) =>
      inbox({ id: `w-${i}`, name: `WA ${i}`, channel_type: 'whatsapp' }),
    );
    render(
      <ChannelConnectionsPopover
        typeStatus={statusFor('whatsapp', many)}
        onAdd={noop}
        onOpenInbox={noop}
        onDelete={noop}
      >
        <button>open</button>
      </ChannelConnectionsPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    await screen.findByText('WA 0');
    many.forEach(m => expect(screen.getByText(m.name)).toBeInTheDocument());
  });
});

// The useLanguage mock above never renders a real i18next template, so a typo in a
// locale placeholder (`{{qtde}}`) would pass every other test in this file. Assert
// the contract directly against the shipped JSON.
describe('channels locale contract', () => {
  const locales = import.meta.glob<Record<string, unknown>>('../../i18n/locales/*/channels.json', {
    eager: true,
    import: 'default',
  });

  it.each(Object.keys(locales))('%s interpolates manageAria with count and status', path => {
    const overview = (locales[path] as { overview: { actions: Record<string, string> } }).overview;
    const template = overview.actions.manageAria;
    expect(typeof template).toBe('string');
    const placeholders = [...template.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]).sort();
    expect(placeholders).toEqual(['count', 'status']);
  });
});
