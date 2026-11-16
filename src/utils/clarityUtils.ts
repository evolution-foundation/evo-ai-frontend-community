/**
 * Microsoft Clarity Analytics Integration
 *
 * Initializes Microsoft Clarity for user behavior analytics.
 * Reads project ID from backend API (via GlobalConfigContext) with VITE_CLARITY_PROJECT_ID as fallback.
 * Only runs in production with a valid project ID.
 */

declare global {
  interface Window {
    clarity?: (action: string, ...args: any[]) => void;
  }
}

export const initClarity = (configProjectId?: string | null): void => {
  if (window.location.pathname.replace(/\/$/, '') === '/auth/reset-password') return;

  const projectId = configProjectId || import.meta.env.VITE_CLARITY_PROJECT_ID;

  // Only initialize in production with valid project ID
  if (!projectId || import.meta.env.DEV) {
    return;
  }

  // Skip if Clarity is already initialized
  if (window.clarity) {
    return;
  }

  try {
    // Microsoft Clarity initialization script
    (function (
      c: any,
      l: Document,
      a: string,
      r: string,
      i: string,
      t?: HTMLScriptElement,
      y?: Element | null,
    ) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      if (y && y.parentNode) {
        y.parentNode.insertBefore(t, y);
      }
    })(window, document, 'clarity', 'script', projectId);
  } catch (error) {
    console.error('Clarity: Initialization failed', error);
  }
};

/**
 * Track custom events in Clarity
 */
export const clarityEvent = (eventName: string, ...args: any[]): void => {
  if (window.clarity) {
    window.clarity('event', eventName, ...args);
  }
};

/**
 * Set custom tags in Clarity
 */
export const clarityTag = (key: string, value: string): void => {
  if (window.clarity) {
    window.clarity('set', key, value);
  }
};

/**
 * Identify user in Clarity
 */
export const clarifyIdentify = (userId: string, customData?: Record<string, string>): void => {
  if (window.clarity) {
    window.clarity('identify', userId, customData);
  }
};
