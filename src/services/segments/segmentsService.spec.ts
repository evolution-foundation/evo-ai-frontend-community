import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SegmentDefinition } from '@/types/analytics/segments';

// CRM proxy axios instance — every segment method must route through this.
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock('@/services/core/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApi.get(...args),
    post: (...args: unknown[]) => mockApi.post(...args),
    put: (...args: unknown[]) => mockApi.put(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));

// The direct evo-flow instance must receive ZERO calls after the migration
// (EVO-1569 AC1). It is still mocked in case any stale reference remains, so
// the assertions below fail loudly rather than hitting the network.
const mockEvoFlow = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock('@/services/core/apiEvoFlow', () => ({
  default: {
    get: (...args: unknown[]) => mockEvoFlow.get(...args),
    post: (...args: unknown[]) => mockEvoFlow.post(...args),
    put: (...args: unknown[]) => mockEvoFlow.put(...args),
    delete: (...args: unknown[]) => mockEvoFlow.delete(...args),
  },
}));

import { segmentsService } from './segmentsService';

const expectNoEvoFlowCalls = () => {
  expect(mockEvoFlow.get).not.toHaveBeenCalled();
  expect(mockEvoFlow.post).not.toHaveBeenCalled();
  expect(mockEvoFlow.put).not.toHaveBeenCalled();
  expect(mockEvoFlow.delete).not.toHaveBeenCalled();
};

const resetMocks = () => {
  Object.values(mockApi).forEach((fn) => fn.mockReset());
  Object.values(mockEvoFlow).forEach((fn) => fn.mockReset());
};

describe('segmentsService.previewSegment', () => {
  const definition: SegmentDefinition = {
    entryNode: { id: 'entry', type: 'Everyone' },
    nodes: [],
  };

  beforeEach(resetMocks);
  afterEach(() => vi.clearAllMocks());

  it('posts the definition to the CRM proxy and returns count + sample', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { count: 7, sample: [{ id: 'c1' }, { id: 'c2' }] },
    });

    const result = await segmentsService.previewSegment(definition);

    expect(mockApi.post).toHaveBeenCalledWith('/segments/preview', { definition });
    expect(result.count).toBe(7);
    expect(result.sample).toEqual([{ id: 'c1' }, { id: 'c2' }]);
    expectNoEvoFlowCalls();
  });

  it('unwraps a { success, data } envelope when present', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { count: 3, sample: [] } },
    });

    const result = await segmentsService.previewSegment(definition);

    expect(result.count).toBe(3);
    expect(result.sample).toEqual([]);
  });
});

describe('segmentsService — EVO-1569 proxy migration', () => {
  beforeEach(resetMocks);
  afterEach(() => vi.clearAllMocks());

  it('deleteSegment → api.delete /segments/:id (not apiEvoFlow)', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { id: 'seg-1', deleted: true } });

    const result = await segmentsService.deleteSegment('seg-1');

    expect(mockApi.delete).toHaveBeenCalledTimes(1);
    expect(mockApi.delete).toHaveBeenCalledWith('/segments/seg-1');
    expect(result).toEqual({ id: 'seg-1', deleted: true });
    expectNoEvoFlowCalls();
  });

  it('deleteSegment resolves on an empty/204 body (AC6)', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: null });

    await expect(segmentsService.deleteSegment('seg-1')).resolves.toBeNull();
    expectNoEvoFlowCalls();
  });

  it('recomputeSegment → api.post /segments/:id/recompute (not apiEvoFlow)', async () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });

    await segmentsService.recomputeSegment('seg-1');

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith('/segments/seg-1/recompute', {});
    expectNoEvoFlowCalls();
  });

  it('recomputeAllSegments → api.post /segments/recompute-all (not apiEvoFlow)', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { results: [], totalProcessingTimeMs: 5 },
    });

    const result = await segmentsService.recomputeAllSegments();

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith('/segments/recompute-all', {});
    expect(result).toEqual({ results: [], totalProcessingTimeMs: 5 });
    expectNoEvoFlowCalls();
  });

  it('getSegmentContactIds → api.get /segments/:id/contact-ids (not apiEvoFlow)', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { contactIds: ['c1'], total: 1, limit: 50, offset: 0 },
    });

    const result = await segmentsService.getSegmentContactIds('seg-1', { limit: 50, offset: 0 });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith('/segments/seg-1/contact-ids', {
      params: { limit: 50, offset: 0 },
    });
    expect(result).toEqual({ contactIds: ['c1'], total: 1, limit: 50, offset: 0 });
    expectNoEvoFlowCalls();
  });

  it('getContactSegments uses api.get with snake_case event_type=segment (AC4)', async () => {
    // 1st api.get = getSegments (limit 100); 2nd api.get = contact events.
    mockApi.get
      .mockResolvedValueOnce({ data: { segments: [], total: 0, page: 1, limit: 100 } })
      .mockResolvedValueOnce({ data: { events: [] } });

    await segmentsService.getContactSegments('contact-1');

    const eventsCall = mockApi.get.mock.calls.find(
      ([url]) => url === '/contacts/contact-1/events',
    );
    expect(eventsCall).toBeDefined();
    expect(eventsCall?.[1]).toEqual({ params: { event_type: 'segment', limit: 100 } });
    expectNoEvoFlowCalls();
  });

  it('getContactSegments derives active segments from segment_entered events', async () => {
    const segments = [{ id: 'seg-active' }, { id: 'seg-left' }];
    mockApi.get
      .mockResolvedValueOnce({ data: { segments, total: 2, page: 1, limit: 100 } })
      .mockResolvedValueOnce({
        data: {
          events: [
            {
              eventName: 'segment_entered',
              occurredAt: '2026-05-02T00:00:00Z',
              properties: { segmentId: 'seg-active' },
            },
            {
              eventName: 'segment_exited',
              occurredAt: '2026-05-02T00:00:00Z',
              properties: { segmentId: 'seg-left' },
            },
          ],
        },
      });

    const result = await segmentsService.getContactSegments('contact-1');

    expect(result.segmentIds).toEqual(['seg-active']);
    expect(result.total).toBe(1);
    expectNoEvoFlowCalls();
  });

  it('getContactSegments rethrows auth failures (401/403) instead of masking them', async () => {
    // getSegments succeeds, the events call 403s — must NOT resolve to empty.
    mockApi.get
      .mockResolvedValueOnce({ data: { segments: [], total: 0, page: 1, limit: 100 } })
      .mockRejectedValueOnce({ response: { status: 403 } });

    await expect(segmentsService.getContactSegments('contact-1')).rejects.toEqual({
      response: { status: 403 },
    });
  });

  it('getContactSegments still degrades to empty on a non-auth error', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { segments: [], total: 0, page: 1, limit: 100 } })
      .mockRejectedValueOnce({ response: { status: 500 } });

    await expect(segmentsService.getContactSegments('contact-1')).resolves.toEqual({
      segmentIds: [],
      segments: [],
      total: 0,
    });
  });
});
