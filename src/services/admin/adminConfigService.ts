import api from '../core/api';
import { extractData } from '../../utils/apiHelpers';
import type { AdminConfigData } from '../../types/admin/adminConfig';

class AdminConfigService {
  async getConfig(configType: string): Promise<AdminConfigData> {
    const response = await api.get(`/admin/app_configs/${configType}`);
    const result = extractData<{ config_type: string; configs: AdminConfigData }>(response);
    return result.configs;
  }

  async saveConfig(configType: string, data: AdminConfigData): Promise<AdminConfigData> {
    const response = await api.post(`/admin/app_configs/${configType}`, {
      app_config: data,
    });
    const result = extractData<{ config_type: string; configs: AdminConfigData }>(response);
    return result.configs;
  }

  async testConnection(configType: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/admin/app_configs/${configType}/test_connection`);
    return extractData<{ success: boolean; message: string }>(response);
  }

  async clearConfig(configType: string): Promise<void> {
    await api.delete(`/admin/app_configs/${configType}`);
  }
}

export const adminConfigService = new AdminConfigService();
