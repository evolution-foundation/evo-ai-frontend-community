import { beforeEach, describe, expect, it, vi } from 'vitest';
import { segmentsService } from './segmentsService';
import api from '@/services/core/api';
import type { SegmentDefinition } from '@/types/analytics/segments';

vi.mock('@/services/core/api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/services/core/apiEvoFlow', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const definition: SegmentDefinition = {
  entryNode: { id: 'entry', type: 'Everyone' },
  nodes: [],
};

describe('segmentsService.previewSegment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the definition to the CRM proxy and returns count + sample', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { count: 7, sample: [{ id: 'c1' }, { id: 'c2' }] },
    } as never);

    const result = await segmentsService.previewSegment(definition);

    expect(api.post).toHaveBeenCalledWith('/segments/preview', { definition });
    expect(result.count).toBe(7);
    expect(result.sample).toEqual([{ id: 'c1' }, { id: 'c2' }]);
  });

  it('unwraps a { success, data } envelope when present', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { count: 3, sample: [] } },
    } as never);

    const result = await segmentsService.previewSegment(definition);

    expect(result.count).toBe(3);
    expect(result.sample).toEqual([]);
  });
});
