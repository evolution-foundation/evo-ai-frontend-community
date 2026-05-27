import { create } from 'zustand';
import { AxiosError } from 'axios';
import { contactEventsService } from '@/services/contacts/contactEventsService';
import type { ContactEvent, ContactEventsQuery } from '@/types/contacts';

const SOFT_CAP = 2000;

interface ContactEventsState {
  // Tracks which contact owns the current slice. When a new contactId arrives
  // the slice is reset before fetching so two contacts never share events.
  // Linear AC7 wants persistence across tab switches; that means we keep the
  // slice across mounts of ContactEventsTab as long as contactId stays the
  // same. A different contactId (or a refetch) clears it.
  contactId: string | null;
  events: ContactEvent[];
  filters: ContactEventsQuery;
  nextCursor: string | undefined;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  errorCode: number | null;
  degraded: boolean;
  softCapped: boolean;
  hasFetched: boolean;

  // Internal request bookkeeping. requestId increments on every fetch and the
  // response only commits state if the captured id is still current — catches
  // out-of-order responses (resp-1 arriving after resp-2). abortController
  // lets a newer fetch cancel an older one in flight.
  requestId: number;
  abortController: AbortController | null;

  fetchFirstPage: (contactId: string, filters?: ContactEventsQuery) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  setFilters: (filters: ContactEventsQuery) => Promise<void>;
  resetIfDifferentContact: (contactId: string) => void;
}

const INITIAL_SLICE = {
  events: [] as ContactEvent[],
  filters: {} as ContactEventsQuery,
  nextCursor: undefined as string | undefined,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null as Error | null,
  errorCode: null as number | null,
  degraded: false,
  softCapped: false,
  hasFetched: false,
  requestId: 0,
  abortController: null as AbortController | null,
};

function getErrorCode(err: unknown): number | null {
  if (err instanceof AxiosError) return err.response?.status ?? null;
  return null;
}

// Returns the next event array plus whether the list has hit the soft cap.
// The flag is sticky (caller passes the previous value): once we hit or
// pass SOFT_CAP, the banner stays until fetchFirstPage resets the slice.
// Reaching SOFT_CAP exactly also raises the flag — the *next* load-more
// would trigger a FIFO drop, so the "showing the latest N events" copy is
// already truthful at the boundary.
function applySoftCap(
  existing: ContactEvent[],
  batch: ContactEvent[],
  wasSoftCapped: boolean,
): { events: ContactEvent[]; softCapped: boolean } {
  const total = existing.length + batch.length;
  if (total <= SOFT_CAP) {
    const merged = [...existing, ...batch];
    return { events: merged, softCapped: wasSoftCapped || merged.length >= SOFT_CAP };
  }
  const dropCount = total - SOFT_CAP;
  const trimmed = existing.slice(dropCount).concat(batch);
  return { events: trimmed, softCapped: true };
}

export const useContactEventsStore = create<ContactEventsState>((set, get) => ({
  contactId: null,
  ...INITIAL_SLICE,

  resetIfDifferentContact: (contactId) => {
    const current = get();
    if (current.contactId === contactId) return;
    current.abortController?.abort();
    // Spread INITIAL_SLICE first so the explicit `contactId` always wins,
    // even if INITIAL_SLICE later grows a `contactId` field.
    set({ ...INITIAL_SLICE, contactId });
  },

  fetchFirstPage: async (contactId, filters = {}) => {
    const current = get();
    current.abortController?.abort();

    const controller = new AbortController();
    const requestId = current.requestId + 1;

    set({
      contactId,
      filters,
      events: [],
      nextCursor: undefined,
      hasMore: false,
      isLoading: true,
      isLoadingMore: false,
      error: null,
      errorCode: null,
      degraded: false,
      softCapped: false,
      requestId,
      abortController: controller,
    });

    try {
      const response = await contactEventsService.list(contactId, filters, { signal: controller.signal });
      if (get().requestId !== requestId) return;
      // Degraded responses ship without pagination (controller short-circuits
      // to `{events: [], degraded: true}` on 5xx / network). Treat the
      // absence of pagination as "no more pages" so the user doesn't see a
      // load-more button on a degraded empty list.
      set({
        events: response.events,
        nextCursor: response.pagination?.nextCursor ?? undefined,
        hasMore: response.pagination?.hasNext ?? false,
        degraded: !!response.degraded,
        isLoading: false,
        hasFetched: true,
        abortController: null,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (get().requestId !== requestId) return;
      const code = getErrorCode(err);
      // 401 is handled by the global api interceptor (token refresh / logout).
      // Surfacing it as a tab-level error duplicates that flow and confuses
      // the user mid-refresh.
      const visibleError = code === 401 ? null : (err as Error);
      // Intentionally leave `hasFetched` false on error so a transient
      // failure (422 / 429 / 5xx) does not lock the tab — re-opening or
      // re-mounting the hook will retry instead of showing a stale banner
      // forever.
      set({
        isLoading: false,
        error: visibleError,
        errorCode: code,
        abortController: null,
      });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoadingMore || state.isLoading || !state.hasMore || !state.contactId || !state.nextCursor) {
      return;
    }

    const controller = new AbortController();
    const requestId = state.requestId + 1;
    set({ isLoadingMore: true, requestId, abortController: controller });

    try {
      const response = await contactEventsService.list(
        state.contactId,
        { ...state.filters, cursor: state.nextCursor },
        { signal: controller.signal },
      );
      if (get().requestId !== requestId) return;
      const { events, softCapped } = applySoftCap(get().events, response.events, get().softCapped);
      set({
        events,
        softCapped,
        nextCursor: response.pagination?.nextCursor ?? undefined,
        hasMore: response.pagination?.hasNext ?? false,
        degraded: !!response.degraded,
        isLoadingMore: false,
        abortController: null,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (get().requestId !== requestId) return;
      const code = getErrorCode(err);
      const visibleError = code === 401 ? null : (err as Error);
      set({
        isLoadingMore: false,
        error: visibleError,
        errorCode: code,
        abortController: null,
      });
    }
  },

  refetch: async () => {
    const state = get();
    if (!state.contactId) return;
    await get().fetchFirstPage(state.contactId, state.filters);
  },

  setFilters: async (filters) => {
    const state = get();
    if (!state.contactId) {
      set({ filters });
      return;
    }
    await get().fetchFirstPage(state.contactId, filters);
  },
}));
