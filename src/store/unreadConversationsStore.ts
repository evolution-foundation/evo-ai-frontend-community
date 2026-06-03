import { create } from 'zustand';
import { conversationAPI } from '@/services/conversations/conversationService';

interface UnreadConversationsState {
  totalUnread: number;
  isLoaded: boolean;
  fetch: () => Promise<void>;
  setTotal: (count: number) => void;
  incrementBy: (delta: number) => void;
  decrementBy: (delta: number) => void;
  reset: () => void;
}

export const useUnreadConversationsStore = create<UnreadConversationsState>((set) => ({
  totalUnread: 0,
  isLoaded: false,

  fetch: async () => {
    try {
      const { unread_count } = await conversationAPI.getUnreadCount();
      set({ totalUnread: Math.max(0, unread_count), isLoaded: true });
    } catch (error) {
      console.warn('Failed to fetch total unread count:', error);
    }
  },

  setTotal: (count) => set({ totalUnread: Math.max(0, count), isLoaded: true }),

  incrementBy: (delta) =>
    set((state) => ({ totalUnread: Math.max(0, state.totalUnread + delta) })),

  decrementBy: (delta) =>
    set((state) => ({ totalUnread: Math.max(0, state.totalUnread - delta) })),

  reset: () => set({ totalUnread: 0, isLoaded: false }),
}));
