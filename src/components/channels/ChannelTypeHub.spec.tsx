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

  it('switches a configured type to the manage action and flags attention', () => {
    render(
      <ChannelTypeHub
        inboxes={[inbox({ channel_type: 'Channel::Whatsapp', reauthorization_required: true })]}
        isLoading={false}
        onAdd={noop}
        onManage={noop}
      />,
    );
    expect(screen.getAllByText('overview.actions.add')).toHaveLength(7);
    expect(screen.getAllByText('overview.actions.manage')).toHaveLength(1);
    expect(screen.getByText('overview.summary.attention')).toBeInTheDocument();
  });
});
