import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/services/core/apiEvoAI', () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

import { listMCPServersPage } from './mcpServerService';

const server = { id: 'mcp-1', name: 'Github' };

describe('listMCPServersPage', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('takes the total from meta.pagination, not from the page length', async () => {
    get.mockResolvedValue({
      data: { success: true, data: [server], meta: { pagination: { total: 45 } } },
    });

    await expect(listMCPServersPage({ skip: 20, limit: 20 })).resolves.toEqual({
      servers: [server],
      total: 45,
    });
    expect(get).toHaveBeenCalledWith('/mcp-servers', { params: { skip: 20, limit: 20 } });
  });

  it('falls back to the page length when the response carries no pagination', async () => {
    get.mockResolvedValue({ data: { success: true, data: [server], meta: {} } });

    await expect(listMCPServersPage()).resolves.toEqual({ servers: [server], total: 1 });
  });
});
