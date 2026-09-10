import api from '@/services/core/api';

export interface MarketingAlert {
  id: string;
  kind: 'weekly_report' | 'daily_check';
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

class MarketingAlertsService {
  private readonly baseUrl = '/marketing/alerts';

  async list(): Promise<MarketingAlert[]> {
    const response = await api.get<ApiEnvelope<MarketingAlert[]>>(this.baseUrl);
    return response.data.data;
  }

  async markRead(id: string): Promise<MarketingAlert> {
    const response = await api.patch<ApiEnvelope<MarketingAlert>>(`${this.baseUrl}/${id}/mark_read`);
    return response.data.data;
  }
}

export const marketingAlertsService = new MarketingAlertsService();
