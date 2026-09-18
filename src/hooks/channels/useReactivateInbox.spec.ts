import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useReactivateInbox } from './useReactivateInbox';
import InboxesService from '@/services/channels/inboxesService';

const { navigateMock, fetchInboxesMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  fetchInboxesMock: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}));
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({ fetchInboxes: fetchInboxesMock }),
}));
vi.mock('@/services/channels/inboxesService', () => ({
  default: { reactivate: vi.fn() },
}));

const reactivateMock = vi.mocked(InboxesService.reactivate);

describe('useReactivateInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reactivates the inbox, refreshes the list, and navigates to its settings so the user can re-scan the QR code', async () => {
    const { result } = renderHook(() => useReactivateInbox());

    await act(async () => {
      await result.current.reactivateInbox('inbox-1', 'evo');
    });

    expect(reactivateMock).toHaveBeenCalledWith('inbox-1');
    // Force the refresh — a plain fetchInboxes() is a no-op inside the
    // store's 15-minute cache window, leaving every other reader of the
    // shared store (a chat conversation's inbox lookup, for one) showing
    // the stale still-archived state.
    expect(fetchInboxesMock).toHaveBeenCalledWith(true);
    expect(toast.success).toHaveBeenCalledWith('overview.archived.reactivated:{"name":"evo"}');
    expect(navigateMock).toHaveBeenCalledWith('/channels/inbox-1/settings');
  });

  it('propagates the error and does not navigate when reactivation fails', async () => {
    reactivateMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useReactivateInbox());

    await expect(result.current.reactivateInbox('inbox-1', 'evo')).rejects.toThrow('boom');

    expect(navigateMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
