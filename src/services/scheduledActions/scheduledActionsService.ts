import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type { ScheduledAction, CreateScheduledAction } from '@/types/automation';

class ScheduledActionsService {
  async listPage(params?: Record<string, any>): Promise<{ actions: ScheduledAction[]; total: number }> {
    const response = await api.get('/scheduled_actions', { params });
    const { data, meta } = extractResponse<ScheduledAction>(response);
    const actions = data ?? [];
    return { actions, total: meta?.pagination?.total ?? actions.length };
  }

  async get(id: string): Promise<ScheduledAction> {
    const response = await api.get(`/scheduled_actions/${id}`);
    return extractData<any>(response);
  }

  async create(payload: CreateScheduledAction): Promise<ScheduledAction> {
    const response = await api.post('/scheduled_actions', {
      scheduled_action: payload,
    });
    return extractData<any>(response);
  }

  async update(id: string, payload: Partial<CreateScheduledAction>): Promise<ScheduledAction> {
    const response = await api.patch(`/scheduled_actions/${id}`, {
      scheduled_action: payload,
    });
    return extractData<any>(response);
  }

  async cancel(id: string): Promise<void> {
    await api.delete(`/scheduled_actions/${id}`);
  }

  async listByContact(contactId: string, params?: Record<string, any>): Promise<ScheduledAction[]> {
    const response = await api.get(`/scheduled_actions/by_contact/${contactId}`, {
      params,
    });
    return extractData<any>(response);
  }

  async listByDeal(dealId: string, params?: Record<string, any>): Promise<ScheduledAction[]> {
    const response = await api.get(`/scheduled_actions/by_deal/${dealId}`, {
      params,
    });
    return extractData<any>(response);
  }
}

export const scheduledActionsService = new ScheduledActionsService();
