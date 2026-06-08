import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRelativeTime } from './useRelativeTime';

const FIXED_NOW = new Date('2026-05-20T13:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRelativeTime', () => {
  it('returns the current time on first render', () => {
    const { result } = renderHook(() => useRelativeTime(new Date(FIXED_NOW.getTime() - 10_000)));
    expect(result.current.getTime()).toBe(FIXED_NOW.getTime());
  });

  it('ticks every 30s when the date is fresher than 1 minute', () => {
    const date = new Date(FIXED_NOW.getTime() - 10_000);
    const { result } = renderHook(() => useRelativeTime(date));
    const initial = result.current.getTime();
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.getTime()).toBe(initial);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.getTime()).toBe(initial + 30_000);
  });

  it('ticks every 60s when the date is between 1m and 1h old', () => {
    const date = new Date(FIXED_NOW.getTime() - 5 * 60 * 1000);
    const { result } = renderHook(() => useRelativeTime(date));
    const initial = result.current.getTime();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial + 60_000);
  });

  it('does not start the interval when date is null', () => {
    const { result } = renderHook(() => useRelativeTime(null));
    const initial = result.current.getTime();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.getTime()).toBe(initial);
  });

  it('clears the pending timer on unmount', () => {
    const date = new Date(FIXED_NOW.getTime() - 10_000);
    const before = vi.getTimerCount();
    const { unmount } = renderHook(() => useRelativeTime(date));
    expect(vi.getTimerCount()).toBe(before + 1);
    unmount();
    expect(vi.getTimerCount()).toBe(before);
  });

  it('snaps `now` to the wall-clock when the input date changes (save-just-landed)', () => {
    // Reproduces the bug fixed in EVO-1258: while mounted, the user saves,
    // which flips lastSavedAt from 2h ago to right now. `now` must follow
    // immediately during the same render so the label reads "just now",
    // not "X minutes ago" where X was the user's session length.
    const initialDate = new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000);
    const { result, rerender } = renderHook(({ date }) => useRelativeTime(date), {
      initialProps: { date: initialDate },
    });
    expect(result.current.getTime()).toBe(FIXED_NOW.getTime());

    // Wall-clock advances 30 minutes (user editing without saving).
    const elapsedNow = new Date(FIXED_NOW.getTime() + 30 * 60 * 1000);
    vi.setSystemTime(elapsedNow);

    // User clicks Save — store.commitSave(new Date()) flips lastSavedAt to NOW.
    rerender({ date: new Date(elapsedNow.getTime()) });

    // `now` must follow the wall-clock so the formatted label reads
    // "just now", not the stale mount-time value.
    expect(result.current.getTime()).toBe(elapsedNow.getTime());
  });

  it('adapts cadence as the date ages within a single mount (recursive setTimeout)', () => {
    // Start fresh: cadence should be 30s for the first minute.
    const date = new Date(FIXED_NOW.getTime() - 10_000);
    const { result } = renderHook(() => useRelativeTime(date));
    const initial = result.current.getTime();

    // First tick at 30s — date is now ~40s old, still <1m, next interval 30s.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial + 30_000);

    // Second tick at 60s — date is now ~70s old, between 1m–1h, next interval 60s.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial + 60_000);

    // 60s later → tick. 30s later still nothing (cadence is 60s now).
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial + 60_000);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.getTime()).toBe(initial + 120_000);
  });
});
