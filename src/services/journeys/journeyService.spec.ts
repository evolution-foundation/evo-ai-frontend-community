import { beforeEach, describe, expect, it, vi } from 'vitest';
import { journeyService } from './journeyService';
import api from '@/services/core/api';

// EVO-2191: journeys now go through the CRM proxy (`api`), like segments — not the
// evo-flow-direct `apiEvoFlow`. Mock `api` accordingly.
vi.mock('@/services/core/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('journeyService session methods — envelope unwrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getJourneySessionStats unwraps the { success, data } envelope', async () => {
    const innerPayload = {
      total: 3,
      byStatus: { active: 1, waiting: 0, paused: 0, completed: 2, failed: 0, cancelled: 0 },
    };
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: innerPayload },
    } as never);

    const result = await journeyService.getJourneySessionStats('journey-1');

    expect(api.get).toHaveBeenCalledWith('/journeys/journey-1/sessions/stats');
    expect(result.data).toEqual(innerPayload);
    expect(result.data.byStatus.active).toBe(1);
  });

  it('getJourneySessionStats falls back to raw response when envelope is absent', async () => {
    const rawPayload = {
      total: 0,
      byStatus: { active: 0, waiting: 0, paused: 0, completed: 0, failed: 0, cancelled: 0 },
    };
    vi.mocked(api.get).mockResolvedValue({ data: rawPayload } as never);

    const result = await journeyService.getJourneySessionStats('journey-1');

    expect(result.data).toEqual(rawPayload);
  });

  it('getJourneySessions unwraps the envelope and surfaces the sessions array', async () => {
    const inner = { sessions: [{ id: 's-1', status: 'active' }], total: 1, page: 1, pageSize: 20 };
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: inner },
    } as never);

    const result = await journeyService.getJourneySessions('journey-1', { page: 1, pageSize: 20 });

    expect(api.get).toHaveBeenCalledWith('/journeys/journey-1/sessions', {
      params: { page: 1, pageSize: 20 },
    });
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.total).toBe(1);
  });

  it('getJourneySession unwraps the envelope for a single session lookup', async () => {
    const inner = { id: 's-1', status: 'active', journeyId: 'journey-1' };
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: inner },
    } as never);

    const result = await journeyService.getJourneySession('journey-1', 's-1');

    expect(result.data).toEqual(inner);
  });

  it('cancelJourneySession unwraps the envelope on the post response', async () => {
    const inner = { id: 's-1', status: 'cancelled' };
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: inner },
    } as never);

    const result = await journeyService.cancelJourneySession('journey-1', 's-1');

    expect(api.post).toHaveBeenCalledWith(
      '/journeys/journey-1/sessions/s-1/cancel',
      {},
    );
    expect(result.data).toEqual(inner);
  });

  it('bulkDeleteJourneySessions unwraps the envelope on the bulk delete response', async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { success: true, data: { deleted: 5 } },
    } as never);

    const result = await journeyService.bulkDeleteJourneySessions('journey-1', 'completed');

    expect(result.data.deleted).toBe(5);
  });
});

describe('journeyService variable methods — envelope unwrap (EVO-1836)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getJourneyVariables unwraps the { success, data } envelope into the variables array', async () => {
    const vars = [{ id: 'var_1', name: 'lead_score', type: 'number', defaultValue: '0' }];
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: vars },
    } as never);

    const result = await journeyService.getJourneyVariables('journey-1');

    expect(api.get).toHaveBeenCalledWith('/journeys/journey-1/variables');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toEqual(vars);
  });

  it('getJourneyVariables returns [] when the unwrapped payload is not an array', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: null },
    } as never);

    const result = await journeyService.getJourneyVariables('journey-1');

    expect(result.data).toEqual([]);
  });

  it('updateJourneyVariables returns the variables array, not the envelope object (the crash regression)', async () => {
    const vars = [{ id: 'var_1', name: 'lead_score', type: 'number', defaultValue: '0' }];
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: vars, meta: { timestamp: 'x' } },
    } as never);

    const result = await journeyService.updateJourneyVariables('journey-1', vars);

    expect(api.post).toHaveBeenCalledWith('/journeys/journey-1/variables', vars);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toEqual(vars);
  });
});

// Migration smoke: journeys must go through the CRM proxy (`api`), not the
// evo-flow-direct `apiEvoFlow` — that swap is the whole fix (EVO-2191). One
// assertion that `create` hits the CRM base path is enough; the subpath ->
// permission contract is owned and tested on the backend
// (evo-ai-crm-community spec/requests/api/v1/journeys_proxy_rbac_spec.rb, EVO-2188),
// which is where that heuristic actually runs — a frontend unit test can't verify it.
describe('CRM proxy migration (EVO-2191)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createJourney goes through the CRM proxy (api) on /journeys', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'j1' } } as never);
    await journeyService.createJourney({ name: 'x', flowData: {} as never, flowTriggers: [] as never });
    expect(api.post).toHaveBeenCalledWith('/journeys', expect.objectContaining({ name: 'x' }));
  });

  // The envelope tests above only reach 8 of the 16 calls; a leftover `apiEvoFlow`
  // in any of the others would still ship green. Drive each remaining verb and
  // assert the mocked proxy client took the call — the migration invariant, with
  // no path string pinned (the subpath -> permission mapping is the backend's).
  it.each([
    ['getJourneys', () => journeyService.getJourneys(), 'get'],
    ['getJourney', () => journeyService.getJourney('j1'), 'get'],
    ['getJourneysByTriggerType', () => journeyService.getJourneysByTriggerType('message_received'), 'get'],
    ['updateJourney', () => journeyService.updateJourney('j1', { name: 'y' }), 'patch'],
    ['deleteJourney', () => journeyService.deleteJourney('j1'), 'delete'],
    ['deleteJourneySession', () => journeyService.deleteJourneySession('j1', 's1'), 'delete'],
    ['toggleJourney', () => journeyService.toggleJourney('j1'), 'post'],
    ['duplicateJourney', () => journeyService.duplicateJourney('j1'), 'post'],
  ] as const)('%s goes through the CRM proxy (api.%s)', async (_name, call, verb) => {
    vi.mocked(api[verb]).mockResolvedValue({ data: { success: true, data: {} } } as never);

    await call();

    expect(api[verb]).toHaveBeenCalledTimes(1);
  });
});

// The proxy re-wraps evo-flow's error body and answers its own guards with shapes
// of its own, so reading `data.message` alone — what the pre-proxy service did —
// dropped every backend reason on the floor and showed the generic fallback.
describe('error surfacing through the CRM proxy (EVO-2191)', () => {
  beforeEach(() => vi.clearAllMocks());

  const rejectWith = (verb: 'get' | 'post' | 'patch' | 'delete', data: unknown) =>
    vi.mocked(api[verb]).mockRejectedValue({ response: { data } } as never);

  it('surfaces the evo-flow message the proxy wrapped in `errors`', async () => {
    rejectWith('post', { errors: { success: false, message: 'Journey name is required' } });

    await expect(
      journeyService.createJourney({ name: '', flowData: {} as never, flowTriggers: [] as never }),
    ).rejects.toThrow('Journey name is required');
  });

  it('surfaces the proxy guard message (413 oversized payload)', async () => {
    rejectWith('patch', { errors: { message: 'Journey payload is too large or too deeply nested' } });

    await expect(journeyService.updateJourney('j1', { name: 'y' })).rejects.toThrow(
      'Journey payload is too large or too deeply nested',
    );
  });

  it('surfaces the 503 raised when evo-flow is not configured on the deployment', async () => {
    rejectWith('get', {
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Journeys are unavailable: the evo-flow integration is not configured on this deployment' },
    });

    await expect(journeyService.getJourneys()).rejects.toThrow(/evo-flow integration is not configured/);
  });

  it('surfaces the RBAC 403, which the CRM renders at the top level', async () => {
    rejectWith('post', {
      error: 'Forbidden - Insufficient permissions',
      message: 'You do not have the required permissions to access this resource',
    });

    await expect(journeyService.toggleJourney('j1')).rejects.toThrow(
      'You do not have the required permissions to access this resource',
    );
  });

  it('falls back to the local message when the response carries none', async () => {
    rejectWith('delete', {});

    await expect(journeyService.deleteJourney('j1')).rejects.toThrow('Erro ao excluir jornada');
  });
});
