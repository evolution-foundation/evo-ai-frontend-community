import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { fetchGlobalConfig } from '@/contexts/GlobalConfigContext';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

export const validFlowUrl = (value?: string | null): string | undefined => {
  if (!value || /placeholder|undefined/i.test(value)) return undefined;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return url.toString().replace(/\/$/, '');
  } catch { return undefined; }
};

export const buildFlowUrl = validFlowUrl(import.meta.env.VITE_EVOFLOW_API_URL);
export const isEvoFlowConfigured = Boolean(buildFlowUrl);

// Dedicated axios instance for evo-flow (journeys, campaigns; segments
// migrated to the CRM proxy).
// Backend is single-account: no `account-id` header and no `/journeys` 401 bypass.
const evoFlowApi = axios.create({
  baseURL: buildFlowUrl ? `${buildFlowUrl}/api/v1` : undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

evoFlowApi.interceptors.request.use(async (config) => {
  const globalConfig = await fetchGlobalConfig();
  const url = validFlowUrl(globalConfig.evoFlowPublicUrl) || buildFlowUrl;
  if (!url) throw new Error('Jornadas indisponíveis nesta instalação');
  config.baseURL = `${url}/api/v1`;
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});

evoFlowApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(error);
  }
);

applySetupInterceptor(evoFlowApi);

export default evoFlowApi;
