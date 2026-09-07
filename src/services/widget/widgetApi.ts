import i18n from '@/i18n/config';
import axios from 'axios';

// Create a separate axios instance for widget API calls
const baseURL = `${import.meta.env.VITE_API_URL}/api/v1`;
const isNgrok = baseURL.includes('ngrok');

export const widgetApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    ...(isNgrok && { 'ngrok-skip-browser-warning': 'true' }),
  },
});

// Response interceptor for token expiration handling
widgetApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle token expiration (401 with TOKEN_EXPIRED code)
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const isTokenExpired = errorCode === 'TOKEN_EXPIRED' || 
                            error.response?.data?.error?.toLowerCase().includes('expired');

      if (isTokenExpired) {
        const websiteToken = error.config?.params?.website_token;
        if (websiteToken) {
          const storageKey = `evo_widget_auth_${websiteToken}`;
          localStorage.removeItem(storageKey);
          sessionStorage.removeItem(storageKey);
        }

        // Create a custom error with a flag to indicate token expiration
        const expiredError = new Error(i18n.t("interface:widgetapi.tokenExpired"));
        (expiredError as any).isTokenExpired = true;
        (expiredError as any).websiteToken = websiteToken;
        return Promise.reject(expiredError);
      }
    }

    return Promise.reject(error);
  }
);

