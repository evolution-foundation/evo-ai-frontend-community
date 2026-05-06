import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  EvolutionConnectionParams,
  EvolutionAuthorizationResponse
} from '@/types/channels/inbox';

// Evolution API service aligned with Evolution Evolution integration
// Follows the same pattern as the original evolutionClient.js
const EvolutionService = {
  /**
   * Health check simples para Evolution API
   * Verifica se a URL da API está respondendo corretamente
   * Espera: {"status":200,"message":"Welcome to the Evolution API, it is working!",...}
   */
  async healthCheck(apiUrl: string): Promise<boolean> {
    try {
      const response = await api.get('/evolution/health', {
        params: { api_url: apiUrl },
      });
      return response.data?.status === 200;
    } catch (error) {
      console.error('Evolution API health check failed:', error);
      return false;
    }
  },

  async verifyConnection(
    params: EvolutionConnectionParams,
  ): Promise<EvolutionAuthorizationResponse> {
    const requestData = {
      authorization: {
        api_url: params.apiUrl,
        admin_token: params.adminToken,
        instance_name: params.instanceName,
        phone_number: params.phoneNumber,
        proxy_settings: params.proxySettings,
        instance_settings: params.instanceSettings,
      },
    };

    const response = await api.post('/evolution/authorization', requestData);
    return extractData<EvolutionAuthorizationResponse>(response);
  },

  async refreshQrCode(
    params: { apiUrl: string; apiHash: string; instanceName: string },
  ) {
    const requestData = {
      api_url: params.apiUrl,
      api_hash: params.apiHash,
      instance_name: params.instanceName,
    };

    const response = await api.post('/evolution/qrcodes', requestData);
    return extractData<any>(response);
  },

  async setProxy(
    params: { apiUrl: string; apiHash: string; instanceName: string; proxySettings: object },
  ) {
    const requestData = {
      api_url: params.apiUrl,
      api_hash: params.apiHash,
      instance_name: params.instanceName,
      proxy_settings: params.proxySettings,
    };

    const response = await api.post('/evolution/proxies', requestData);
    return extractData<any>(response);
  },

  async setSettings(
    params: { apiUrl: string; apiHash: string; instanceName: string; instanceSettings: object },
  ) {
    const requestData = {
      api_url: params.apiUrl,
      api_hash: params.apiHash,
      instance_name: params.instanceName,
      instance_settings: params.instanceSettings,
    };

    const response = await api.post('/evolution/settings', requestData);
    return extractData<any>(response);
  },

  // Settings management methods (via backend)
  async getSettings(instanceName: string) {
    const response = await api.get(`/evolution/settings/${instanceName}`);
    return extractData<any>(response);
  },

  async updateSettings(instanceName: string, settings: object) {
    const response = await api.put(`/evolution/settings/${instanceName}`, {
      settings,
    });
    return extractData<any>(response);
  },

  // QR Code management (via backend)
  async getQRCode(instanceName: string) {
    const response = await api.get(`/evolution/qrcodes/${instanceName}`);
    return extractData<any>(response);
  },

  // Instance management (via backend)
  async fetchInstances(instanceName?: string) {
    const params = instanceName ? { instanceName } : {};
    const response = await api.get('/evolution/instances', { params });
    return extractData<any>(response);
  },

  async logout(instanceName: string) {
    const response = await api.delete(`/evolution/instances/${instanceName}/logout`);
    return extractData<any>(response);
  },

  // Proxy management (via backend)
  async getProxy(instanceName: string) {
    const response = await api.get(`/evolution/proxies/${instanceName}`);
    return extractData<any>(response);
  },

  async updateProxy(instanceName: string, proxySettings: object) {
    const response = await api.put(`/evolution/proxies/${instanceName}`, {
      proxy_settings: proxySettings,
    });
    return extractData<any>(response);
  },
};

export default EvolutionService;
