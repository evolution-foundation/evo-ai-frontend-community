import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssigneeFilterRefresh } from './useAssigneeFilterRefresh';
import type { ConversationFilter } from '@/types/chat/api';

const users: ConversationFilter[] = [{
  attribute_key: 'assignee_id', filter_operator: 'equal_to', values: ['agent-a'], query_operator: 'and',
}];

describe('assignee-filter realtime refresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces event bursts into one refresh', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAssigneeFilterRefresh(users, refresh));
    act(() => { result.current(); result.current(); result.current(); });
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not add requests to views without a selected-user filter', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAssigneeFilterRefresh([], refresh));
    act(() => { result.current(); vi.advanceTimersByTime(300); });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('cancels a scheduled refresh when the assignee filter is removed', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ filters }) => useAssigneeFilterRefresh(filters, refresh), {
      initialProps: { filters: users },
    });
    act(() => result.current());
    rerender({ filters: [] });
    act(() => vi.advanceTimersByTime(300));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('uses the latest refresh callback after rerender', () => {
    const oldRefresh = vi.fn().mockResolvedValue(undefined);
    const nextRefresh = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ refresh }) => useAssigneeFilterRefresh(users, refresh), {
      initialProps: { refresh: oldRefresh },
    });
    act(() => result.current());
    rerender({ refresh: nextRefresh });
    act(() => vi.advanceTimersByTime(300));
    expect(oldRefresh).not.toHaveBeenCalled();
    expect(nextRefresh).toHaveBeenCalledTimes(1);
  });

  it('cleans up scheduled work when unmounted', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useAssigneeFilterRefresh(users, refresh));
    act(() => result.current());
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(refresh).not.toHaveBeenCalled();
  });
});
