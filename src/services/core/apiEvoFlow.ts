import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

export const isEvoFlowConfigured = Boolean(import.meta.env.VITE_EVOFLOW_API_URL && !/PLACEHOLDER|undefined/.test(import.meta.env.VITE_EVOFLOW_API_URL));

// Dedicated axios instance for evo-flow (journeys, campaigns; segments
// migrated to the CRM proxy).
// Backend is single-account: no `account-id` header and no `/journeys` 401 bypass.
const evoFlowApi = axios.create({
  baseURL: `${import.meta.env.VITE_EVOFLOW_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

evoFlowApi.interceptors.request.use((config) => {
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
