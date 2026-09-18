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
      expect(fetchInboxesMock).toHaveBeenCalled();
    });
  });
});
