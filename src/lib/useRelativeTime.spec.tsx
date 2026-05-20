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
