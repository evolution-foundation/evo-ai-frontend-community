import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/services/core/api', () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

import { scheduledActionsService } from './scheduledActionsService';

const action = { id: 'sa-1' };

describe('scheduledActionsService.listPage', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('takes the total from meta.pagination, not from the page length', async () => {
    get.mockResolvedValue({
      data: { success: true, data: [action], meta: { pagination: { total: 45 } } },
    });

    await expect(scheduledActionsService.listPage({ page: 2, per_page: 20 })).resolves.toEqual({
      actions: [action],
      total: 45,
    });
    expect(get).toHaveBeenCalledWith('/scheduled_actions', { params: { page: 2, per_page: 20 } });
  });

  it('falls back to the page length when the response carries no pagination', async () => {
    get.mockResolvedValue({ data: { success: true, data: [action], meta: {} } });

    await expect(scheduledActionsService.listPage()).resolves.toEqual({
      actions: [action],
      total: 1,
    });
  });
});
