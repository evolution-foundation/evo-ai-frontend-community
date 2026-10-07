import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/services/core/apiEvoAI', () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

import { listCustomMcpServersPage } from './customMcpServerService';

const server = { id: 'mcp-1', name: 'Github MCP' };

describe('listCustomMcpServersPage', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('takes the total from meta.pagination, not from the page length', async () => {
    get.mockResolvedValue({
      data: { success: true, data: [server], meta: { pagination: { total: 42 } } },
    });

    await expect(
      listCustomMcpServersPage({ skip: 20, limit: 20 }, { 'filters[0][values]': 'dev' }),
    ).resolves.toEqual({ servers: [server], total: 42 });
    expect(get).toHaveBeenCalledWith('/custom-mcp-servers', {
      params: { skip: 20, limit: 20, 'filters[0][values]': 'dev' },
    });
  });

  it('falls back to the page length when the response carries no pagination', async () => {
    get.mockResolvedValue({ data: { success: true, data: [server], meta: {} } });

    await expect(listCustomMcpServersPage()).resolves.toEqual({ servers: [server], total: 1 });
  });
});
