import { beforeEach, describe, expect, it, vi } from 'vitest';
import { campaignsService } from './campaignsService';
import api from '@/services/core/apiEvoFlow';
import { CampaignChannelType, CampaignStatus, CampaignType } from '@/types/campaigns';

// EVO-1838: campaignsService unwraps envelopes through the shared apiHelpers
// (extractData/extractResponse), like journeyService (EVO-1836).
//
// Two different contracts live in this file, and the difference matters:
//   - the nine single-resource methods go through extractData, which DOES have a
//     bare-body fallback — that is the robustness this card bought;
//   - getCampaigns goes through extractResponse, which does NOT (see the block
//     above those tests). It routes through the helper for consistency only.
// Every method the refactor touched is exercised below, so the suite fails if the
// refactor is reverted — not just the first one.
vi.mock('@/services/core/apiEvoFlow', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

type Verb = 'get' | 'post' | 'patch';

/** Structural view of the axios mock — the real signatures differ per verb. */
type ResolvableMock = { mockResolvedValue: (value: unknown) => unknown };
const asMock = (fn: unknown) => fn as ResolvableMock;

const CAMPAIGN = { id: 'c1', name: 'Promo' };
const EXECUTION = { workflow_id: 'w1', run_id: 'r1', message: 'started' };

const SINGLE_RESOURCE_METHODS: Array<{
  name: string;
  verb: Verb;
  args: unknown[];
  payload: unknown;
  call: () => Promise<unknown>;
}> = [
  {
    name: 'getCampaign',
    verb: 'get',
    args: ['/campaigns/c1'],
    payload: CAMPAIGN,
    call: () => campaignsService.getCampaign('c1'),
  },
  {
    name: 'createCampaign',
    verb: 'post',
    args: ['/campaigns', { name: 'New' }],
    payload: CAMPAIGN,
    call: () => campaignsService.createCampaign({ name: 'New' } as never),
  },
  {
    name: 'updateCampaign',
    verb: 'patch',
    args: ['/campaigns/c1', { name: 'Renamed' }],
    payload: CAMPAIGN,
    call: () => campaignsService.updateCampaign('c1', { name: 'Renamed' } as never),
  },
  {
    name: 'scheduleCampaign',
    verb: 'post',
    args: ['/campaigns/c1/schedule', { scheduleTo: '2026-01-01T12:00:00Z' }],
    payload: CAMPAIGN,
    call: () => campaignsService.scheduleCampaign('c1', '2026-01-01T12:00:00Z'),
  },
  {
    name: 'pauseCampaign',
    verb: 'post',
    args: ['/campaigns/c1/pause'],
    payload: CAMPAIGN,
    call: () => campaignsService.pauseCampaign('c1'),
  },
  {
    name: 'resumeCampaign',
    verb: 'post',
    args: ['/campaigns/c1/resume'],
    payload: CAMPAIGN,
    call: () => campaignsService.resumeCampaign('c1'),
  },
  {
    name: 'stopCampaign',
    verb: 'post',
    args: ['/campaigns/c1/stop'],
    payload: CAMPAIGN,
    call: () => campaignsService.stopCampaign('c1'),
  },
  {
    name: 'executeCampaign',
    verb: 'post',
    args: ['/campaigns/c1/execute'],
    payload: EXECUTION,
    call: () => campaignsService.executeCampaign('c1'),
  },
  {
    name: 'duplicateCampaign',
    verb: 'post',
    args: ['/campaigns/c1/duplicate'],
    payload: CAMPAIGN,
    call: () => campaignsService.duplicateCampaign('c1'),
  },
];

for (const { name, verb, args, payload, call } of SINGLE_RESOURCE_METHODS) {
  describe(`campaignsService.${name} — extractData contract (EVO-1838)`, () => {
    beforeEach(() => vi.clearAllMocks());

    it('unwraps the { success, data } envelope and calls the right endpoint', async () => {
      asMock(api[verb]).mockResolvedValue({ data: { success: true, data: payload } });

      const result = await call();

      expect(api[verb]).toHaveBeenCalledWith(...args);
      expect(result).toEqual(payload);
    });

    // The point of the card: a bare body (endpoint skipping the backend's
    // ResponseTransformInterceptor) must still yield the entity, not undefined.
    it('falls back to the bare body when the response is not enveloped', async () => {
      asMock(api[verb]).mockResolvedValue({ data: payload });

      expect(await call()).toEqual(payload);
    });
  });
}

describe('campaignsService.getCampaigns — extractResponse contract (EVO-1838)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves data and meta.pagination from the envelope', async () => {
    const list = [{ id: 'c1' }, { id: 'c2' }];
    asMock(api.get).mockResolvedValue({
      data: { success: true, data: list, meta: { pagination: { total: 2 } } },
    });

    const result = await campaignsService.getCampaigns();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(list);
    expect(result.meta).toEqual({ pagination: { total: 2 } });
  });

  it('serialises every list param into the query string', async () => {
    asMock(api.get).mockResolvedValue({ data: { success: true, data: [], meta: {} } });

    await campaignsService.getCampaigns({
      page: 2,
      per_page: 25,
      sort: 'created_at',
      order: 'desc',
      search: 'promo ativa',
      status: [CampaignStatus.DRAFT, CampaignStatus.SENDING],
      type: [CampaignType.SIMPLE, CampaignType.RECURRING],
      channel_type: [CampaignChannelType.WHATSAPP],
    });

    const url = vi.mocked(api.get).mock.calls[0][0] as string;
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));

    expect(url.startsWith('/campaigns?')).toBe(true);
    expect(query.get('page')).toBe('2');
    expect(query.get('per_page')).toBe('25');
    expect(query.get('sort')).toBe('created_at');
    expect(query.get('order')).toBe('desc');
    expect(query.get('search')).toBe('promo ativa');
    // Rails-style array params — the brackets are part of the key.
    expect(query.getAll('status[]')).toEqual(['0', '2']);
    expect(query.getAll('type[]')).toEqual(['simple', 'recurring']);
    expect(query.getAll('channel_type[]')).toEqual(['Channel::Whatsapp']);
  });

  it('omits params that were not provided', async () => {
    asMock(api.get).mockResolvedValue({ data: { success: true, data: [], meta: {} } });

    await campaignsService.getCampaigns();

    expect(api.get).toHaveBeenCalledWith('/campaigns?');
  });

  // extractResponse REBUILDS the envelope from four known keys instead of passing
  // the body through, so anything else the backend sends at the top level is
  // dropped and `message` is normalised to ''. No caller reads those today; this
  // pins the behaviour so a future one is not surprised.
  it('rebuilds the envelope from the four canonical keys only', async () => {
    asMock(api.get).mockResolvedValue({
      data: {
        success: true,
        data: [],
        meta: { pagination: { total: 0 } },
        requestId: 'abc-123',
      },
    });

    const result = await campaignsService.getCampaigns();

    expect(result).toEqual({
      success: true,
      data: [],
      meta: { pagination: { total: 0 } },
      message: '',
    });
    expect(result).not.toHaveProperty('requestId');
  });

  // EVO-1838 caveat — unlike extractData, extractResponse has NO bare-body
  // fallback: it reads response.data.{success,data,meta} unconditionally. So the
  // list method did NOT gain the robustness the nine single-resource methods got;
  // it goes through the helper purely for consistency with journeyService.
  // Callers guard with `response.data ?? []` (Campaigns.tsx:96,
  // CampaignFilterAutocomplete.tsx:107), so this degrades to an empty list rather
  // than a crash. Pinned here so the gap stays visible.
  it('yields an empty envelope when the body is bare — no fallback', async () => {
    asMock(api.get).mockResolvedValue({ data: [{ id: 'c1' }, { id: 'c2' }] });

    const result = await campaignsService.getCampaigns();

    expect(result.success).toBeUndefined();
    expect(result.data).toBeUndefined();
    expect(result.meta).toBeUndefined();
  });
});

// These two return the raw StandardResponse envelope on purpose: `data` is an
// object, not an array, so extractResponse would mistype it and extractData would
// strip the envelope the callers read (Campaigns.tsx:251). Pinned as a contract.
describe('campaignsService — raw envelope by contract (EVO-1838)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCampaignStats returns the raw envelope unchanged', async () => {
    const envelope = { success: true, data: { total_sent: 10, delivered: 8 } };
    asMock(api.get).mockResolvedValue({ data: envelope });

    const result = await campaignsService.getCampaignStats('c1');

    expect(api.get).toHaveBeenCalledWith('/campaigns/c1/stats');
    expect(result).toEqual(envelope);
  });

  it('bulkAction returns the raw envelope unchanged', async () => {
    const envelope = { success: true, data: { message: 'ok', affected_count: 3 } };
    asMock(api.post).mockResolvedValue({ data: envelope });

    const params = { action: 'pause', campaign_ids: ['a'] };
    const result = await campaignsService.bulkAction(params as never);

    expect(api.post).toHaveBeenCalledWith('/campaigns/bulk-action', params);
    expect(result).toEqual(envelope);
  });

  it('deleteCampaign resolves void and does not touch the body', async () => {
    asMock(api.delete).mockResolvedValue({ data: { success: true } });

    await expect(campaignsService.deleteCampaign('c1')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/campaigns/c1');
  });
});
