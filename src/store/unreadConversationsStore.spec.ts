import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/conversations/conversationService', () => ({
  conversationAPI: {
    getUnreadCount: vi.fn(),
  },
}));

import { useUnreadConversationsStore } from './unreadConversationsStore';
import { conversationAPI } from '@/services/conversations/conversationService';

const mockedGetUnreadCount = vi.mocked(conversationAPI.getUnreadCount);

beforeEach(() => {
  vi.useFakeTimers();
  mockedGetUnreadCount.mockReset();
  useUnreadConversationsStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useUnreadConversationsStore.fetch', () => {
  it('coalesces N rapid calls within the debounce window into one HTTP request', async () => {
    mockedGetUnreadCount.mockResolvedValue({ unread_count: 5 });
    const { fetch } = useUnreadConversationsStore.getState();

    fetch();
    fetch();
    fetch();
    fetch();
    fetch();

    expect(mockedGetUnreadCount).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(5);
    expect(useUnreadConversationsStore.getState().isLoaded).toBe(true);
  });

  it('all concurrent callers resolve once after a single HTTP round-trip', async () => {
    mockedGetUnreadCount.mockResolvedValue({ unread_count: 3 });
    const { fetch } = useUnreadConversationsStore.getState();

    const resolved: number[] = [];
    const p1 = fetch().then(() => resolved.push(1));
    const p2 = fetch().then(() => resolved.push(2));
    const p3 = fetch().then(() => resolved.push(3));

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();
    await Promise.all([p1, p2, p3]);

    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);
    expect(resolved.sort()).toEqual([1, 2, 3]);
  });

  it('clamps a negative server response to zero', async () => {
    mockedGetUnreadCount.mockResolvedValue({ unread_count: -7 });
    useUnreadConversationsStore.getState().fetch();

    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
  });

  it('does not crash when the API rejects and leaves totalUnread untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useUnreadConversationsStore.setState({ totalUnread: 9, isLoaded: true });
    mockedGetUnreadCount.mockRejectedValueOnce(new Error('boom'));

    useUnreadConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();

    expect(useUnreadConversationsStore.getState().totalUnread).toBe(9);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('useUnreadConversationsStore.reset', () => {
  it('cancels a pending debounced fetch so no request is issued after logout', async () => {
    mockedGetUnreadCount.mockResolvedValue({ unread_count: 42 });
    useUnreadConversationsStore.getState().fetch();

    useUnreadConversationsStore.getState().reset();

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();

    expect(mockedGetUnreadCount).not.toHaveBeenCalled();
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
    expect(useUnreadConversationsStore.getState().isLoaded).toBe(false);
  });

  it('zeroes totalUnread and isLoaded synchronously', () => {
    useUnreadConversationsStore.setState({ totalUnread: 13, isLoaded: true });
    useUnreadConversationsStore.getState().reset();
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
    expect(useUnreadConversationsStore.getState().isLoaded).toBe(false);
  });

  it('neutralizes an in-flight GET so it cannot resurrect the badge after reset', async () => {
    let resolveGet: (v: { unread_count: number }) => void = () => {};
    mockedGetUnreadCount.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );

    useUnreadConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(401);
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);

    useUnreadConversationsStore.getState().reset();
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
    expect(useUnreadConversationsStore.getState().isLoaded).toBe(false);

    resolveGet({ unread_count: 42 });
    await flushMicrotasks();

    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
    expect(useUnreadConversationsStore.getState().isLoaded).toBe(false);
  });
});

describe('useUnreadConversationsStore.fetch trailing re-fetch', () => {
  it('re-arms one trailing GET when fetch() is called during an in-flight request', async () => {
    let resolveFirst: (v: { unread_count: number }) => void = () => {};
    mockedGetUnreadCount
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({ unread_count: 7 });

    useUnreadConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(401);
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);

    useUnreadConversationsStore.getState().fetch();
    useUnreadConversationsStore.getState().fetch();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);

    resolveFirst({ unread_count: 3 });
    await flushMicrotasks();
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(3);

    await vi.advanceTimersByTimeAsync(401);
    await flushMicrotasks();

    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(2);
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(7);
  });

  it('does not re-arm a trailing GET when no fetch() arrived during the in-flight window', async () => {
    mockedGetUnreadCount.mockResolvedValueOnce({ unread_count: 4 });

    useUnreadConversationsStore.getState().fetch();
    await vi.advanceTimersByTimeAsync(450);
    await flushMicrotasks();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await flushMicrotasks();
    expect(mockedGetUnreadCount).toHaveBeenCalledTimes(1);
  });
});

describe('useUnreadConversationsStore.setTotal / incrementBy / decrementBy', () => {
  it('setTotal clamps to zero', () => {
    useUnreadConversationsStore.getState().setTotal(-5);
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);
  });

  it('incrementBy / decrementBy never go below zero', () => {
    useUnreadConversationsStore.setState({ totalUnread: 2 });
    useUnreadConversationsStore.getState().decrementBy(10);
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(0);

    useUnreadConversationsStore.getState().incrementBy(3);
    expect(useUnreadConversationsStore.getState().totalUnread).toBe(3);
  });
});
