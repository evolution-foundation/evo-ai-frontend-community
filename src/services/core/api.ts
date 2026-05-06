import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { requestMonitor } from '@/utils/requestMonitor';
import apiAuth from '@/services/core/apiAuth';
import { applySetupInterceptor } from '@/services/core/setupInterceptor';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mirrors the auth-invalidation codes declared in
// app/models/concerns/api_error_codes.rb on the backend. Only these warrant
// killing the session on a 401 response.
const AUTH_INVALIDATION_ERROR_CODES = new Set<string>([
  'UNAUTHORIZED',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'MISSING_TOKEN',
  'INVALID_CREDENTIALS',
  'SESSION_EXPIRED',
]);

let isRefreshing = false;
let isTerminatingSession = false;
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

const terminateSession = () => {
  if (isTerminatingSession) return;
  isTerminatingSession = true;

  try {
    window.dispatchEvent(new CustomEvent('evolution:auth-lost'));
  } catch {
    // noop
  }

  useAuthStore.getState().clearUser();
};

api.interceptors.request.use(config => {
  const requestId = requestMonitor.logRequest(
    config.method?.toUpperCase() || 'GET',
    config.url || '',
  );

  (config as AxiosRequestConfig & { requestId?: string; requestStartTime?: number }).requestId = requestId;
  (config as AxiosRequestConfig & { requestId?: string; requestStartTime?: number }).requestStartTime = Date.now();

  const authHeader = useAuthStore.getState().getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader.Authorization;
  }

  if (config.data instanceof FormData && config.headers['Content-Type'] === undefined) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }

  return config;
});

api.interceptors.response.use(
  response => {
    const config = response.config as AxiosRequestConfig & { requestId?: string; requestStartTime?: number };
    if (config.requestId && config.requestStartTime) {
      const duration = Date.now() - config.requestStartTime;
      requestMonitor.logResponse(config.requestId, response.status, duration);
    }

    return response;
  },
  async error => {
    const config = (error as AxiosError).config as (AxiosRequestConfig & { requestId?: string }) | undefined;
    if (config?.requestId) {
      const errorData = (error as AxiosError).response?.data as
        | { error?: { message?: string }; message?: string }
        | undefined;
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        (error as AxiosError).message ||
        'Unknown error';
      requestMonitor.logError(config.requestId, errorMessage);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            const authHeader = useAuthStore.getState().getAuthHeader();
            if (authHeader && originalRequest.headers) {
              originalRequest.headers.Authorization = authHeader.Authorization;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await apiAuth.post('/auth/refresh');
        const refreshData = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = refreshData?.access_token || refreshData?.token?.access_token;

        if (!newAccessToken) {
          throw new Error('New token not received');
        }

        useAuthStore.getState().setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      const isUnreadCountEndpoint = error.config?.url?.includes('/unread_count');

      if (isUnreadCountEndpoint) {
        return Promise.reject(error);
      }

      // The backend uses ApiErrorCodes (see app/models/concerns/api_error_codes.rb)
      // and returns business-logic errors with their own code even when the HTTP
      // status is 401. Only treat the response as a session-invalidation 401 when
      // the body is missing a code or carries a known auth-invalidation code —
      // otherwise the global interceptor would log the user out on validation /
      // permission errors that mistakenly use 401.
      const errorCode = (
        error.response?.data as { error?: { code?: string } } | undefined
      )?.error?.code;
      const isAuthInvalidationCode =
        !errorCode ||
        AUTH_INVALIDATION_ERROR_CODES.has(errorCode);

      if (!isAuthInvalidationCode) {
        return Promise.reject(error);
      }

      terminateSession();
    }

    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

applySetupInterceptor(api);

export default api;
