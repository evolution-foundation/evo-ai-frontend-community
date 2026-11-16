/**
 * Google Analytics 4 (GA4) Integration
 *
 * Initializes GA4 for page views and event tracking.
 * Only runs in production when VITE_GA4_MEASUREMENT_ID is configured.
 * Supports cross-domain tracking via linker configuration.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const LINKER_DOMAINS = [
  'evolution-api.com',
  'evolution-api.io',
  'evoapicloud.com',
  'evoai.app',
  'evo-ai.co',
  'evofoundation.com.br',
];

const GA4_MEASUREMENT_ID = 'G-DKSKFWQWVK';

export const initGA4 = (): void => {
  if (window.location.pathname.replace(/\/$/, '') === '/auth/reset-password') return;

  // Only initialize in production
  if (import.meta.env.DEV) {
    return;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, {
      linker: {
        domains: LINKER_DOMAINS,
      },
    });

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  } catch (error) {
    console.error('GA4: Initialization failed', error);
  }
};

/**
 * Track custom events in GA4
 */
export const gtagEvent = (
  eventName: string,
  params?: Record<string, unknown>,
): void => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};
