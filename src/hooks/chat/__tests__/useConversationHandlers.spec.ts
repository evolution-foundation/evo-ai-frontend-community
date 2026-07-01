/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConversationHandlers } from '../useConversationHandlers';

const mockConversations = vi.hoisted(() => ({
  updateConversationStatus: vi.fn(),
  updateConversationPriority: vi.fn(),
  markAsRead: vi.fn(),
  markAsUnread: vi.fn(),
  pinConversation: vi.fn(),
  unpinConversation: vi.fn(),
  archiveConversation: vi.fn(),
  unarchiveConversation: vi.fn(),
  addHiddenConversation: vi.fn(),
  removeConversation: vi.fn(),
}));

const mockFilters = vi.hoisted(() => ({ state: { activeFilters: [] as any[] } }));
const mockAuth = vi.hoisted(() => ({ user: { id: 'me-1' } as any }));

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({ conversations: mockConversations, filters: mockFilters }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: vi.fn().mockReturnValue(true) }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const statusFilter = (value: string) => ({
  attribute_key: 'status',
  filter_operator: 'equal_to',
  values: [value],
  query_operator: 'and',
});

const baseConversation = { id: 'conv-1', uuid: 'uuid-conv-1', status: 'open' } as any;

describe('useConversationHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilters.state.activeFilters = [];
  });

  describe('handleMarkAsResolved', () => {
    it('calls updateConversationStatus with resolved status and NO list-refetch callback', async () => {
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation);

      // Eixo A: the parasite onFilterReload arg is gone — only (id, status).
      expect(mockConversations.updateConversationStatus).toHaveBeenCalledWith('conv-1', 'resolved');
    });

    it('re-throws when updateConversationStatus fails', async () => {
      const error = new Error('API error');
      mockConversations.updateConversationStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useConversationHandlers());

      await expect(
        result.current.handleMarkAsResolved(baseConversation),
      ).rejects.toThrow('API error');
    });

    it('drops the conversation from the current view when it no longer matches the active filter (no list refetch)', async () => {
      // Viewing "Abertas" (status=open); resolving makes it stop matching.
      mockFilters.state.activeFilters = [statusFilter('open')];
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation);

      expect(mockConversations.removeConversation).toHaveBeenCalledWith('conv-1');
      expect(mockConversations.addHiddenConversation).toHaveBeenCalledTimes(1);
    });

    it('keeps the conversation when it still matches the active filter', async () => {
      // Viewing "Resolvidas" (status=resolved); resolving keeps it matching.
      mockFilters.state.activeFilters = [statusFilter('resolved')];
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation);

      expect(mockConversations.removeConversation).not.toHaveBeenCalled();
      expect(mockConversations.addHiddenConversation).not.toHaveBeenCalled();
    });

    it('does not drop the conversation when no filter is active (match-all view)', async () => {
      mockFilters.state.activeFilters = [];
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation);

      expect(mockConversations.removeConversation).not.toHaveBeenCalled();
    });
  });

  describe('handleMarkAsResolved — error propagation', () => {
    it('propagates error so Chat.tsx can skip URL navigation on failure', async () => {
      mockConversations.updateConversationStatus.mockRejectedValueOnce(new Error('backend fail'));

      const { result } = renderHook(() => useConversationHandlers());

      const navigateMock = vi.fn();

      let navigationCalled = false;
      try {
        await result.current.handleMarkAsResolved(baseConversation);
        navigateMock('/conversations');
        navigationCalled = true;
      } catch {
        // expected — navigation must NOT run
      }

      expect(navigateMock).not.toHaveBeenCalled();
      expect(navigationCalled).toBe(false);
    });
  });

  describe('status siblings + priority (Eixo A)', () => {
    it('handlePostpone: sets pending without refetch and drops it from an "open" view', async () => {
      mockFilters.state.activeFilters = [statusFilter('open')];
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handlePostpone(baseConversation);

      expect(mockConversations.updateConversationStatus).toHaveBeenCalledWith('conv-1', 'pending');
      expect(mockConversations.removeConversation).toHaveBeenCalledWith('conv-1');
    });

    it('handleMarkAsOpen: keeps it when viewing "open"', async () => {
      mockFilters.state.activeFilters = [statusFilter('open')];
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsOpen(baseConversation);

      expect(mockConversations.updateConversationStatus).toHaveBeenCalledWith('conv-1', 'open');
      expect(mockConversations.removeConversation).not.toHaveBeenCalled();
    });

    it('handleSetPriority: never drops from a status view (priority is not a view axis) and sends no refetch arg', async () => {
      mockFilters.state.activeFilters = [statusFilter('open')];
      mockConversations.updateConversationPriority.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleSetPriority(baseConversation, 'high');

      expect(mockConversations.updateConversationPriority).toHaveBeenCalledWith('conv-1', 'high');
      expect(mockConversations.removeConversation).not.toHaveBeenCalled();
    });
  });
});
