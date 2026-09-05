import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  WorkOrder,
  WorkOrderFormData,
  WorkOrdersListParams,
} from '@/types/orders/workOrder';

class WorkOrdersService {
  private readonly baseUrl = '/work_orders';

  async getOrders(params?: WorkOrdersListParams): Promise<WorkOrder[]> {
    try {
      const response = await api.get(this.baseUrl, { params });
      return extractResponse<WorkOrder>(response).data;
    } catch (error) {
      console.error('WorkOrdersService.getOrders error:', error);
      throw error;
    }
  }

  async getOrder(id: string): Promise<WorkOrder> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return extractData<WorkOrder>(response);
  }

  async createOrder(payload: WorkOrderFormData): Promise<WorkOrder> {
    const response = await api.post(this.baseUrl, { work_order: payload });
    return extractData<WorkOrder>(response);
  }

  async updateOrder(id: string, payload: Partial<WorkOrderFormData>): Promise<WorkOrder> {
    const response = await api.put(`${this.baseUrl}/${id}`, { work_order: payload });
    return extractData<WorkOrder>(response);
  }

  async deleteOrder(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export const workOrdersService = new WorkOrdersService();
