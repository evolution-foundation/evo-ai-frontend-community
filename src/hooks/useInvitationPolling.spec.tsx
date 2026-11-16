import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { useInvitationPolling } from './useInvitationPolling';
import type { User } from '@/types/users';
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const t = (key: string) => key;
const queued = { id: 'synthetic', invitation_request_id: 'delivery-1', invitation_delivery_status: 'queued' } as User;
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());
describe('bounded invitation polling', () => {
  it('polls every 5s, stops at 2min, refreshes on focus and cleans up', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useInvitationPolling([queued], true, refresh, t));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(115000));
    expect(refresh).toHaveBeenCalledTimes(23);
    expect(toast.info).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(refresh).toHaveBeenCalledTimes(23);
    await act(() => window.dispatchEvent(new Event('focus')));
    expect(refresh).toHaveBeenCalledTimes(24);
    unmount();
    await act(() => window.dispatchEvent(new Event('focus')));
    expect(refresh).toHaveBeenCalledTimes(24);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('emits one terminal toast per request and ignores historical sent state', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ users }) => useInvitationPolling(users, true, refresh, t), { initialProps: { users: [queued] } });
    const failed = { ...queued, invitation_delivery_status: 'failed' } as User;
    rerender({ users: [failed] }); rerender({ users: [{ ...failed }] });
    expect(toast.error).toHaveBeenCalledTimes(1);
    rerender({ users: [{ ...queued, invitation_request_id: 'old', invitation_delivery_status: 'sent' }] });
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('does not poll without permission and does not overlap slow requests', async () => {
    let resolve: () => void = () => {};
    const refresh = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    const { rerender, unmount } = renderHook(({ enabled }) => useInvitationPolling([queued], enabled, refresh, t), { initialProps: { enabled: false } });
    await act(() => vi.advanceTimersByTimeAsync(5000)); expect(refresh).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await act(() => vi.advanceTimersByTimeAsync(15000)); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => resolve()); unmount();
  });
});
