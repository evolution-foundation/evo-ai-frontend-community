import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import { CrmForm, CrmFormPayload, FormLead, PaginationMeta } from '@/types/crmForms';

/**
 * Service para o CRUD admin de formulários de captura de lead (B14.04 / EVO-1841).
 * Usa o client autenticado e consome /api/v1/crm_forms (entregue no B14.01).
 */
class CrmFormsService {
  private readonly baseUrl = '/crm_forms';

  async list(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    published?: boolean;
  }): Promise<{ data: CrmForm[]; meta: { pagination?: PaginationMeta } }> {
    const response = await api.get(this.baseUrl, { params });
    const env = extractResponse<CrmForm>(response);
    return { data: env.data, meta: env.meta };
  }

  async create(payload: CrmFormPayload): Promise<CrmForm> {
    const response = await api.post(this.baseUrl, { crm_form: payload });
    return extractData<{ data: CrmForm }>(response).data;
  }

  async update(id: string, payload: CrmFormPayload): Promise<CrmForm> {
    const response = await api.patch(`${this.baseUrl}/${id}`, { crm_form: payload });
    return extractData<{ data: CrmForm }>(response).data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async getLeads(id: string): Promise<{ leads: FormLead[]; count: number }> {
    const response = await api.get(`${this.baseUrl}/${id}/leads`);
    const env = extractResponse<FormLead>(response);
    return { leads: env.data, count: (env.meta?.count as number) ?? env.data.length };
  }
}

export const crmFormsService = new CrmFormsService();
export default crmFormsService;
