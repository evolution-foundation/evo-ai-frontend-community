import { useCallback, useRef } from 'react';

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const SDK_SCRIPT_ID = 'facebook-jssdk';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbAsyncInit?: any;
  }
}

export interface FacebookSdkInit {
  appId: string;
  version?: string;
}

/**
 * Carrega o SDK JS da Meta uma vez por página. O appId só é conhecido em runtime
 * (vem do Hub, por canal), então o init fica com o consumidor.
 */
export function useFacebookSdk() {
  const loading = useRef<Promise<void> | null>(null);

  const loadSdk = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.reject(new Error('SDK requires a browser'));
    if (window.FB) return Promise.resolve();
    if (loading.current) return loading.current;

    loading.current = new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;

      if (window.FB) {
        done();
        return;
      }

      const previousInit = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        previousInit?.();
        done();
      };

      if (existing) return;

      const script = document.createElement('script');
      script.id = SDK_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = SDK_SRC;
      script.onerror = () => {
        loading.current = null;
        reject(new Error('Facebook SDK failed to load'));
      };
      document.head.appendChild(script);
    });

    return loading.current;
  }, []);

  const initSdk = useCallback(({ appId, version }: FacebookSdkInit) => {
    window.FB?.init({
      appId,
      version: version || 'v23.0',
      xfbml: true,
      autoLogAppEvents: true,
    });
  }, []);

  return { loadSdk, initSdk };
}

export default useFacebookSdk;
