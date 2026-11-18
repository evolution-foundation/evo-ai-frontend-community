import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import api from '@/services/core/api';
import { useIntegrationAvailability } from './useIntegrationAvailability';

vi.mock('@/services/core/api', () => ({ default: { get: vi.fn() } }));

describe('useIntegrationAvailability', () => {
  it('flags a failed check instead of reporting every provider as unconfigured', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useIntegrationAvailability());

    await waitFor(() => expect(result.current.isLoadingAvailability).toBe(false));
    expect(result.current.availabilityFailed).toBe(true);
    expect(result.current.available).toEqual({});
  });

  it('reports an answered check as hyphen-case availability', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: { google_calendar: false } } });

    const { result } = renderHook(() => useIntegrationAvailability());

    await waitFor(() => expect(result.current.isLoadingAvailability).toBe(false));
    expect(result.current.availabilityFailed).toBe(false);
    expect(result.current.available).toEqual({ 'google-calendar': false });
  });
});
