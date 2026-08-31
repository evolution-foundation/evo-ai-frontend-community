import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';
import { activeTenantId } from '@/services/core/activeTenant';

// Dedicated axios instance for evo-flow. Only campaigns still uses it —
// segments and journeys (EVO-2191) go through the CRM proxy (`api`), which
// carries auth and the RBAC gate. Campaigns cannot follow yet: the CRM has no
// /api/v1/campaigns proxy, so campaignsService still needs this instance and
// VITE_EVOFLOW_API_URL must stay set in every deployment until it does.
// Multi-tenant evo-flow requires X-Evo-Tenant-Id on every route (the enterprise
// overlay answers 401 TENANT_REQUIRED without it); see activeTenant.ts.
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
  const tenantId = activeTenantId();
  if (tenantId) {
    config.headers['X-Evo-Tenant-Id'] = tenantId;
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
