import { useEffect } from 'react';
import { useContactEventsStore } from '@/store/contactEventsStore';
import type { ContactEvent, ContactEventsQuery } from '@/types/contacts';

export interface UseContactEventsReturn {
  events: ContactEvent[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  errorCode: number | null;
  degraded: boolean;
  hasMore: boolean;
  softCapped: boolean;
  filters: ContactEventsQuery;
  setFilters: (next: ContactEventsQuery) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

// Subscribes to the contactEvents Zustand slice. The slice survives unmount
// (AC7: switching CRM tabs and coming back must not re-fetch), so the hook
// only triggers a first-page fetch when the slice has never been populated
// for the given contactId.
export function useContactEvents(contactId: string): UseContactEventsReturn {
  const sliceContactId = useContactEventsStore((s) => s.contactId);
  const events = useContactEventsStore((s) => s.events);
  const filters = useContactEventsStore((s) => s.filters);
  const isLoading = useContactEventsStore((s) => s.isLoading);
  const isLoadingMore = useContactEventsStore((s) => s.isLoadingMore);
  const error = useContactEventsStore((s) => s.error);
  const errorCode = useContactEventsStore((s) => s.errorCode);
  const degraded = useContactEventsStore((s) => s.degraded);
  const hasMore = useContactEventsStore((s) => s.hasMore);
  const softCapped = useContactEventsStore((s) => s.softCapped);
  const fetchFirstPage = useContactEventsStore((s) => s.fetchFirstPage);
  const loadMore = useContactEventsStore((s) => s.loadMore);
  const refetch = useContactEventsStore((s) => s.refetch);
  const setFilters = useContactEventsStore((s) => s.setFilters);
  const resetIfDifferentContact = useContactEventsStore((s) => s.resetIfDifferentContact);

  useEffect(() => {
    resetIfDifferentContact(contactId);
    // Only fetch when there's nothing cached for this contact. If the user
    // re-opens the events tab for the same contact, the slice already has
    // events and we skip the network call (AC7).
    const state = useContactEventsStore.getState();
    if (state.contactId === contactId && !state.hasFetched && !state.isLoading) {
      fetchFirstPage(contactId);
    }
  }, [contactId, fetchFirstPage, resetIfDifferentContact]);

  return {
    events: sliceContactId === contactId ? events : [],
    isLoading: sliceContactId === contactId ? isLoading : false,
    isLoadingMore: sliceContactId === contactId ? isLoadingMore : false,
    error: sliceContactId === contactId ? error : null,
    errorCode: sliceContactId === contactId ? errorCode : null,
    degraded: sliceContactId === contactId ? degraded : false,
    hasMore: sliceContactId === contactId ? hasMore : false,
    softCapped: sliceContactId === contactId ? softCapped : false,
    filters: sliceContactId === contactId ? filters : {},
    setFilters,
    loadMore,
    refetch,
  };
}
