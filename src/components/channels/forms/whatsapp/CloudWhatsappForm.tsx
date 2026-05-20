import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import WhatsappService from '@/services/channels/whatsappService';
import { FormField } from '../../shared/FormField';
import { FormSection } from '../../shared/FormSection';
import { sanitizeInboxName } from '@/utils/sanitizeName';
import { PhoneInput } from '@/components/shared/PhoneInput';

// FB in window
declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: any;
  }
}

interface CloudWhatsappFormProps {
  form: Record<string, string | boolean>;
  onFormChange: (key: string, value: string | boolean) => void;
  canFB: boolean;
}

export const CloudWhatsappForm = ({ form, onFormChange, canFB }: CloudWhatsappFormProps) => {
  const { t } = useLanguage('whatsapp');
  const config = useGlobalConfig();

  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fbSDKReady, setFbSDKReady] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [sdkResponse, setSdkResponse] = useState<any>(null);

  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  const handleDisplayNameChange = (value: string) => {
    onFormChange('display_name', value);
    onFormChange('name', sanitizeInboxName(value));
  };

  const handleClearFields = () => {
    onFormChange('name', '');
    onFormChange('phone_number', '');
    onFormChange('api_key', '');
    onFormChange('phone_number_id', '');
    onFormChange('business_account_id', '');
    onFormChange('waba_id', '');
    setIsAutoFilled(false);
    setSessionInfo(null);
    setSdkResponse(null);
  };

  // Load Facebook SDK on component mount
  useEffect(() => {
    // The SDK initializes with wpAppId — if the GlobalConfig response hasn't
    // arrived yet (context races with initial render), bail. When config
    // hydrates, wpAppId/wpApiVersion become truthy and the effect re-runs.
    if (canFB && config.wpAppId) {
      loadFacebookSDK();
    }
  }, [canFB, config.wpAppId, config.wpApiVersion]);

  // Listen for Facebook postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          setSessionInfo(data);

          if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            // const { phone_number_id, waba_id, business_id } = data.data;
          } else if (data.event === 'CANCEL') {
            // const { current_step } = data.data;
            toast.error(t('cloudWhatsappForm.errors.connectionCanceled'));
            setIsLoading(false);
          } else if (data.event === 'ERROR') {
            const { error_message } = data.data;
            console.error('Error', error_message);
            toast.error(error_message || t('cloudWhatsappForm.errors.connectionFailed'));
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [t]);

  // Synchronize sessionInfo and sdkResponse
  useEffect(() => {
    if (sessionInfo && sdkResponse && sdkResponse.authResponse && sdkResponse.authResponse.code) {
      if (
        sessionInfo.event === 'FINISH' ||
        sessionInfo.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
      ) {
        const { phone_number_id, waba_id, business_id } = sessionInfo.data;
        const code = sdkResponse.authResponse.code;

        handleConnectionSuccess({
          phone_number_id: phone_number_id || '',
          waba_id: waba_id || '',
          business_id: business_id || '',
          code: code || '',
        });
      }
    }
  }, [sessionInfo, sdkResponse]);

  // Reset states when auto-filled state changes
  useEffect(() => {
    if (!isAutoFilled) {
      setSessionInfo(null);
      setSdkResponse(null);
    }
  }, [isAutoFilled]);

  const loadFacebookSDK = () => {
    // Check if SDK is already fully loaded
    if (window.FB && window.FB.getLoginStatus) {
      setFbSDKReady(true);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="sdk.js"]');
    if (existingScript) {
      // Script exists but may not be ready yet, wait for fbAsyncInit
      if (!window.fbAsyncInit) {
        window.fbAsyncInit = function () {
          window.FB.init({
            appId: config.wpAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: config.wpApiVersion || 'v23.0',
          });
          setFbSDKReady(true);
        };
      }
      return;
    }

    // Load Facebook SDK for first time
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: config.wpAppId,
        autoLogAppEvents: true,
        xfbml: true,
        version: config.wpApiVersion || 'v23.0',
      });
      setFbSDKReady(true);
    };

    // Create script element — no crossOrigin; Facebook's CDN doesn't emit the
    // CORS headers required by crossOrigin='anonymous' and the browser would
    // block the script load entirely.
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => {
      toast.error(t('cloudWhatsappForm.errors.sdkNotLoaded'));
    };
    document.head.appendChild(script);
  };

  const handleConnectionSuccess = async (data: {
    phone_number_id: string;
    waba_id: string;
    business_id?: string;
    code: string;
  }) => {
    try {
      setIsLoading(true);

      // Step 1: Exchange code for access token and get channel data
      const payload = {
        code: data.code,
        business_account_id: data.business_id || '',
        waba_id: data.waba_id,
      };

      const result = await WhatsappService.exchangeCode(payload);

      // Step 2: Auto-fill form with received data
      onFormChange(
        'name',
        result.inbox_name || t('cloudWhatsappForm.fields.channelName.placeholder'),
      );
      onFormChange('phone_number', result.phone_number?.replace(/\s+/g, '').replace('-', '') || '');
      onFormChange('api_key', result.access_token || '');
      // Prioritize the phone_number_id directly from the Meta Embedded Signup event (data.phone_number_id)
      // because the backend (result.phone_number_id) might return a different number (e.g. the first one on the account)
      onFormChange('phone_number_id', data.phone_number_id || result.phone_number_id || '');
      onFormChange('business_account_id', result.business_account_id || '');
      onFormChange('waba_id', result.waba_id || '');
      setIsAutoFilled(true);

      toast.success(t('cloudWhatsappForm.success.dataObtained'));
    } catch (error: any) {
      console.error('Error in handleConnectionSuccess:', error);
      toast.error(
        error?.response?.data?.error ||
        error.message ||
        t('cloudWhatsappForm.errors.connectionFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    if (!window.FB) {
      toast.error(t('cloudWhatsappForm.errors.sdkNotLoaded'));
      return;
    }

    setIsLoading(true);

    const fbLoginCallback = (response: any) => {
      setSdkResponse(response);
      if (response.authResponse) {
        // const code = response.authResponse.code;
        // Don't process here - wait for useEffect to synchronize with sessionInfo
      } else {
        toast.error(t('cloudWhatsappForm.errors.loginCanceled'));
        setIsLoading(false);
      }
    };

    // Launch Facebook login
    window.FB.login(fbLoginCallback, {
      config_id: config.wpWhatsappConfigId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        version: 'v3',
        featureType: 'whatsapp_business_app_onboarding',
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Facebook Login Button */}
      {canFB && !isAutoFilled && (
        <FormSection
          title={t('cloudWhatsappForm.facebookIntegration.title')}
          className="bg-blue-50/10 border-blue-200/20"
          data-tour="whatsapp-cloud-connect"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={!fbSDKReady || isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t('cloudWhatsappForm.facebookIntegration.connecting')}</span>
                </>
              ) : !fbSDKReady ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t('cloudWhatsappForm.facebookIntegration.loadingSDK')}</span>
                </>
              ) : (
                <span>{t('cloudWhatsappForm.facebookIntegration.connectButton')}</span>
              )}
            </button>
            <p className="mt-4 text-sm text-sidebar-foreground/70">
              {t('cloudWhatsappForm.facebookIntegration.description')}
            </p>
          </div>
        </FormSection>
      )}

      {/* Auto-filled notice */}
      {isAutoFilled && (
        <FormSection
          title={t('cloudWhatsappForm.autoFilled.title')}
          className="bg-green-50/10 border-green-200/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-sidebar-foreground/70">
                {t('cloudWhatsappForm.autoFilled.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearFields}
              className="ml-4 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              {t('cloudWhatsappForm.autoFilled.clearButton')}
            </button>
          </div>
        </FormSection>
      )}

      {/* Basic Information */}
      <div data-tour="whatsapp-cloud-credentials">
      <FormField
        label={t('cloudWhatsappForm.fields.displayName.label')}
        value={getStr('display_name')}
        onChange={handleDisplayNameChange}
        placeholder={t('cloudWhatsappForm.fields.displayName.placeholder')}
        required
      />

      <FormField
        label={t('cloudWhatsappForm.fields.channelName.label')}
        value={getStr('name')}
        onChange={value => onFormChange('name', value)}
        placeholder={t('cloudWhatsappForm.fields.channelName.placeholder')}
        required
        readOnly
      />

      <div>
        <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
          {t('cloudWhatsappForm.fields.phoneNumber.label')} <span className="text-destructive">*</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder={t('cloudWhatsappForm.fields.phoneNumber.placeholder')}
          defaultCountry="BR"
          disabled={isAutoFilled}
        />
      </div>

      {/* Campos sensíveis removidos da UI - são preenchidos automaticamente via Facebook OAuth */}
      {/* api_key, phone_number_id, business_account_id, waba_id são mantidos no form state mas não exibidos */}
      </div>
    </div>
  );
};
