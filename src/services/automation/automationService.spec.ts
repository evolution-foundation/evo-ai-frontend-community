import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/services/core/api', () => ({
  default: { get: (...args: unknown[]) => get(...args) },
}));

import { automationService } from './automationService';

describe('automationService.getAutomations', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: { success: true, data: [], meta: {} } });
  });

  it('asks for the given page size, since the backend pages by 20 otherwise', async () => {
    await automationService.getAutomations(500);

    expect(get).toHaveBeenCalledWith('/automation_rules', { params: { per_page: 500 } });
  });
});
