import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ContactEvent, ContactEventsResponse } from '@/types/contacts';

const listMock = vi.fn();
vi.mock('@/services/contacts/contactEventsService', () => ({
  contactEventsService: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

import { useContactEvents } from '../useContactEvents';
import { useContactEventsStore } from '@/store/contactEventsStore';

function makeEvent(id: string, overrides: Partial<ContactEvent> = {}): ContactEvent {
  return {
    id,
    eventType: 'track',
    eventName: 'message_created',
    occurredAt: '2026-05-01T12:00:00Z',
    properties: {},
    ...overrides,
  };
}

function paged(events: ContactEvent[], opts: { nextCursor?: string | null; hasNext?: boolean } = {}): ContactEventsResponse {
  return {
    events,
    pagination: {
      nextCursor: opts.nextCursor ?? null,
      hasNext: opts.hasNext ?? false,
      limit: 50,
    },
  };
}

function resetStore() {
  useContactEventsStore.setState({
    contactId: null,
    events: [],
    filters: {},
    nextCursor: undefined,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    errorCode: null,
    degraded: false,
    softCapped: false,
    hasFetched: false,
    requestId: 0,
    abortController: null,
  });
}

function makeAxiosError(status: number): AxiosError {
  const err = new AxiosError('upstream', `${status}`, undefined, undefined, {
    status,
    statusText: 'err',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
    data: {},
  } as never);
  return err;
}

describe('useContactEvents', () => {
  beforeEach(() => {
    listMock.mockReset();
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the first page on mount with the given contactId', async () => {
    listMock.mockResolvedValueOnce({
      events: [makeEvent('e1'), makeEvent('e2')],
    } satisfies ContactEventsResponse);

    const { result } = renderHook(() => useContactEvents('c-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toHaveLength(2);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock.mock.calls[0][0]).toBe('c-1');
  });

  it('persists state across remount for the same contact (AC7 — no re-fetch)', async () => {
    listMock.mockResolvedValueOnce({ events: [makeEvent('e1')] } satisfies ContactEventsResponse);

    const { result, unmount } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(listMock).toHaveBeenCalledTimes(1);
    unmount();

    // Remount with the same contactId — should NOT trigger another fetch.
    const remounted = renderHook(() => useContactEvents('c-1'));
    expect(remounted.result.current.events).toHaveLength(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('resets and refetches when contactId changes', async () => {
    listMock
      .mockResolvedValueOnce({ events: [makeEvent('a')] } satisfies ContactEventsResponse)
      .mockResolvedValueOnce({ events: [makeEvent('b')] } satisfies ContactEventsResponse);

    const { result, rerender } = renderHook(({ id }) => useContactEvents(id), {
      initialProps: { id: 'c-1' },
    });
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['a']));

    rerender({ id: 'c-2' });
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['b']));
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[1][0]).toBe('c-2');
  });

  it('setFilters cancels the in-flight request and refetches', async () => {
    let resolveFirst: (v: ContactEventsResponse) => void = () => {};
    const firstPromise = new Promise<ContactEventsResponse>((res) => {
      resolveFirst = res;
    });
    listMock.mockReturnValueOnce(firstPromise);

    const { result } = renderHook(() => useContactEvents('c-1'));
    // Triggering setFilters before the first call resolves should abort it.
    listMock.mockResolvedValueOnce({ events: [makeEvent('e-after-filter')] } satisfies ContactEventsResponse);

    await act(async () => {
      result.current.setFilters({ event_type: 'track' });
    });

    // Resolve the first (now stale) request — its result must be dropped.
    resolveFirst({ events: [makeEvent('stale')] } satisfies ContactEventsResponse);

    await waitFor(() => {
      expect(result.current.events.map((e) => e.id)).toEqual(['e-after-filter']);
    });
    expect(result.current.filters).toEqual({ event_type: 'track' });
  });

  it('drops out-of-order responses via request-id guard', async () => {
    let resolveFirst: (v: ContactEventsResponse) => void = () => {};
    let resolveSecond: (v: ContactEventsResponse) => void = () => {};
    listMock
      .mockReturnValueOnce(new Promise<ContactEventsResponse>((res) => { resolveFirst = res; }))
      .mockReturnValueOnce(new Promise<ContactEventsResponse>((res) => { resolveSecond = res; }));

    const { result } = renderHook(() => useContactEvents('c-1'));

    await act(async () => {
      result.current.setFilters({ event_type: 'track' });
    });

    // Resolve the SECOND request first, then the first. State must reflect the
    // second (most recent) response only.
    resolveSecond({ events: [makeEvent('second')] } satisfies ContactEventsResponse);
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['second']));

    resolveFirst({ events: [makeEvent('first')] } satisfies ContactEventsResponse);
    // Wait a microtask to let any (incorrect) commit happen.
    await new Promise((res) => setTimeout(res, 0));
    expect(result.current.events.map((e) => e.id)).toEqual(['second']);
  });

  it('loadMore is idempotent (double-trigger results in a single network call)', async () => {
    listMock.mockResolvedValueOnce(paged([makeEvent('e1')], { nextCursor: 'cursor-1', hasNext: true }));

    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let pendingResolve: (v: ContactEventsResponse) => void = () => {};
    listMock.mockReturnValueOnce(
      new Promise<ContactEventsResponse>((res) => {
        pendingResolve = res;
      }),
    );

    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
    });

    pendingResolve({ events: [makeEvent('e2')] } satisfies ContactEventsResponse);
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    // 1 initial + 1 loadMore = 2 total
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('refetch preserves the current filters', async () => {
    listMock.mockResolvedValue({ events: [] } satisfies ContactEventsResponse);
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setFilters({ channel: 'whatsapp' });
    });
    await waitFor(() => expect(result.current.filters).toEqual({ channel: 'whatsapp' }));

    listMock.mockClear();
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    expect(listMock.mock.calls[0][1]).toEqual({ channel: 'whatsapp' });
  });

  it('silences 401 errors (interceptor handles refresh)', async () => {
    listMock.mockRejectedValueOnce(makeAxiosError(401));
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.errorCode).toBe(401);
  });

  it('exposes errorCode for 422 (invalid filters)', async () => {
    listMock.mockRejectedValueOnce(makeAxiosError(422));
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.errorCode).toBe(422);
  });

  it('accepts degraded:true with an empty event list', async () => {
    listMock.mockResolvedValueOnce({ events: [], degraded: true } satisfies ContactEventsResponse);
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.degraded).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('does not emit a React warning when the component unmounts during an in-flight fetch (AC17)', async () => {
    let resolvePending: (v: ContactEventsResponse) => void = () => {};
    listMock.mockReturnValueOnce(
      new Promise<ContactEventsResponse>((res) => {
        resolvePending = res;
      }),
    );

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useContactEvents('c-1'));

    unmount();
    // Resolve AFTER unmount — store still commits (intentionally; Zustand
    // lives outside React lifecycle) but no setState warning should fire on
    // the now-gone component.
    resolvePending({ events: [makeEvent('late')] } satisfies ContactEventsResponse);
    await new Promise((r) => setTimeout(r, 0));

    const warnings = consoleError.mock.calls
      .map((args) => String(args[0] ?? ''))
      .filter((s) => s.includes('unmounted') || s.includes("Can't perform a React state update"));
    expect(warnings).toEqual([]);
    consoleError.mockRestore();
  });

  it('retries on remount after a failed initial fetch (H3 fix — hasFetched stays false)', async () => {
    listMock.mockRejectedValueOnce(makeAxiosError(500));
    const { result, unmount } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.errorCode).toBe(500);
    unmount();

    // Remount: the previous attempt errored, so the hook MUST retry rather
    // than show a stale error banner forever.
    listMock.mockResolvedValueOnce({ events: [makeEvent('recovered')] } satisfies ContactEventsResponse);
    const remounted = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(remounted.result.current.isLoading).toBe(false));
    expect(remounted.result.current.events.map((e) => e.id)).toEqual(['recovered']);
    expect(remounted.result.current.error).toBeNull();
  });

  it('raises softCapped when total events reach exactly 2000 (Sourcery #1)', async () => {
    const first = Array.from({ length: 1500 }, (_, i) => makeEvent(`a-${i}`));
    const second = Array.from({ length: 500 }, (_, i) => makeEvent(`b-${i}`));

    listMock.mockResolvedValueOnce(paged(first, { nextCursor: 'k', hasNext: true }));
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.softCapped).toBe(false);

    listMock.mockResolvedValueOnce({ events: second });
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    // No FIFO drop happened (total === 2000), but the banner must show
    // because the very next load-more WILL drop events.
    expect(result.current.events).toHaveLength(2000);
    expect(result.current.softCapped).toBe(true);
    expect(result.current.events[0].id).toBe('a-0');
  });

  it('applies soft-cap at 2000 events (FIFO drop)', async () => {
    const first = Array.from({ length: 1500 }, (_, i) => makeEvent(`a-${i}`));
    const second = Array.from({ length: 600 }, (_, i) => makeEvent(`b-${i}`));

    listMock.mockResolvedValueOnce(paged(first, { nextCursor: 'k', hasNext: true }));
    const { result } = renderHook(() => useContactEvents('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    listMock.mockResolvedValueOnce({ events: second } satisfies ContactEventsResponse);
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    expect(result.current.events).toHaveLength(2000);
    expect(result.current.softCapped).toBe(true);
    // Oldest 100 events should be dropped: first remaining event id should be 'a-100'.
    expect(result.current.events[0].id).toBe('a-100');
    expect(result.current.events[result.current.events.length - 1].id).toBe('b-599');
  });
});
