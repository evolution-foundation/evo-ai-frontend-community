import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useLiveChannelStatus, { isLiveCheckable } from './useLiveChannelStatus';
import api from '@/services/core/api';
import { Inbox } from '@/types/channels/inbox';

vi.mock('@/services/core/api', () => ({
  default: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

const evolutionInbox = (overrides: Partial<Inbox> = {}): Inbox =>
  ({
    id: 'w1',
    name: 'WA',
    channel_id: 'c1',
    channel_type: 'Channel::Whatsapp',
    provider: 'evolution',
    provider_config: { instance_name: 'inst-1' },
    ...overrides,
  }) as Inbox;

beforeEach(() => {
  mockedGet.mockReset();
});

describe('isLiveCheckable', () => {
  it('accepts only evolution whatsapp inboxes with an instance name', () => {
    expect(isLiveCheckable(evolutionInbox())).toBe(true);
    expect(isLiveCheckable(evolutionInbox({ provider: 'evolution_go' }))).toBe(false);
    expect(isLiveCheckable(evolutionInbox({ provider: 'whatsapp_cloud' }))).toBe(false);
    expect(isLiveCheckable(evolutionInbox({ provider_config: {} }))).toBe(false);
    expect(isLiveCheckable(evolutionInbox({ channel_type: 'Channel::Email' }))).toBe(false);
  });
});

describe('useLiveChannelStatus', () => {
  it('overlays the live state reported by the instances proxy', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { instance: { instanceName: 'inst-1', state: 'open' } } },
    });

    const { result } = renderHook(() => useLiveChannelStatus([evolutionInbox()]));

    expect(result.current.loadingIds.has('w1')).toBe(true);
    await waitFor(() => expect(result.current.states.w1).toBe('connected'));
    expect(result.current.loadingIds.has('w1')).toBe(false);
    expect(result.current.failedIds.has('w1')).toBe(false);
    expect(mockedGet).toHaveBeenCalledWith('/evolution/instances', {
      params: { instanceName: 'inst-1' },
    });
  });

  it('marks the inbox as failed when the probe errors, keeping the stored state authoritative', async () => {
    mockedGet.mockRejectedValueOnce(new Error('proxy down'));

    const { result } = renderHook(() => useLiveChannelStatus([evolutionInbox()]));

    await waitFor(() => expect(result.current.failedIds.has('w1')).toBe(true));
    expect(result.current.states.w1).toBeUndefined();
    expect(result.current.loadingIds.has('w1')).toBe(false);
  });

  it('marks the inbox as failed when the proxy falls back to unknown', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: { instance: { instanceName: 'inst-1', status: 'unknown' } } },
    });

    const { result } = renderHook(() => useLiveChannelStatus([evolutionInbox()]));

    await waitFor(() => expect(result.current.failedIds.has('w1')).toBe(true));
    expect(result.current.states.w1).toBeUndefined();
  });

  it('does nothing when no inbox is live-checkable', () => {
    const { result } = renderHook(() =>
      useLiveChannelStatus([evolutionInbox({ provider: 'whatsapp_cloud' })]),
    );

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.states).toEqual({});
    expect(result.current.loadingIds.size).toBe(0);
  });
});
