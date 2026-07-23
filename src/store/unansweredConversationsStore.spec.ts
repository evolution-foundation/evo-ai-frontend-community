import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/conversations/conversationService', () => ({
  conversationAPI: {
    getUnansweredCount: vi.fn(),
  },
}));

import { useUnansweredConversationsStore } from './unansweredConversationsStore';
import { conversationAPI } from '@/services/conversations/conversationService';

const mockedGetUnansweredCount = vi.mocked(conversationAPI.getUnansweredCount);

beforeEach(() => {
  vi.useFakeTimers();
  mockedGetUnansweredCount.mockReset();
  useUnansweredConversationsStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useUnansweredConversationsStore.fetch', () => {
  it('coalesces N rapid calls within the debounce window into one HTTP request', async () => {
    mockedGetUnansweredCount.mockResolvedValue({ unanswered_count: 5 });
    const { fetch } = useUnansweredConversationsStore.getState();

    fetch();
    fetch();
    fetch();
    fetch();
    fetch();

    expect(mockedGetUnansweredCount).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(5);
    expect(useUnansweredConversationsStore.getState().isLoaded).toBe(true);
  });

  it('all concurrent callers resolve once after a single HTTP round-trip', async () => {
    mockedGetUnansweredCount.mockResolvedValue({ unanswered_count: 3 });
    const { fetch } = useUnansweredConversationsStore.getState();

    const resolved: number[] = [];
    const p1 = fetch().then(() => resolved.push(1));
    const p2 = fetch().then(() => resolved.push(2));
    const p3 = fetch().then(() => resolved.push(3));

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();
    await Promise.all([p1, p2, p3]);

    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);
    expect(resolved.sort()).toEqual([1, 2, 3]);
  });

  it('clamps a negative server response to zero', async () => {
    mockedGetUnansweredCount.mockResolvedValue({ unanswered_count: -7 });
    useUnansweredConversationsStore.getState().fetch();

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
  });

  it('does not crash when the API rejects and leaves totalUnanswered untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useUnansweredConversationsStore.setState({ totalUnanswered: 9, isLoaded: true });
    mockedGetUnansweredCount.mockRejectedValueOnce(new Error('boom'));

    useUnansweredConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(9);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('useUnansweredConversationsStore.reset', () => {
  it('cancels a pending debounced fetch so no request is issued after logout', async () => {
    mockedGetUnansweredCount.mockResolvedValue({ unanswered_count: 42 });
    useUnansweredConversationsStore.getState().fetch();

    useUnansweredConversationsStore.getState().reset();

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();

    expect(mockedGetUnansweredCount).not.toHaveBeenCalled();
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
    expect(useUnansweredConversationsStore.getState().isLoaded).toBe(false);
  });

  it('zeroes totalUnanswered and isLoaded synchronously', () => {
    useUnansweredConversationsStore.setState({ totalUnanswered: 13, isLoaded: true });
    useUnansweredConversationsStore.getState().reset();
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
    expect(useUnansweredConversationsStore.getState().isLoaded).toBe(false);
  });

  it('neutralizes an in-flight GET so it cannot resurrect the badge after reset', async () => {
    let resolveGet: (v: { unanswered_count: number }) => void = () => {};
    mockedGetUnansweredCount.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );

    useUnansweredConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(401);
    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);

    useUnansweredConversationsStore.getState().reset();
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
    expect(useUnansweredConversationsStore.getState().isLoaded).toBe(false);

    resolveGet({ unanswered_count: 42 });
    await flushMicrotasks();

    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
    expect(useUnansweredConversationsStore.getState().isLoaded).toBe(false);
  });
});

describe('useUnansweredConversationsStore.fetch trailing re-fetch', () => {
  it('re-arms one trailing GET when fetch() is called during an in-flight request', async () => {
    let resolveFirst: (v: { unanswered_count: number }) => void = () => {};
    mockedGetUnansweredCount
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({ unanswered_count: 7 });

    useUnansweredConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(401);
    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);

    useUnansweredConversationsStore.getState().fetch();
    useUnansweredConversationsStore.getState().fetch();
    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);

    resolveFirst({ unanswered_count: 3 });
    await flushMicrotasks();
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(3);

    await vi.advanceTimersByTimeAsync(401);
    await flushMicrotasks();

    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(2);
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(7);
  });

  it('does not re-arm a trailing GET when no fetch() arrived during the in-flight window', async () => {
    mockedGetUnansweredCount.mockResolvedValueOnce({ unanswered_count: 4 });

    useUnansweredConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();
    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(mockedGetUnansweredCount).toHaveBeenCalledTimes(1);
  });
});

describe('useUnansweredConversationsStore.setTotal / incrementBy / decrementBy', () => {
  it('setTotal clamps to zero', () => {
    useUnansweredConversationsStore.getState().setTotal(-5);
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);
  });

  it('incrementBy / decrementBy never go below zero', () => {
    useUnansweredConversationsStore.setState({ totalUnanswered: 2 });
    useUnansweredConversationsStore.getState().decrementBy(10);
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(0);

    useUnansweredConversationsStore.getState().incrementBy(3);
    expect(useUnansweredConversationsStore.getState().totalUnanswered).toBe(3);
  });
});
