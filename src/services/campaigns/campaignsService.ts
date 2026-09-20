import api from '@/services/core/apiEvoFlow';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Campaign,
  CampaignsResponse,
  CampaignsListParams,
  CampaignCreateData,
  CampaignUpdateData,
  CampaignStatsResponse,
  BulkCampaignActionParams,
  BulkCampaignActionResponse,
} from '@/types/campaigns';

// EVO-1838: envelope unwrapping goes through the shared apiHelpers (extractData /
// extractResponse), like journeyService (EVO-1836). The hand-rolled response.data.data
// had no bare-body fallback and would yield undefined if an endpoint stopped passing
// through the ResponseTransformInterceptor (e.g. @SkipResponseTransform). The two
// methods that return the raw StandardResponse envelope on purpose (object `data`, not
// an array) stay as-is — extractResponse hard-types `data` as an array.
//
// Caveat worth knowing before you rely on it: only extractData has the bare-body
// fallback. extractResponse reads response.data.{success,data,meta} unconditionally,
// so getCampaigns below gains consistency with journeyService but NOT robustness.
// Hardening the shared helper is a follow-up on apiHelpers, not on this service.
class CampaignsService {
  // List campaigns with pagination and filters
  async getCampaigns(params?: CampaignsListParams): Promise<CampaignsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.search) queryParams.append('search', params.search);

    // Array parameters
    if (params?.status) {
      params.status.forEach(s => queryParams.append('status[]', s.toString()));
    }
    if (params?.type) {
      params.type.forEach(t => queryParams.append('type[]', t));
    }
    if (params?.channel_type) {
      params.channel_type.forEach(c => queryParams.append('channel_type[]', c));
    }

    const response = await api.get<CampaignsResponse>(`/campaigns?${queryParams.toString()}`);
    return extractResponse<Campaign>(response) as CampaignsResponse;
  }

  // Get single campaign
  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.get<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}`);
    return extractData<Campaign>(response);
  }

  // Create campaign
  async createCampaign(data: CampaignCreateData): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>('/campaigns', data);
    return extractData<Campaign>(response);
  }

  // Update campaign
  async updateCampaign(campaignId: string, data: CampaignUpdateData): Promise<Campaign> {
    const response = await api.patch<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}`, data);
    return extractData<Campaign>(response);
  }

  // Delete campaign
  async deleteCampaign(campaignId: string): Promise<void> {
    await api.delete(`/campaigns/${campaignId}`);
  }

  // Campaign Actions
  async scheduleCampaign(campaignId: string, scheduleDate: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(
      `/campaigns/${campaignId}/schedule`,
      { scheduleTo: scheduleDate }
    );
    return extractData<Campaign>(response);
  }

  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/pause`);
    return extractData<Campaign>(response);
  }

  async resumeCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/resume`);
    return extractData<Campaign>(response);
  }

  async stopCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/stop`);
    return extractData<Campaign>(response);
  }

  async executeCampaign(campaignId: string): Promise<{ workflow_id: string; run_id: string; message: string }> {
    const response = await api.post<{
      success: boolean;
      data: { workflow_id: string; run_id: string; message: string };
    }>(`/campaigns/${campaignId}/execute`);
    return extractData<{ workflow_id: string; run_id: string; message: string }>(response);
  }

  // Statistics — returns the raw StandardResponse envelope by contract (object `data`).
  async getCampaignStats(campaignId: string): Promise<CampaignStatsResponse> {
    const response = await api.get<CampaignStatsResponse>(`/campaigns/${campaignId}/stats`);
    return response.data;
  }

  // Bulk Actions — returns the raw StandardResponse envelope by contract (object `data`).
  async bulkAction(params: BulkCampaignActionParams): Promise<BulkCampaignActionResponse> {
    const response = await api.post<BulkCampaignActionResponse>('/campaigns/bulk-action', params);
    return response.data;
  }

  // Duplicate campaign
  async duplicateCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/duplicate`);
    return extractData<Campaign>(response);
  }
}

export const campaignsService = new CampaignsService();
