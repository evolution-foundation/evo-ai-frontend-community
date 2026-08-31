import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import { LabelsResponse, Label } from '@/types/settings';

class LabelsService {
  async getLabels(params?: { per_page?: number; page?: number }): Promise<LabelsResponse> {
    const response = await api.get('/labels', { params });
    return extractResponse<Label>(response) as LabelsResponse;
  }

  // extractData strips the {success, data} envelope, so the write methods below
  // are typed as the payload — typing them as the envelope makes callers unwrap twice.
  async createLabel(data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }): Promise<Label> {
    const response = await api.post('/labels', { label: data });
    return extractData<Label>(response);
  }

  async updateLabel(
    labelId: string,
    data: {
      title?: string;
      description?: string;
      color?: string;
      show_on_sidebar?: boolean;
    },
  ): Promise<Label> {
    const response = await api.patch(`/labels/${labelId}`, { label: data });
    return extractData<Label>(response);
  }

  async deleteLabel(labelId: string): Promise<{ id: string }> {
    const response = await api.delete(`/labels/${labelId}`);
    return extractData<{ id: string }>(response);
  }
}

export const labelsService = new LabelsService();
