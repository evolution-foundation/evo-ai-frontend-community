import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/services/core/apiEvoAI', () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

import { listCustomToolsPage } from './customToolsService';

const tool = { id: 't-1', name: 'Weather' };

describe('listCustomToolsPage', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('takes the total from meta.pagination, not from the page length', async () => {
    get.mockResolvedValue({
      data: { success: true, data: [tool], meta: { pagination: { total: 45 } } },
    });

    await expect(
      listCustomToolsPage({ skip: 20, limit: 20 }, { 'filters[0][values]': 'api' }),
    ).resolves.toEqual({ tools: [tool], total: 45 });
    expect(get).toHaveBeenCalledWith('/custom-tools', {
      params: { skip: 20, limit: 20, 'filters[0][values]': 'api' },
    });
  });

  it('falls back to the page length when the response carries no pagination', async () => {
    get.mockResolvedValue({ data: { success: true, data: [tool], meta: {} } });

    await expect(listCustomToolsPage()).resolves.toEqual({ tools: [tool], total: 1 });
  });
});
