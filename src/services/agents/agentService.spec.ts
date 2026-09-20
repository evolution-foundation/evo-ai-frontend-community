import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock('@/services/core/apiEvoAI', () => ({
  default: {
    get: (...args: unknown[]) => mockApi.get(...args),
    post: (...args: unknown[]) => mockApi.post(...args),
    put: (...args: unknown[]) => mockApi.put(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));

import { listApiKeys } from './agentService';

const envelope = (data: unknown) => ({ data: { success: true, data } });

// The registry lists only active keys unless `active` is sent (CRM-174): the
// default must stay untouched for the agent pickers, and an omitted option must
// send no param at all, since the server reads an empty one as "active only".
describe('agentService.listApiKeys — active filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue(envelope([]));
  });

  it('sends no active param by default (active only, server-side)', async () => {
    await listApiKeys();

    expect(mockApi.get).toHaveBeenCalledWith('/agents/apikeys', {
      params: { page: 1, pageSize: 100 },
    });
  });

  it('asks for the inactive keys with active=false', async () => {
    await listApiKeys(1, 100, { active: false });

    expect(mockApi.get).toHaveBeenCalledWith('/agents/apikeys', {
      params: { page: 1, pageSize: 100, active: 'false' },
    });
  });

  it('asks for the active keys explicitly with active=true', async () => {
    await listApiKeys(2, 50, { active: true });

    expect(mockApi.get).toHaveBeenCalledWith('/agents/apikeys', {
      params: { page: 2, pageSize: 50, active: 'true' },
    });
  });

  it('unwraps the envelope into the key list', async () => {
    mockApi.get.mockResolvedValue(envelope([{ id: 'k1', is_active: false }]));

    await expect(listApiKeys(1, 100, { active: false })).resolves.toEqual([
      { id: 'k1', is_active: false },
    ]);
  });
});
