import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { labelsService } from './labelsService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function apiResponse(data: unknown): AxiosResponse {
  return { data } as AxiosResponse;
}

// The service unwraps the {success, data} envelope, so every write must resolve to
// the payload itself; only the paginated read keeps the envelope for its meta.
describe('labelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateLabel resolves to the unwrapped label', async () => {
    vi.mocked(api.patch).mockResolvedValue(
      apiResponse({ success: true, data: { id: 'l-1', title: 'VIP', color: '#fff' } }),
    );

    const label = await labelsService.updateLabel('l-1', { title: 'VIP' });

    expect(label.id).toBe('l-1');
    expect(label.title).toBe('VIP');
  });

  it('createLabel resolves to the unwrapped label', async () => {
    vi.mocked(api.post).mockResolvedValue(
      apiResponse({ success: true, data: { id: 'l-2', title: 'Novo', color: '#000' } }),
    );

    const label = await labelsService.createLabel({ title: 'Novo', color: '#000' });

    expect(label.id).toBe('l-2');
    expect(label.title).toBe('Novo');
  });

  it('deleteLabel resolves to the deleted id payload', async () => {
    vi.mocked(api.delete).mockResolvedValue(apiResponse({ success: true, data: { id: 'l-3' } }));

    const result = await labelsService.deleteLabel('l-3');

    expect(result.id).toBe('l-3');
  });

  it('getLabels keeps the full envelope for pagination', async () => {
    vi.mocked(api.get).mockResolvedValue(
      apiResponse({
        success: true,
        data: [{ id: 'l-1', title: 'VIP' }],
        meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
      }),
    );

    const response = await labelsService.getLabels();

    expect(response.data).toHaveLength(1);
    expect(response.meta.pagination.total).toBe(1);
  });
});
