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

let fetchSeq = 0;
let latestApplied = 0;
let inFlight: Promise<void> | null = null;
let pending: Promise<void> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let trailingRequested = false;

const FETCH_DEBOUNCE_MS = 400;

export const useUnreadConversationsStore = create<UnreadConversationsState>((set) => ({
  totalUnread: 0,
  isLoaded: false,

  fetch: async () => {
    if (inFlight) {
      trailingRequested = true;
      return inFlight;
    }
    if (pending) return pending;

    pending = new Promise<void>((resolve) => {
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        pending = null;
        const seq = ++fetchSeq;
        inFlight = (async () => {
          try {
            const { unread_count } = await conversationAPI.getUnreadCount();
            if (seq <= latestApplied) return;
            latestApplied = seq;
            set({ totalUnread: Math.max(0, unread_count), isLoaded: true });
          } catch (error) {
            console.warn('Failed to fetch total unread count:', error);
          } finally {
            inFlight = null;
            const shouldTrail = trailingRequested;
            trailingRequested = false;
            resolve();
            if (shouldTrail) {
              useUnreadConversationsStore.getState().fetch();
            }
          }
        })();
      }, FETCH_DEBOUNCE_MS);
    });
    return pending;
  },

  setTotal: (count) => set({ totalUnread: Math.max(0, count), isLoaded: true }),

  incrementBy: (delta) =>
    set((state) => ({ totalUnread: Math.max(0, state.totalUnread + delta) })),

  decrementBy: (delta) =>
    set((state) => ({ totalUnread: Math.max(0, state.totalUnread - delta) })),

  reset: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pending = null;
    inFlight = null;
    trailingRequested = false;
    latestApplied = fetchSeq;
    set({ totalUnread: 0, isLoaded: false });
  },
}));
