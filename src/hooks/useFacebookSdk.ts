import { useCallback, useRef } from 'react';

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const SDK_SCRIPT_ID = 'facebook-jssdk';
const SDK_LOAD_TIMEOUT_MS = 10_000;

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
 * Loads the Meta JS SDK once per page. The appId is only known at runtime
 * (it comes from the Hub, per channel), so init stays with the consumer.
 */
export function useFacebookSdk() {
  const loading = useRef<Promise<void> | null>(null);

  const loadSdk = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.reject(new Error('SDK requires a browser'));
    if (window.FB) return Promise.resolve();
    if (loading.current) return loading.current;

    loading.current = new Promise<void>((resolve, reject) => {
      // Three other components load this same script and overwrite fbAsyncInit
      // without chaining, so our resolve can be dropped. Poll for window.FB and
      // time out instead of waiting on a callback that may never fire.
      const started = Date.now();
      let timer: ReturnType<typeof setInterval> | null = null;

      const settle = (error?: Error) => {
        if (timer) clearInterval(timer);
        timer = null;
        if (error) {
          loading.current = null;
          reject(error);
        } else {
          resolve();
        }
      };

      timer = setInterval(() => {
        if (window.FB) return settle();
        if (Date.now() - started >= SDK_LOAD_TIMEOUT_MS) settle(new Error('Facebook SDK failed to load'));
      }, 100);

      const previousInit = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        previousInit?.();
        settle();
      };

      // CloudWhatsappForm injects the script without an id, so match on src too
      // or we would append a second copy of the SDK.
      const existing =
        document.getElementById(SDK_SCRIPT_ID) ?? document.querySelector(`script[src="${SDK_SRC}"]`);
      if (existing) return;

      const script = document.createElement('script');
      script.id = SDK_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = SDK_SRC;
      script.onerror = () => settle(new Error('Facebook SDK failed to load'));
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
