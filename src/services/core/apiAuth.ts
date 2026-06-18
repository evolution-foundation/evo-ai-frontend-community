import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { requestMonitor } from '@/utils/requestMonitor';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

// Create a separate axios instance for auth-service
// Use nginx proxy (port 3030) or direct auth service URL
const authApiBaseURL = import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3030';
const authApi = axios.create({
  baseURL: `${authApiBaseURL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

authApi.interceptors.request.use((config) => {
  // Log request for performance monitoring
  const requestId = requestMonitor.logRequest(
    config.method?.toUpperCase() || 'GET',
    config.url || ''
  );

  // Store requestId and start time in config for response interceptor
  (config as any).requestId = requestId;
  (config as any).requestStartTime = Date.now();

  const publicRoutes = [
    '/auth/sign_in',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/login',
    '/auth/register',
    '/auth/keycloak_exchange'
    // Removido '/auth/refresh' para permitir que o Authorization header seja enviado
    // Isso permite que o refresh funcione mesmo quando cookies não são compartilhados entre domínios diferentes do ngrok
  ];

  const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));

  // Para refresh, sempre tenta enviar o Authorization header se disponível (fallback quando cookie não funciona)
  const isRefreshRoute = config.url?.includes('/auth/refresh');

  // Para rotas não públicas, sempre adiciona o Authorization header se disponível
  if (!isPublicRoute) {
    const authHeader = useAuthStore.getState().getAuthHeader();
    if (authHeader) {
      config.headers.Authorization = authHeader.Authorization;
    }
  }

  // Para refresh, sempre tenta adicionar o Authorization header se disponível
  // Se não estiver disponível, o refresh tentará usar apenas o cookie
  if (isRefreshRoute) {
    const authHeader = useAuthStore.getState().getAuthHeader();

    if (authHeader) {
      config.headers.Authorization = authHeader.Authorization;
    }
  }

  return config;
});

authApi.interceptors.response.use(
  (response) => {
    // Log response for performance monitoring
    const config = response.config as any;
    if (config.requestId && config.requestStartTime) {
      const duration = Date.now() - config.requestStartTime;
      requestMonitor.logResponse(config.requestId, response.status, duration);
    }

    return response;
  },
  async (error: AxiosError) => {
    // Log error for performance monitoring
    const config = error.config as any;
    if (config?.requestId) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message || 'Unknown error';
      requestMonitor.logError(config.requestId, errorMessage);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const isPublicRoute = [
        '/auth/sign_in',
        '/auth/register',
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/validate',
        '/auth/keycloak_exchange'
      ].some(route => originalRequest.url?.includes(route));

      if (isPublicRoute) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            const authHeader = useAuthStore.getState().getAuthHeader();
            if (authHeader && originalRequest.headers) {
              originalRequest.headers.Authorization = authHeader.Authorization;
            }
            return authApi(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await authApi.post('/auth/refresh');

        // Backend retorna formato padrão: { success: true, data: { access_token, ... }, meta }
        // Usar extractData para pegar o access_token do formato padrão
        const refreshData = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = refreshData?.access_token || refreshData?.token?.access_token;

        if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);

          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          isRefreshing = false;
          return authApi(originalRequest);
        } else {
          throw new Error('New token not received');
        }
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;

        useAuthStore.getState().clearUser();

        const isLoginPage = window.location.pathname === '/auth';
        const isOnboardingPage = window.location.pathname.startsWith('/onboarding');

        if (!isLoginPage && !isOnboardingPage) {
          window.location.href = '/auth?session_expired=true';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

applySetupInterceptor(authApi);

export default authApi;
