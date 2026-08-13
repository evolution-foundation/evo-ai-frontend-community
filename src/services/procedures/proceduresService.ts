import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Procedure,
  ProcedureFormData,
  ProcedureResponse,
  ProceduresResponse,
} from '@/types/procedures';

class ProceduresService {
  private get baseUrl(): string {
    return '/procedures';
  }

  async getProcedures(search?: string, perPage?: number): Promise<ProceduresResponse> {
    const params = {
      ...(search ? { search } : {}),
      ...(perPage ? { per_page: perPage } : {}),
    };
    const response = await api.get(this.baseUrl, { params });
    return extractResponse<Procedure>(response) as ProceduresResponse;
  }

  async getProcedure(id: string): Promise<ProcedureResponse> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return extractData<Procedure>(response);
  }

  async getPublicProcedure(token: string): Promise<ProcedureResponse> {
    const response = await api.get(`${this.baseUrl}/public/${token}`);
    return extractData<Procedure>(response);
  }

  async createProcedure(data: ProcedureFormData): Promise<ProcedureResponse> {
    if (this.requiresMultipart(data)) {
      const response = await api.post(this.baseUrl, this.toFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<Procedure>(response);
    }

    const response = await api.post(this.baseUrl, { procedure: this.toPayload(data) });
    return extractData<Procedure>(response);
  }

  async updateProcedure(id: string, data: Partial<ProcedureFormData>): Promise<ProcedureResponse> {
    if (this.requiresMultipart(data)) {
      const response = await api.patch(`${this.baseUrl}/${id}`, this.toFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<Procedure>(response);
    }

    const response = await api.patch(`${this.baseUrl}/${id}`, { procedure: this.toPayload(data) });
    return extractData<Procedure>(response);
  }

  async archiveProcedure(id: string): Promise<ProcedureResponse> {
    const response = await api.post(`${this.baseUrl}/${id}/archive`);
    return extractData<Procedure>(response);
  }

  async publishProcedure(id: string): Promise<ProcedureResponse> {
    const response = await api.post(`${this.baseUrl}/${id}/publish`);
    return extractData<Procedure>(response);
  }

  async deleteProcedure(id: string): Promise<{ id: string }> {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return extractData<{ id: string }>(response);
  }

  filterProcedures(procedures: Procedure[], query: string): Procedure[] {
    if (!query.trim()) return procedures;

    const normalized = query.toLowerCase();
    return procedures.filter(procedure =>
      [
        procedure.title,
        procedure.description,
        procedure.category,
        ...procedure.tags,
        ...procedure.content_blocks.map(block => [block.text, block.label, block.url].filter(Boolean).join(' ')),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }

  private requiresMultipart(data: Partial<ProcedureFormData>): boolean {
    return !!data.attachments?.length || !!data.removeAttachmentIds?.length;
  }

  private toPayload(data: Partial<ProcedureFormData>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'attachments' || key === 'removeAttachmentIds' || value === undefined) return;
      payload[key] = value;
    });
    return payload;
  }

  private toFormData(data: Partial<ProcedureFormData>): FormData {
    const formData = new FormData();
    const payload = this.toPayload(data);

    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        formData.append(`procedure[${key}]`, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(`procedure[${key}]`, String(value));
      }
    });

    data.attachments?.forEach(file => {
      formData.append('attachments[]', file);
    });

    data.removeAttachmentIds?.forEach(id => {
      formData.append('remove_attachment_ids[]', id);
    });

    return formData;
  }
}

export const proceduresService = new ProceduresService();
