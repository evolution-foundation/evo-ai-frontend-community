import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

// Criar instância do axios com configurações base
const apiPublic = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/public/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador para incluir o access_token nos headers das requisições
apiPublic.interceptors.request.use((config) => {
  // Incluir o access_token nos headers se estiver disponível
  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader) {
    // Usar forma compatível com o tipo AxiosHeaders
    config.headers.Authorization = authHeader.Authorization;
  }

  // Don't override Content-Type for FormData requests. The instance default
  // sets application/json, which axios merges into config.headers before
  // this interceptor runs, so it's never actually `undefined` here — strip
  // it unconditionally so the browser can set the multipart boundary itself.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }

  return config;
});

// Interceptador para tratar respostas e erros
apiPublic.interceptors.response.use(
  response => {
    // Bearer tokens não precisam de renovação automática
    return response;
  },
  error => {
    // Se receber 401 (não autorizado), limpar dados e redirecionar
    if (error.response?.status === 401) {
      // Bypass para o endpoint unread_count - não redirecionar para login
      const isUnreadCountEndpoint = error.config?.url?.includes('/unread_count');

      if (isUnreadCountEndpoint) {
        return Promise.reject(error);
      }

      // Evitar redirecionamento se já estiver na página de login
      const isLoginPage = window.location.pathname === '/auth';
      const isOnboardingPage = window.location.pathname.startsWith('/onboarding');


      // Limpar dados de autenticação apenas se não estiver em onboarding
      if (!isOnboardingPage) {
        useAuthStore.getState().clearUser();
      }

      // Redirecionar apenas se não estiver na página de login nem onboarding
      if (!isLoginPage && !isOnboardingPage) {
        // window.location.href = '/auth?session_expired=true';
      }
    }
    return Promise.reject(error);
  },
);

applySetupInterceptor(apiPublic);

export default apiPublic;
