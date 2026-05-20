import React, { useState } from 'react';
import { Button, Card, CardContent, Badge } from '@evoapi/design-system';
import {
  AlertTriangle,
  RefreshCw,
  Facebook,
  Instagram,
  Mail,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import ChannelsService from '@/services/channels/channelsService';
import WhatsappService from '@/services/channels/whatsappService';
import InboxesService from '@/services/channels/inboxesService';
import instagramService from '@/services/channels/instagramService';
import EmailOauthService from '@/services/channels/emailOauthService';

interface AuthorizationBannersProps {
  inbox: any;
  onReauthorize: (provider: string) => void;
}

// Facebook/Instagram Reauthorization
const FacebookReauthorizeBanner: React.FC<{
  inbox: any;
  onReauthorize: () => void;
}> = ({ onReauthorize }) => {
  const { t } = useLanguage('channels');
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  const handleReauthorize = () => {
    setIsReauthorizing(true);
    onReauthorize();
    // Reset loading state after a delay (the actual process will handle completion)
    setTimeout(() => setIsReauthorizing(false), 2000);
  };

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                {t('settings.authorizationBanners.facebook.title')}
              </h3>
            </div>
            <p className="text-sm text-red-800 dark:text-red-300 mb-3">
              {t('settings.authorizationBanners.facebook.description')}
            </p>
            <Button
              onClick={handleReauthorize}
              loading={isReauthorizing}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('settings.authorizationBanners.facebook.button')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Google/Gmail Reauthorization
const GoogleReauthorizeBanner: React.FC<{
  inbox: any;
  onReauthorize: () => void;
}> = ({ onReauthorize }) => {
  const { t } = useLanguage('channels');
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  const handleReauthorize = () => {
    setIsReauthorizing(true);
    onReauthorize();
    setTimeout(() => setIsReauthorizing(false), 2000);
  };

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                {t('settings.authorizationBanners.google.title')}
              </h3>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
              {t('settings.authorizationBanners.google.description')}
            </p>
            <Button
              onClick={handleReauthorize}
              loading={isReauthorizing}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('settings.authorizationBanners.google.button')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Microsoft/Outlook Reauthorization
const MicrosoftReauthorizeBanner: React.FC<{
  inbox: any;
  onReauthorize: () => void;
}> = ({ onReauthorize }) => {
  const { t } = useLanguage('channels');
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  const handleReauthorize = () => {
    setIsReauthorizing(true);
    onReauthorize();
    setTimeout(() => setIsReauthorizing(false), 2000);
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                {t('settings.authorizationBanners.microsoft.title')}
              </h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
              {t('settings.authorizationBanners.microsoft.description')}
            </p>
            <Button
              onClick={handleReauthorize}
              loading={isReauthorizing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('settings.authorizationBanners.microsoft.button')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Instagram Duplicate Inbox Banner
const InstagramDuplicateBanner: React.FC<{
  inbox: any;
  onResolve: () => void;
}> = ({ onResolve }) => {
  const { t } = useLanguage('channels');
  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-700 dark:text-orange-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <h3 className="font-semibold text-orange-900 dark:text-orange-200">
                {t('settings.authorizationBanners.instagram.duplicate.title')}
              </h3>
            </div>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              {t('settings.authorizationBanners.instagram.duplicate.description')}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onResolve}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {t('settings.authorizationBanners.instagram.duplicate.resolveButton')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {t('settings.authorizationBanners.instagram.duplicate.detailsButton')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Success Banner (when authorization is valid)
const AuthorizationSuccessBanner: React.FC<{
  provider: string;
  lastConnected?: string;
  inbox: any;
  onReauthorize: (provider: string) => void;
}> = ({ provider, lastConnected, inbox, onReauthorize }) => {
  const { t } = useLanguage('channels');
  const config = useGlobalConfig();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSyncingSubscription, setIsSyncingSubscription] = useState(false);

  const handleSyncWhatsappSubscription = async () => {
    setIsSyncingSubscription(true);
    try {
      await InboxesService.syncWhatsappSubscription(inbox.id);
      toast.success(t('settings.authorizationBanners.success.subscriptionSynced'));
    } catch (error: any) {
      console.error('Error syncing WhatsApp subscription:', error);
      toast.error(
        error?.message || t('settings.authorizationBanners.success.subscriptionSyncError'),
      );
    } finally {
      setIsSyncingSubscription(false);
    }
  };

  const getProviderIcon = () => {
    switch (provider.toLowerCase()) {
      case 'facebook':
        return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'google':
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-500" />;
      case 'microsoft':
      case 'outlook':
        return <Mail className="w-4 h-4 text-blue-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  // Load Facebook SDK (same logic as FacebookChannelForm)
  async function loadFBsdk(appId: string) {
    if (window.FB && window.FB.getLoginStatus) {
      const currentAppId = window.FB.getAppId?.();
      if (currentAppId !== appId) {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: config.fbApiVersion || 'v21.0',
        });
      }
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        window.fbAsyncInit = function () {
          window.FB.init({
            appId: appId,
            cookie: true,
            xfbml: true,
            version: config.fbApiVersion || 'v21.0',
          });
          resolve();
        };
        const checkInterval = setInterval(() => {
          if (window.FB && window.FB.getLoginStatus) {
            clearInterval(checkInterval);
            if (window.fbAsyncInit) window.fbAsyncInit();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.FB) reject(new Error('Facebook SDK failed to load'));
        }, 10000);
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: config.fbApiVersion || 'v21.0',
        });
        resolve();
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('ScriptLoaderError'));
      document.head.appendChild(script);
    });
  }

  const handleReconnectFacebook = async () => {
    setIsReconnecting(true);
    try {
      if (!config.fbAppId) {
        toast.error(t('settings.authorizationBanners.success.facebookNotConfigured'));
        return;
      }

      await loadFBsdk(config.fbAppId);

      if (!window.FB || !window.FB.login) {
        toast.error(t('settings.authorizationBanners.success.sdkNotLoaded'));
        return;
      }

      window.FB.login(
        (response: any) => {
          // Wrap async logic in IIFE to avoid passing async function directly
          (async () => {
            if (response.status === 'connected') {
              try {
                // Use reauthorize_page endpoint (same as the old Vue implementation)
                // This endpoint handles finding the page and updating tokens automatically
                await ChannelsService.reauthorizeFacebookPage(
                  response.authResponse.accessToken,
                  inbox.id,
                );
                toast.success(t('settings.authorizationBanners.success.reconnected'));
                // Reload page to refresh connection status
                setTimeout(() => window.location.reload(), 1000);
              } catch (error: any) {
                console.error('Error reconnecting Facebook:', error);
                toast.error(
                  error?.message || t('settings.authorizationBanners.success.reconnectError'),
                );
                setIsReconnecting(false);
              }
            } else {
              setIsReconnecting(false);
              toast.error(t('settings.authorizationBanners.success.loginCancelled'));
            }
          })().catch((error: any) => {
            console.error('Error in Facebook reconnect callback:', error);
            setIsReconnecting(false);
          });
        },
        {
          scope:
            'pages_manage_metadata,business_management,pages_messaging,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_engagement',
        },
      );
    } catch (error: any) {
      console.error('Error reconnecting Facebook:', error);
      toast.error(error?.message || t('settings.authorizationBanners.success.reconnectError'));
      setIsReconnecting(false);
    }
  };

  const handleReconnectInstagram = async () => {
    setIsReconnecting(true);
    try {
      if (!config.instagramAppId) {
        toast.error(t('settings.authorizationBanners.success.instagramNotConfigured'));
        return;
      }

      // Use the same logic as InstagramForm
      const response = await instagramService.generateAuthorization();
      window.location.href = response.url;
    } catch (error: any) {
      console.error('Error reconnecting Instagram:', error);
      toast.error(error?.message || t('settings.authorizationBanners.success.reconnectError'));
      setIsReconnecting(false);
    }
  };

  const handleReconnectWhatsApp = async () => {
    setIsReconnecting(true);

    // Collect both the SDK code response and the Embedded Signup postMessage payload,
    // then trigger the actual reconnect once both are present (mirrors CloudWhatsappForm).
    let sdkCode: string | null = null;
    let signupData: { waba_id?: string; phone_number_id?: string; business_id?: string } | null =
      null;
    let finished = false;

    const finalizeReconnect = async () => {
      if (finished) return;
      if (!sdkCode || !signupData?.waba_id) return;
      finished = true;

      try {
        const { access_token, phone_number_id: backendPhoneNumberId } =
          await WhatsappService.exchangeCode({
            code: sdkCode,
            business_account_id: signupData.business_id || '',
            waba_id: signupData.waba_id,
          });

        // Prefer phone_number_id from the Embedded Signup event because the backend
        // may return a different one (first phone on the account) — same rule as
        // CloudWhatsappForm.handleConnectionSuccess.
        const phoneNumberId = signupData.phone_number_id || backendPhoneNumberId || '';

        await InboxesService.update(inbox.id, {
          channel: {
            provider_config: {
              api_key: access_token,
              phone_number_id: phoneNumberId,
              waba_id: signupData.waba_id,
            },
          },
        });

        toast.success(t('settings.authorizationBanners.success.reconnected'));
        setTimeout(() => window.location.reload(), 1000);
      } catch (error: any) {
        console.error('Error reconnecting WhatsApp:', error);
        toast.error(
          error?.message || t('settings.authorizationBanners.success.reconnectError'),
        );
      } finally {
        setIsReconnecting(false);
      }
    };

    // Listen for the Embedded Signup postMessage (waba_id / phone_number_id / business_id).
    const messageHandler = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (
          data.event === 'FINISH' ||
          data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
        ) {
          signupData = data.data;
          finalizeReconnect();
        } else if (data.event === 'CANCEL') {
          finished = true;
          window.removeEventListener('message', messageHandler);
          setIsReconnecting(false);
          toast.error(t('settings.authorizationBanners.success.loginCancelled'));
        } else if (data.event === 'ERROR') {
          finished = true;
          window.removeEventListener('message', messageHandler);
          setIsReconnecting(false);
          toast.error(
            data.data?.error_message ||
              t('settings.authorizationBanners.success.reconnectError'),
          );
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', messageHandler);

    try {
      if (!config.wpAppId || !config.wpWhatsappConfigId) {
        toast.error(t('settings.authorizationBanners.success.whatsappNotConfigured'));
        window.removeEventListener('message', messageHandler);
        setIsReconnecting(false);
        return;
      }

      await loadFBsdk(config.wpAppId);

      if (!window.FB || !window.FB.login) {
        toast.error(t('settings.authorizationBanners.success.sdkNotLoaded'));
        window.removeEventListener('message', messageHandler);
        setIsReconnecting(false);
        return;
      }

      window.FB.login(
        (response: any) => {
          if (response.authResponse?.code) {
            sdkCode = response.authResponse.code;
            finalizeReconnect();
          } else {
            window.removeEventListener('message', messageHandler);
            setIsReconnecting(false);
            toast.error(t('settings.authorizationBanners.success.loginCancelled'));
          }
        },
        {
          config_id: config.wpWhatsappConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            version: 'v3',
            featureType: 'whatsapp_business_app_onboarding',
          },
        },
      );
    } catch (error: any) {
      console.error('Error reconnecting WhatsApp:', error);
      toast.error(error?.message || t('settings.authorizationBanners.success.reconnectError'));
      window.removeEventListener('message', messageHandler);
      setIsReconnecting(false);
    }
  };

  const handleReconnectGoogle = async () => {
    setIsReconnecting(true);
    try {
      // Get email from inbox channel
      const email = inbox.channel?.email || inbox.email;
      if (!email) {
        toast.error(t('settings.authorizationBanners.success.emailRequired'));
        setIsReconnecting(false);
        return;
      }

      // Use the same logic as EmailForm
      const response = await EmailOauthService.generateGoogleAuthorization(email);
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Error reconnecting Google:', error);
      toast.error(error?.message || t('settings.authorizationBanners.success.reconnectError'));
      setIsReconnecting(false);
    }
  };

  const handleReconnectMicrosoft = async () => {
    setIsReconnecting(true);
    try {
      // Get email from inbox channel
      const email = inbox.channel?.email || inbox.email;
      if (!email) {
        toast.error(t('settings.authorizationBanners.success.emailRequired'));
        setIsReconnecting(false);
        return;
      }

      // Use the same logic as EmailForm
      const response = await EmailOauthService.generateMicrosoftAuthorization(email);
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Error reconnecting Microsoft:', error);
      toast.error(error?.message || t('settings.authorizationBanners.success.reconnectError'));
      setIsReconnecting(false);
    }
  };

  const handleReconnect = async () => {
    const providerLower = provider.toLowerCase();

    if (providerLower === 'facebook') {
      await handleReconnectFacebook();
    } else if (providerLower === 'instagram') {
      await handleReconnectInstagram();
    } else if (providerLower === 'whatsapp') {
      await handleReconnectWhatsApp();
    } else if (providerLower === 'gmail' || providerLower === 'google') {
      await handleReconnectGoogle();
    } else if (providerLower === 'microsoft' || providerLower === 'outlook') {
      await handleReconnectMicrosoft();
    } else {
      // For other providers, use the onReauthorize callback
      onReauthorize(providerLower);
    }
  };

  // Mostrar botão de reconectar apenas para providers específicos
  // Para WhatsApp, apenas mostrar se for WhatsApp Cloud (provider === 'whatsapp' e inbox.provider === 'whatsapp_cloud')
  const providerLower = provider.toLowerCase();
  const isWhatsAppCloud = providerLower === 'whatsapp' && inbox?.provider === 'whatsapp_cloud';
  const showReconnectButton =
    ['facebook', 'instagram', 'gmail', 'google', 'microsoft', 'outlook'].includes(providerLower) ||
    isWhatsAppCloud;

  return (
    <Card className="border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getProviderIcon()}
                <h3 className="font-semibold text-primary dark:text-primary">
                  {t('settings.authorizationBanners.success.connectedWith', { provider })}
                </h3>
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground dark:text-primary-foreground"
                >
                  {t('settings.authorizationBanners.success.active')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isWhatsAppCloud && (
                  <Button
                    onClick={() => {
                      handleSyncWhatsappSubscription().catch(error => {
                        console.error('Error in handleSyncWhatsappSubscription:', error);
                      });
                    }}
                    loading={isSyncingSubscription}
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('settings.authorizationBanners.success.syncSubscription')}
                  </Button>
                )}
                {showReconnectButton && (
                  <Button
                    onClick={() => {
                      handleReconnect().catch(error => {
                        console.error('Error in handleReconnect:', error);
                      });
                    }}
                    loading={isReconnecting}
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('settings.authorizationBanners.success.reconnect')}
                  </Button>
                )}
              </div>
            </div>
            {lastConnected && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.authorizationBanners.success.lastConnection', { date: lastConnected })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AuthorizationBanners: React.FC<AuthorizationBannersProps> = ({ inbox, onReauthorize }) => {
  if (!inbox) return null;

  const channelType = inbox.channel_type;
  const provider = inbox.provider;
  const reauthorizationRequired = inbox.reauthorization_required;

  // Helper function to handle reauthorization
  const handleReauthorize = (providerType: string) => {
    // Redirect to OAuth flow
    const baseUrl = window.location.origin;
    let redirectUrl = '';

    switch (providerType) {
      case 'facebook':
        redirectUrl = `${baseUrl}/api/v1/callbacks/facebook`;
        window.location.href = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${
          process.env.REACT_APP_FB_APP_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUrl,
        )}&scope=pages_manage_metadata,business_management,pages_messaging,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_engagement`;
        break;
      case 'google':
        redirectUrl = `${baseUrl}/api/v1/callbacks/google`;
        window.location.href = `https://accounts.google.com/oauth/authorize?client_id=${
          process.env.REACT_APP_GOOGLE_CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUrl,
        )}&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code`;
        break;
      case 'microsoft':
        redirectUrl = `${baseUrl}/api/v1/callbacks/microsoft`;
        window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${
          process.env.REACT_APP_MS_CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUrl,
        )}&scope=https://graph.microsoft.com/Mail.Read&response_type=code`;
        break;
      default:
        console.warn('Provider não suportado para reautorização:', providerType);
    }

    onReauthorize(providerType);
  };

  const banners = [];

  // Facebook/Instagram reauthorization
  if (
    (channelType === 'Channel::FacebookPage' || channelType === 'Channel::Instagram') &&
    reauthorizationRequired
  ) {
    banners.push(
      <FacebookReauthorizeBanner
        key="facebook-reauth"
        inbox={inbox}
        onReauthorize={() => handleReauthorize('facebook')}
      />,
    );
  }

  // Google/Gmail reauthorization
  if (channelType === 'Channel::Email' && provider === 'google' && reauthorizationRequired) {
    banners.push(
      <GoogleReauthorizeBanner
        key="google-reauth"
        inbox={inbox}
        onReauthorize={() => handleReauthorize('google')}
      />,
    );
  }

  // Microsoft/Outlook reauthorization
  if (channelType === 'Channel::Email' && provider === 'microsoft' && reauthorizationRequired) {
    banners.push(
      <MicrosoftReauthorizeBanner
        key="microsoft-reauth"
        inbox={inbox}
        onReauthorize={() => handleReauthorize('microsoft')}
      />,
    );
  }

  // Instagram duplicate detection
  if (channelType === 'Channel::Instagram' && inbox.duplicate_inbox_detected) {
    banners.push(
      <InstagramDuplicateBanner key="instagram-duplicate" inbox={inbox} onResolve={() => {}} />,
    );
  }

  // Success banners (when everything is working)
  if (!reauthorizationRequired) {
    if (channelType === 'Channel::FacebookPage') {
      banners.push(
        <AuthorizationSuccessBanner
          key="facebook-success"
          provider="Facebook"
          lastConnected={inbox.last_connected_at}
          inbox={inbox}
          onReauthorize={handleReauthorize}
        />,
      );
    } else if (channelType === 'Channel::Instagram') {
      banners.push(
        <AuthorizationSuccessBanner
          key="instagram-success"
          provider="Instagram"
          lastConnected={inbox.last_connected_at}
          inbox={inbox}
          onReauthorize={handleReauthorize}
        />,
      );
    } else if (channelType === 'Channel::Whatsapp' && provider === 'whatsapp_cloud') {
      banners.push(
        <AuthorizationSuccessBanner
          key="whatsapp-success"
          provider="WhatsApp"
          lastConnected={inbox.last_connected_at}
          inbox={inbox}
          onReauthorize={handleReauthorize}
        />,
      );
    } else if (channelType === 'Channel::Email' && provider === 'google') {
      banners.push(
        <AuthorizationSuccessBanner
          key="google-success"
          provider="Gmail"
          lastConnected={inbox.last_connected_at}
          inbox={inbox}
          onReauthorize={handleReauthorize}
        />,
      );
    } else if (channelType === 'Channel::Email' && provider === 'microsoft') {
      banners.push(
        <AuthorizationSuccessBanner
          key="microsoft-success"
          provider="Microsoft"
          lastConnected={inbox.last_connected_at}
          inbox={inbox}
          onReauthorize={handleReauthorize}
        />,
      );
    }
  }

  if (banners.length === 0) return null;

  return <div className="space-y-4">{banners}</div>;
};

export default AuthorizationBanners;
