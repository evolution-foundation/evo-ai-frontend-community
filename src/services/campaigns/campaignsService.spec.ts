import { beforeEach, describe, expect, it, vi } from 'vitest';
import { campaignsService } from './campaignsService';
import api from '@/services/core/apiEvoFlow';

// EVO-1838: campaignsService unwraps envelopes through the shared apiHelpers
// (extractData/extractResponse), like journeyService (EVO-1836) — gaining a
// bare-body fallback. The two object-envelope methods stay raw on purpose.
vi.mock('@/services/core/apiEvoFlow', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('campaignsService — envelope unwrap (EVO-1838)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCampaign unwraps the { success, data } envelope', async () => {
    const campaign = { id: 'c1', name: 'Promo' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: campaign } } as never);

    const result = await campaignsService.getCampaign('c1');

    expect(api.get).toHaveBeenCalledWith('/campaigns/c1');
    expect(result).toEqual(campaign);
  });

  it('getCampaign falls back to the raw body when there is no envelope', async () => {
    const campaign = { id: 'c1', name: 'Promo' };
    vi.mocked(api.get).mockResolvedValue({ data: campaign } as never);

    const result = await campaignsService.getCampaign('c1');

    expect(result).toEqual(campaign);
  });

  it('createCampaign unwraps the envelope', async () => {
    const campaign = { id: 'c2', name: 'New' };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: campaign } } as never);

    const result = await campaignsService.createCampaign({ name: 'New' } as never);

    expect(result).toEqual(campaign);
  });

  it('getCampaigns returns the paginated envelope shape', async () => {
    const list = [{ id: 'c1' }, { id: 'c2' }];
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: list, meta: { pagination: { total: 2 } } },
    } as never);

    const result = await campaignsService.getCampaigns();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(list);
    expect(result.meta).toEqual({ pagination: { total: 2 } });
  });

  it('getCampaignStats returns the raw envelope (object data) unchanged', async () => {
    const envelope = { success: true, data: { total_sent: 10, delivered: 8 } };
    vi.mocked(api.get).mockResolvedValue({ data: envelope } as never);

    const result = await campaignsService.getCampaignStats('c1');

    expect(result).toEqual(envelope);
  });

  it('bulkAction returns the raw envelope unchanged', async () => {
    const envelope = { success: true, data: { message: 'ok', affected_count: 3 } };
    vi.mocked(api.post).mockResolvedValue({ data: envelope } as never);

    const result = await campaignsService.bulkAction({
      action: 'pause',
      campaign_ids: ['a'],
    } as never);

    expect(result).toEqual(envelope);
  });
});
