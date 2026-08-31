import { create } from 'zustand';
import { conversationAPI } from '@/services/conversations/conversationService';

interface UnansweredConversationsState {
  totalUnanswered: number;
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

export const useUnansweredConversationsStore = create<UnansweredConversationsState>((set) => ({
  totalUnanswered: 0,
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
            const { unanswered_count } = await conversationAPI.getUnansweredCount();
            if (seq <= latestApplied) return;
            latestApplied = seq;
            set({ totalUnanswered: Math.max(0, unanswered_count), isLoaded: true });
          } catch (error) {
            console.warn('Failed to fetch total unanswered count:', error);
          } finally {
            inFlight = null;
            const shouldTrail = trailingRequested;
            trailingRequested = false;
            resolve();
            if (shouldTrail) {
              useUnansweredConversationsStore.getState().fetch();
            }
          }
        })();
      }, FETCH_DEBOUNCE_MS);
    });
    return pending;
  },

  setTotal: (count) => set({ totalUnanswered: Math.max(0, count), isLoaded: true }),

  incrementBy: (delta) =>
    set((state) => ({ totalUnanswered: Math.max(0, state.totalUnanswered + delta) })),

  decrementBy: (delta) =>
    set((state) => ({ totalUnanswered: Math.max(0, state.totalUnanswered - delta) })),

  reset: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pending = null;
    inFlight = null;
    trailingRequested = false;
    latestApplied = fetchSeq;
    set({ totalUnanswered: 0, isLoaded: false });
  },
}));
