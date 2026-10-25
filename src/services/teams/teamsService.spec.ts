import { describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/core/api', () => ({ default: { get } }));

import TeamsService from './teamsService';

const TEAM_COUNT = 101;

describe('TeamsService.getAllTeams', () => {
  it('walks every page, keeping the sort', async () => {
    get.mockImplementation(async (_url: string, { params }: { params: { page: number; per_page: number } }) => {
      const start = (params.page - 1) * params.per_page;
      const length = Math.max(0, Math.min(params.per_page, TEAM_COUNT - start));
      return {
        data: {
          success: true,
          data: Array.from({ length }, (_, i) => ({ id: `team-${start + i + 1}`, name: `Team ${start + i + 1}` })),
          meta: { pagination: { total: TEAM_COUNT } },
        },
      };
    });

    const teams = await TeamsService.getAllTeams({ sort: 'name', order: 'asc' });

    expect(teams).toHaveLength(TEAM_COUNT);
    expect(teams[100]).toEqual({ id: 'team-101', name: 'Team 101' });
    expect(get).toHaveBeenLastCalledWith('/teams', {
      params: { sort: 'name', order: 'asc', page: 2, per_page: 100 },
    });
  });
});
