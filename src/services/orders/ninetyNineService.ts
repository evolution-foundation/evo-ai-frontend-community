import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { NinetyNineOrder, NinetyNineWebhookInfo } from '@/types/orders/ninetyNineOrder';
import type {
  NinetyNinePartnerStatus,
  NinetyNineStoreDetails,
  NinetyNineMenuItem,
  NinetyNineBillEntry,
  NinetyNineSettlement,
  NinetyNineBoundStore,
} from '@/types/orders/ninetyNinePartner';

class NinetyNineService {
  private readonly baseUrl = '/ninety_nine';

  async getWebhookInfo(): Promise<NinetyNineWebhookInfo> {
    const response = await api.get(`${this.baseUrl}/webhook_info`);
    return extractData<NinetyNineWebhookInfo>(response);
  }

  async getOrders(): Promise<NinetyNineOrder[]> {
    const response = await api.get(`${this.baseUrl}/orders`);
    return extractData<NinetyNineOrder[]>(response);
  }

  async getPartnerStatus(): Promise<NinetyNinePartnerStatus> {
    const response = await api.get(`${this.baseUrl}/partner/status`);
    return extractData<NinetyNinePartnerStatus>(response);
  }

  async getConnectUrl(): Promise<string> {
    const response = await api.get(`${this.baseUrl}/partner/connect_url`);
    return extractData<{ url: string }>(response).url;
  }

  async getBoundStores(): Promise<NinetyNineBoundStore[]> {
    const response = await api.get(`${this.baseUrl}/partner/bound_stores`);
    return extractData<NinetyNineBoundStore[]>(response);
  }

  async getStoreDetails(): Promise<NinetyNineStoreDetails> {
    const response = await api.get(`${this.baseUrl}/partner/store`);
    return extractData<NinetyNineStoreDetails>(response);
  }

  async setStoreStatus(payload: Record<string, unknown>): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/store/status`, { payload });
    return extractData<unknown>(response);
  }

  async getMenu(): Promise<NinetyNineMenuItem[]> {
    const response = await api.get(`${this.baseUrl}/partner/menu`);
    return extractData<NinetyNineMenuItem[]>(response);
  }

  async updateItemStatus(itemId: string, status: string): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/menu/item_status`, { item_id: itemId, status });
    return extractData<unknown>(response);
  }

  async confirmOrder(orderId: string): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/orders/${orderId}/confirm`);
    return extractData<unknown>(response);
  }

  async cancelOrder(orderId: string, reasonCode: number, reason?: string): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/orders/${orderId}/cancel`, { reason_code: reasonCode, reason });
    return extractData<unknown>(response);
  }

  async readyOrder(orderId: string): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/orders/${orderId}/ready`);
    return extractData<unknown>(response);
  }

  async deliveredOrder(orderId: string): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/partner/orders/${orderId}/delivered`);
    return extractData<unknown>(response);
  }

  async getBillData(startDate: string, endDate: string): Promise<{ data: NinetyNineBillEntry[]; total_num: number }> {
    const response = await api.get(`${this.baseUrl}/partner/finance/bill`, { params: { start_date: startDate, end_date: endDate } });
    return extractData<{ data: NinetyNineBillEntry[]; total_num: number }>(response);
  }

  async getSettlementsData(startDate: string, endDate: string): Promise<{ data: NinetyNineSettlement[]; total_num: number }> {
    const response = await api.get(`${this.baseUrl}/partner/finance/settlements`, { params: { start_date: startDate, end_date: endDate } });
    return extractData<{ data: NinetyNineSettlement[]; total_num: number }>(response);
  }
}

export const ninetyNineService = new NinetyNineService();
