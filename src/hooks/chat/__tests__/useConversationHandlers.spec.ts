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
}));

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({ conversations: mockConversations }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: vi.fn().mockReturnValue(true) }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const baseConversation = { id: 'conv-1', uuid: 'uuid-conv-1', status: 'open' } as any;

describe('useConversationHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMarkAsResolved', () => {
    it('calls updateConversationStatus with resolved status', async () => {
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation);

      expect(mockConversations.updateConversationStatus).toHaveBeenCalledWith(
        'conv-1',
        'resolved',
        undefined,
      );
    });

    it('re-throws when updateConversationStatus fails', async () => {
      const error = new Error('API error');
      mockConversations.updateConversationStatus.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useConversationHandlers());

      await expect(
        result.current.handleMarkAsResolved(baseConversation),
      ).rejects.toThrow('API error');
    });

    it('passes onReload callback to updateConversationStatus', async () => {
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});
      const onReload = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversationHandlers());
      await result.current.handleMarkAsResolved(baseConversation, onReload);

      expect(mockConversations.updateConversationStatus).toHaveBeenCalledWith(
        'conv-1',
        'resolved',
        onReload,
      );
    });

    it('does not swallow error — caller can gate navigation on success', async () => {
      mockConversations.updateConversationStatus.mockRejectedValueOnce(new Error('fail'));

      const { result } = renderHook(() => useConversationHandlers());

      let threw = false;
      try {
        await result.current.handleMarkAsResolved(baseConversation);
      } catch {
        threw = true;
      }

      expect(threw).toBe(true);
    });
  });

  describe('handleMarkAsResolved — selected vs non-selected (navigation gating)', () => {
    it('resolves without throwing when conversation is NOT selected (non-selected path)', async () => {
      mockConversations.updateConversationStatus.mockResolvedValueOnce({});

      const { result } = renderHook(() => useConversationHandlers());

      await expect(
        result.current.handleMarkAsResolved(baseConversation),
      ).resolves.not.toThrow();
    });

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
});
