import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
  }),
}));
vi.mock('./ChannelIcon', () => ({ default: () => null }));

const archivedInbox: Inbox = {
  id: 'i1',
  name: 'Archived Number',
  channel_id: 'c1',
  channel_type: 'whatsapp',
  archived_at: '2026-09-16T00:00:00Z',
} as Inbox;

describe('ChannelConnectionsPopover — archived inbox', () => {
  it('shows an archived badge and a reactivate button instead of delete', () => {
    const onReactivate = vi.fn();
    const typeStatus = buildChannelTypeStatuses(getChannelTypes(), [archivedInbox]).find(
      s => s.type.type === 'whatsapp',
    )!;

    render(
      <ChannelConnectionsPopover
        typeStatus={typeStatus}
        onAdd={() => {}}
        onOpenInbox={() => {}}
        onDelete={() => {}}
        onReactivate={onReactivate}
      >
        <button>trigger</button>
      </ChannelConnectionsPopover>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('overview.archived.badge')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('overview.actions.reactivate'));
    expect(onReactivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }));
    expect(screen.queryByLabelText('overview.actions.deleteConnection')).not.toBeInTheDocument();
  });
});
