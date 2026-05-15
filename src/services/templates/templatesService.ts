import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  ExportableInventory,
  ExportSelection,
  ImportReport,
  TemplateMeta,
} from '@/types/templates';

class TemplatesService {
  async getExportableInventory(): Promise<ExportableInventory> {
    const response = await api.get('/templates/exportable_inventory');
    return extractData<ExportableInventory>(response);
  }

  async exportTemplates(meta: TemplateMeta, selection: ExportSelection): Promise<Blob> {
    const response = await api.post(
      '/templates/export',
      { ...meta, selection },
      { responseType: 'blob' },
    );
    return response.data as Blob;
  }

  async importTemplate(file: File): Promise<ImportReport> {
    const formData = new FormData();
    formData.append('bundle_file', file);
    const response = await api.post('/templates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<ImportReport>(response);
  }
}

export const templatesService = new TemplatesService();
