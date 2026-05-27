import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
vi.mock('@/services/core/api', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { contactEventsService } from '../contactEventsService';

const sampleEvent = {
  id: '1',
  eventType: 'track' as const,
  eventName: 'foo',
  occurredAt: '2026-01-01T00:00:00Z',
  properties: {},
};

describe('contactEventsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('list(contactId) hits /contacts/{id}/events (no accounts segment)', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [] } });
    await contactEventsService.list('abc-123');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][0]).toBe('/contacts/abc-123/events');
  });

  it('sends filter params snake_case as-is (CRM proxy translates to camelCase server-side)', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [] } });
    await contactEventsService.list('abc-123', {
      event_type: 'track',
      channel: 'whatsapp',
      occurred_after: '2026-05-01',
      cursor: 'X==',
      limit: 50,
    });
    const config = mockGet.mock.calls[0][1];
    expect(config.params).toEqual({
      event_type: 'track',
      channel: 'whatsapp',
      occurred_after: '2026-05-01',
      cursor: 'X==',
      limit: 50,
    });
  });

  it('returns the body unchanged on the success shape { events, pagination }', async () => {
    const payload = {
      events: [sampleEvent],
      pagination: { nextCursor: 'abc', hasNext: true, limit: 50 },
    };
    mockGet.mockResolvedValueOnce({ data: payload });
    await expect(contactEventsService.list('c-1')).resolves.toEqual(payload);
  });

  it('preserves degraded:true on the failure shape (no pagination)', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [], degraded: true } });
    const out = await contactEventsService.list('c-1');
    expect(out.degraded).toBe(true);
    expect(out.events).toEqual([]);
    expect(out.pagination).toBeUndefined();
  });

  it('preserves pagination.nextCursor and pagination.hasNext', async () => {
    const pagination = { nextCursor: 'page-2-token', hasNext: true, limit: 50 };
    mockGet.mockResolvedValueOnce({ data: { events: [], pagination } });
    const out = await contactEventsService.list('c-1');
    expect(out.pagination).toEqual(pagination);
  });

  it('forwards AbortSignal to axios config', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [] } });
    const controller = new AbortController();
    await contactEventsService.list('c-1', {}, { signal: controller.signal });
    expect(mockGet.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('rejects with the underlying error (no silent catch)', async () => {
    const err = new Error('boom');
    mockGet.mockRejectedValueOnce(err);
    await expect(contactEventsService.list('c-1')).rejects.toThrow('boom');
  });

  it('unwraps an enveloped response { data: { events, pagination } }', async () => {
    const inner = {
      events: [sampleEvent],
      pagination: { nextCursor: 'abc', hasNext: false, limit: 50 },
    };
    mockGet.mockResolvedValueOnce({ data: { data: inner } });
    await expect(contactEventsService.list('c-1')).resolves.toEqual(inner);
  });
});
