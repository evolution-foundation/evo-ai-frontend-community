import i18n from '@/i18n/config';
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export interface RecaptchaConfig {
  siteKey: string;
  enabled: boolean;
}

export class RecaptchaService {
  private static instance: RecaptchaService;
  private siteKey: string;
  private enabled: boolean;

  private constructor() {
    this.siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
    this.enabled = !!this.siteKey;
  }

  /**
   * Configure the service with a site key from the backend API.
   * Falls back to VITE_RECAPTCHA_SITE_KEY if no key is provided.
   */
  public configure(siteKey?: string | null): void {
    const resolvedKey = siteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
    this.siteKey = resolvedKey;
    this.enabled = !!resolvedKey;
  }

  public static getInstance(): RecaptchaService {
    if (!RecaptchaService.instance) {
      RecaptchaService.instance = new RecaptchaService();
    }
    return RecaptchaService.instance;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        resolve();
        return;
      }

      // Check if script is already loaded
      if (window.grecaptcha) {
        resolve();
        return;
      }

      // Create and append script tag
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error(i18n.t("interface:recaptcha.couldNotLoadRecaptcha")));

      document.head.appendChild(script);
    });
  }

  public async executeRecaptcha(action: string): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Ensure script is loaded
      await this.loadScript();

      return new Promise((resolve, reject) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(this.siteKey, { action });
            resolve(token);
          } catch (error) {
            console.error('reCAPTCHA execution error:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      return null;
    }
  }
}

export const recaptchaService = RecaptchaService.getInstance();

// Utility function for getting reCAPTCHA token
export async function getRecaptchaToken(action: string): Promise<string | null> {
  return recaptchaService.executeRecaptcha(action);
}
