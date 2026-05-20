import api from '@/services/core/apiEvoFlow';
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
    return response.data;
  }

  // Get single campaign
  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.get<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}`);
    return response.data.data;
  }

  // Create campaign
  async createCampaign(data: CampaignCreateData): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>('/campaigns', data);
    return response.data.data;
  }

  // Update campaign
  async updateCampaign(campaignId: string, data: CampaignUpdateData): Promise<Campaign> {
    const response = await api.patch<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}`, data);
    return response.data.data;
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
    return response.data.data;
  }

  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/pause`);
    return response.data.data;
  }

  async resumeCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/resume`);
    return response.data.data;
  }

  async stopCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/stop`);
    return response.data.data;
  }

  async executeCampaign(campaignId: string): Promise<{ workflow_id: string; run_id: string; message: string }> {
    const response = await api.post<{
      success: boolean;
      data: { workflow_id: string; run_id: string; message: string };
    }>(`/campaigns/${campaignId}/execute`);
    return response.data.data;
  }

  // Statistics
  async getCampaignStats(campaignId: string): Promise<CampaignStatsResponse> {
    const response = await api.get<CampaignStatsResponse>(`/campaigns/${campaignId}/stats`);
    return response.data;
  }

  // Bulk Actions
  async bulkAction(params: BulkCampaignActionParams): Promise<BulkCampaignActionResponse> {
    const response = await api.post<BulkCampaignActionResponse>('/campaigns/bulk-action', params);
    return response.data;
  }

  // Duplicate campaign
  async duplicateCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post<{ success: boolean; data: Campaign }>(`/campaigns/${campaignId}/duplicate`);
    return response.data.data;
  }
}

export const campaignsService = new CampaignsService();
