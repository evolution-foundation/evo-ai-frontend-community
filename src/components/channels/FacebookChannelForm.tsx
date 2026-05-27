import { useMemo, useState } from 'react';
import { Button, Input } from '@evoapi/design-system';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import ChannelsService from '@/services/channels/channelsService';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import HubConnectButton from '@/components/inbox/HubConnectButton';

// Facebook SDK types
declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: any;
    fbSDKLoaded?: boolean;
  }
}

interface FacebookChannelFormProps {
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

export default function FacebookChannelForm({ onSuccess, onCancel }: FacebookChannelFormProps) {
  const { t } = useLanguage('messenger');
  const config = useGlobalConfig();
  const hubEnabled = config.evolutionHubEnabled === true;

  const [hasLoginStarted, setHasLoginStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [pages, setPages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [inboxName, setInboxName] = useState('');
  const [userAccessToken, setUserAccessToken] = useState('');

  const canProceed = useMemo(() => !!selected && !!inboxName, [selected, inboxName]);
  const isFacebookConfigured = useMemo(() => !!config.fbAppId, [config.fbAppId]);

  async function loadFBsdk() {
    if (!config.fbAppId) {
      console.error('[Facebook Messenger SDK] fbAppId is missing from config!');
      throw new Error('Facebook App ID not configured');
    }

    // Check if SDK is already loaded
    const existingScript = document.getElementById('facebook-jssdk');
    const sdkAlreadyLoaded = !!(window.FB && window.FB.getLoginStatus);

    if (sdkAlreadyLoaded) {
      const currentAppId = window.FB.getAppId?.();

      // Always reinitialize with Messenger App ID (fbAppId) to ensure correct app
      if (currentAppId !== config.fbAppId) {
        try {
          window.FB.init({
            appId: config.fbAppId,
            cookie: true,
            xfbml: true,
            version: config.fbApiVersion || 'v21.0',
          });
        } catch (error) {
          console.error('[Facebook Messenger SDK] Error reinitializing:', error);
          throw error;
        }
      }
      return Promise.resolve();
    }

    // SDK not loaded yet
    return new Promise<void>((resolve, reject) => {
      if (existingScript) {
        // Script exists but SDK not ready - set up our own initialization
        const originalInit = window.fbAsyncInit;
        window.fbAsyncInit = function () {
          try {
            // Call original init if it exists (for WhatsApp)
            if (originalInit && typeof originalInit === 'function') {
              originalInit();
            }
            // Then initialize with Messenger App ID
            window.FB.init({
              appId: config.fbAppId,
              cookie: true,
              xfbml: true,
              version: config.fbApiVersion || 'v21.0',
            });
            window.fbSDKLoaded = true;
            resolve();
          } catch (error) {
            console.error('[Facebook Messenger SDK] Error during FB.init:', error);
            reject(error);
          }
        };
        // Wait for SDK to load
        const checkInterval = setInterval(() => {
          if (window.FB && window.FB.getLoginStatus) {
            clearInterval(checkInterval);
            // Trigger our initialization
            if (window.fbAsyncInit) {
              window.fbAsyncInit();
            }
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.FB) {
            reject(new Error('Facebook SDK failed to load'));
          }
        }, 10000);
        return;
      }

      // Load SDK for first time
      window.fbAsyncInit = function () {
        try {
          window.FB.init({
            appId: config.fbAppId,
            cookie: true,
            xfbml: true,
            version: config.fbApiVersion || 'v21.0',
          });
          window.fbSDKLoaded = true;
          resolve();
        } catch (error) {
          console.error('[Facebook Messenger SDK] Error during FB.init:', error);
          reject(error);
        }
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('[Facebook Messenger SDK] Failed to load Facebook SDK script');
        reject(new Error('ScriptLoaderError'));
      };
      document.head.appendChild(script);
    });
  }

  const startLogin = async () => {
    if (!isFacebookConfigured) {
      toast.error(t('errors.facebookNotConfigured'));
      return;
    }

    setHasLoginStarted(true);
    setHasError(false);
    setIsLoading(true);
    setLoadingMessage(t('loadingFacebookSDK'));

    try {
      await loadFBsdk();
      setLoadingMessage(t('connectingToFacebook'));
      tryFBLogin();
    } catch (error: any) {
      console.error('[Facebook Login] Error loading Facebook SDK:', error);
      setHasError(true);
      setErrorMessage(error?.message || t('errors.sdkNotLoaded'));
      setIsLoading(false);
    }
  };

  const tryFBLogin = () => {
    if (!window.FB || !window.FB.login) {
      setTimeout(() => {
        if (window.FB && window.FB.login) {
          tryFBLogin();
        } else {
          setHasError(true);
          setErrorMessage(t('errors.sdkNotLoaded'));
          setIsLoading(false);
        }
      }, 500);
      return;
    }

    // Verify app ID matches
    const currentAppId = window.FB.getAppId?.();
    if (currentAppId && currentAppId !== config.fbAppId) {
      // Reinitialize with correct app ID
      window.FB.init({
        appId: config.fbAppId,
        cookie: true,
        xfbml: true,
        version: config.fbApiVersion || 'v21.0',
      });
    }

    window.FB.login(
      (response: any) => {
        setHasError(false);

        if (response.status === 'connected') {
          fetchPages(response.authResponse.accessToken);
        } else if (response.status === 'not_authorized') {
          setHasError(true);
          setErrorMessage(t('errors.appNotAuthorized'));
          setIsLoading(false);
        } else {
          setHasError(true);
          setErrorMessage(response.error?.message || t('errors.loginCancelled'));
          setIsLoading(false);
        }
      },
      {
        scope:
          'pages_manage_metadata,business_management,pages_messaging,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_engagement',
      },
    );
  };

  const fetchPages = async (accessToken: string) => {
    setIsLoading(true);
    setLoadingMessage(t('fetchingPages'));

    try {
      const fbPages = await ChannelsService.fetchFacebookPages(accessToken);

      const pageDetails = fbPages?.data?.page_details || [];
      const availablePages = pageDetails.filter((p: any) => !p.exists);

      setUserAccessToken(fbPages?.data?.user_access_token || accessToken);
      setPages(availablePages);
      setIsLoading(false);

      // Auto-select first available page
      if (availablePages.length > 0) {
        setSelected(availablePages[0]);
        setInboxName(availablePages[0].name);
      }
    } catch (e: any) {
      console.error('Error fetching pages:', e);
      setHasError(true);
      setErrorMessage(e?.message || t('errors.fetchPagesError'));
      setIsLoading(false);
    }
  };

  async function handleCreate() {
    if (!selected || !inboxName.trim()) {
      toast.error(t('validation.nameRequired'));
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage(t('creating'));

      const payload = {
        user_access_token: userAccessToken,
        page_access_token: selected.access_token,
        page_id: selected.id,
        inbox_name: inboxName,
      };

      const data = await ChannelsService.registerFacebookPage(payload);
      toast.success(t('success.created'));
      onSuccess(data);
    } catch (e: any) {
      toast.error(e?.message || t('errors.createChannelError'));
    } finally {
      setIsLoading(false);
    }
  }

  const handleRetry = () => {
    setHasError(false);
    setHasLoginStarted(false);
    setPages([]);
    setSelected(null);
    setInboxName('');
  };

  // Evo Hub branch — short-circuit the native Facebook OAuth flow.
  // The Hub owns the Meta authorization; the button below creates the inbox
  // via /api/v1/inboxes (via_hub: true) and opens the Hub connect page.
  if (hubEnabled) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('channelName')}
          </label>
          <Input
            placeholder={t('channelNamePlaceholder')}
            value={inboxName}
            onChange={(e) => setInboxName(e.target.value)}
          />
        </div>
        <HubConnectButton channelType="facebook_page" name={inboxName} />
        <div className="text-center">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    );
  }

  // Initial state - show login button
  if (!hasLoginStarted) {
    return (
      <div className="space-y-6" data-tour="facebook-connect">
        {/* Configuration Check */}
        {!isFacebookConfigured && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                {t('errors.facebookNotConfigured')}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t('errors.facebookConfigMessage')}
              </p>
            </div>
          </div>
        )}

        {/* Connection Info */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('connectWithFacebook')}</h3>
            <p className="text-sm text-muted-foreground">{t('connectWithFacebookDescription')}</p>
          </div>
        </div>

        {/* Login Button */}
        <div className="text-center">
          <Button
            onClick={startLogin}
            disabled={!isFacebookConfigured}
            size="lg"
            className="min-w-[200px]"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {t('signInWithFacebook')}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{t('redirectToAuthorize')}</p>
          <p className="text-xs text-muted-foreground">{t('mustBePageAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error State */}
      {hasError && (
        <div className="text-center space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
              {t('errors.connectionError')}
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
              {t('tryAgain')}
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-foreground">{loadingMessage}</span>
          </div>
        </div>
      )}

      {/* Page Selection Form */}
      {!isLoading && !hasError && pages.length > 0 && (
        <div className="space-y-6">
          {/* Page Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{t('selectPage')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('selectPageDescription', { platform: 'Messenger' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pages.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`text-left rounded-lg border transition-all ${
                    selected?.id === p.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/50'
                  } p-4`}
                >
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-sm text-muted-foreground">ID: {p.id}</div>
                  {selected?.id === p.id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t('selected')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{t('channelConfiguration')}</h4>
                <p className="text-sm text-muted-foreground">{t('channelConfigDescription')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('channelName')}
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                value={inboxName}
                onChange={e => setInboxName(e.target.value)}
                placeholder={t('channelNamePlaceholder', { platform: 'Messenger' })}
                className="h-11"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onCancel} disabled={isLoading} className="min-w-24">
              {t('newChannel.buttons.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!canProceed || isLoading} className="min-w-32">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('creating')}
                </div>
              ) : (
                t('createChannel')
              )}
            </Button>
          </div>
        </div>
      )}

      {/* No Pages Available */}
      {!isLoading && !hasError && pages.length === 0 && hasLoginStarted && (
        <div className="text-center space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              {t('errors.noPagesAvailable')}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('errors.noPagesAvailableMessage')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
