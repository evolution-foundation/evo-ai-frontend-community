import { describe, it, expect, vi, beforeEach } from 'vitest';

// Channel/WhatsApp Settings > Collaborators (CollaboratorsForm.tsx) lists every
// account user via AgentsService.getAll(). A plain GET /users with no page
// param only returns the backend's default page (20 users), silently
// truncating the collaborator picker for any account with more than 20 users.

const getMock = vi.fn();
vi.mock('@/services/core/apiAuth', () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}));

import AgentsService from './agentsService';

const agent = (id: string) => ({ id, name: `Agent ${id}`, email: `${id}@example.com` });

beforeEach(() => {
  getMock.mockReset();
});

describe('AgentsService.getAll', () => {
  it('walks every page of /users instead of stopping at the first', async () => {
    getMock.mockImplementation((_url: string, config?: { params?: { page?: number } }) => {
      const page = config?.params?.page ?? 1;
      if (page === 1) {
        return Promise.resolve({
          data: {
            success: true,
            data: [agent('1')],
            meta: { pagination: { page: 1, page_size: 1, total: 2, total_pages: 2, has_next_page: true } },
          },
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          data: [agent('2')],
          meta: { pagination: { page: 2, page_size: 1, total: 2, total_pages: 2, has_next_page: false } },
        },
      });
    });

    const agents = await AgentsService.getAll();

    expect(agents.map(a => a.id)).toEqual(['1', '2']);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array (not a throw) when the request fails', async () => {
    getMock.mockRejectedValue(new Error('network down'));

    const agents = await AgentsService.getAll();

    expect(agents).toEqual([]);
  });
});
