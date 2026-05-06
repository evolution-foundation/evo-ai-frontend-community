import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import { LabelsResponse, LabelResponse, LabelDeleteResponse, Label } from '@/types/settings';

class LabelsService {
  async getLabels(params?: { per_page?: number; page?: number }): Promise<LabelsResponse> {
    const response = await api.get('/labels', { params });
    return extractResponse<Label>(response) as LabelsResponse;
  }

  async createLabel(data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }): Promise<LabelResponse> {
    const response = await api.post('/labels', { label: data });
    return extractData<LabelResponse>(response);
  }

  async updateLabel(
    labelId: string,
    data: {
      title?: string;
      description?: string;
      color?: string;
      show_on_sidebar?: boolean;
    },
  ): Promise<LabelResponse> {
    const response = await api.patch(`/labels/${labelId}`, { label: data });
    return extractData<LabelResponse>(response);
  }

  async deleteLabel(labelId: string): Promise<LabelDeleteResponse> {
    const response = await api.delete(`/labels/${labelId}`);
    return extractData<LabelDeleteResponse>(response);
  }
}

export const labelsService = new LabelsService();
