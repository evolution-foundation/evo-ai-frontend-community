import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Inbox } from '@/types/channels/inbox';
import Channels from './Channels';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/tours', () => ({ ChannelsTour: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/channels/useReactivateInbox', () => ({
  useReactivateInbox: () => ({ reactivateInbox: vi.fn() }),
}));

const { fetchInboxesMock } = vi.hoisted(() => ({ fetchInboxesMock: vi.fn().mockResolvedValue(undefined) }));
let mockInboxes: Inbox[] = [];
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({
    inboxes: mockInboxes,
    isLoadingInboxes: false,
    fetchInboxes: fetchInboxesMock,
  }),
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: { remove: vi.fn() },
}));

let capturedOnDelete: ((inbox: Inbox) => void) | null = null;
vi.mock('@/components/channels', () => ({
  ChannelsHeader: () => null,
  ChannelTypeHub: ({ onDelete }: { onDelete: (inbox: Inbox) => void }) => {
    capturedOnDelete = onDelete;
    return null;
  },
}));

import InboxesService from '@/services/channels/inboxesService';

const targetInbox = { id: 'inbox-1', name: 'WhatsApp Old' } as Inbox;

describe('Channels delete flow (archive, not remove)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInboxes = [targetInbox];
    capturedOnDelete = null;
  });

  it('refetches the inbox list after archiving instead of dropping it from local state', async () => {
    vi.mocked(InboxesService.remove).mockResolvedValue(undefined as never);
    const user = userEvent.setup();

    render(<Channels />);
    act(() => capturedOnDelete!(targetInbox));

    const confirmInput = await screen.findByPlaceholderText('WhatsApp Old');
    await user.type(confirmInput, 'WhatsApp Old');
    await user.click(screen.getByText('deleteDialog.confirm'));

    await vi.waitFor(() => {
      expect(InboxesService.remove).toHaveBeenCalledWith('inbox-1');
    });
    // Regression: a plain fetchInboxes() is a no-op inside the store's
    // 15-minute cache window (almost always true right after the page's own
    // mount fetch, asserted separately below), so other pages reading the
    // same store — a chat conversation's inbox lookup, for one — kept
    // showing the pre-archive state until the cache happened to expire on
    // its own. Check the LAST call specifically: the mount effect below also
    // calls fetchInboxes(true), which would otherwise mask an unforced call
    // made afterward by the delete handler.
    expect(fetchInboxesMock).toHaveBeenLastCalledWith(true);
  });

  it('force-refreshes the inbox list on mount too', () => {
    render(<Channels />);
    expect(fetchInboxesMock).toHaveBeenCalledWith(true);
  });
});
