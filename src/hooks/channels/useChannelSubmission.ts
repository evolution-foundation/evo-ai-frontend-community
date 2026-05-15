import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';
import InboxesService from '@/services/channels/inboxesService';
import {
  ApiChannelPayload,
  EmailChannelPayload,
  SmsChannelPayload,
  SmsTwilioPayload,
  SmsBandwidthPayload,
  TelegramChannelPayload,
  WebWidgetPayload,
  WhatsappCloudPayload,
  WhatsappEvolutionGoPayload,
  WhatsappEvolutionPayload,
  WhatsappTwilioPayload,
  WhatsappNotificamePayload,
  WhatsappZapiPayload,
  Inbox,
} from '@/types/channels/inbox';
import EvolutionService from '@/services/channels/evolutionService';
import EvolutionGoService from '@/services/channels/evolutionGoService';
import EmailOauthService from '@/services/channels/emailOauthService';
import TwilioService from '@/services/channels/twilioService';
import NotificameService from '@/services/channels/notificameService';
import { ChannelType, FormData } from '@/hooks/channels/useChannelForm';
import { useChannelValidation } from '@/hooks/channels/useChannelValidation';
import { useAppDataStore } from '@/store/appDataStore';

export const useChannelSubmission = (form?: FormData) => {
  const navigate = useNavigate();
  const { validateByChannelAndProvider, getStr } = useChannelValidation();
  const { addInbox } = useAppDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [healthCheckPassed, setHealthCheckPassed] = useState<boolean | null>(null);

  const pendingInstanceRef = useRef<{
    instanceUuid: string;
    apiUrl?: string;
    adminToken?: string;
  } | null>(null);

  const cleanupPendingInstance = useCallback(() => {
    const pending = pendingInstanceRef.current;
    if (!pending) return;
    pendingInstanceRef.current = null;
    EvolutionGoService.deleteInstance(pending).catch(() => {});
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => cleanupPendingInstance();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      cleanupPendingInstance();
    };
  }, [cleanupPendingInstance]);

  // Reset health check quando a URL da API mudar
  useEffect(() => {
    if (form && form.api_url) {
      setHealthCheckPassed(null);
    }
  }, [form?.api_url]);

  const testConnection = async (
    selectedChannel: ChannelType,
    selectedProvider: ProviderType,
    form: FormData,
    config: { hasEvolutionConfig: boolean; hasEvolutionGoConfig: boolean },
  ) => {
    if (!selectedProvider || !selectedChannel) return;

    // Validate first
    if (!validateByChannelAndProvider(selectedChannel.type, selectedProvider.id, form, config)) {
      return;
    }

    setIsTesting(true);
    setHealthCheckPassed(null);
    try {
      let result: { success: boolean; error?: string; message?: string } | null = null;

      // Health check para Evolution API
      if (selectedProvider.id === 'evolution') {
        // 🔒 SECURITY: When using global config, don't send api_url/admin_token from frontend
        const useGlobalConfig = config.hasEvolutionConfig === true;

        try {
          // Build verify payload
          const verifyPayload: any = {
            instanceName: getStr(form, 'instance_name') || getStr(form, 'name'),
            phoneNumber: getStr(form, 'phone_number'),
            proxySettings: form.proxy_enabled
              ? {
                  enabled: true,
                  host: getStr(form, 'proxy_host'),
                  port: getStr(form, 'proxy_port'),
                  protocol: getStr(form, 'proxy_protocol', 'http'),
                  username: getStr(form, 'proxy_username'),
                  password: getStr(form, 'proxy_password'),
                }
              : { enabled: false },
            instanceSettings: {
              rejectCall: !!form.rejectCall,
              msgCall: getStr(form, 'msgCall', 'I do not accept calls'),
              groupsIgnore: !!form.groupsIgnore,
              alwaysOnline: !!form.alwaysOnline,
              readMessages: !!form.readMessages,
              syncFullHistory: !!form.syncFullHistory,
              readStatus: !!form.readStatus,
              enable_sync_features: !!form.enable_sync_features,
            },
          };

          // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
          if (!useGlobalConfig) {
            const apiUrl = getStr(form, 'api_url');
            if (!apiUrl) {
              toast.error('URL da API é obrigatória');
              setIsTesting(false);
              return;
            }

            // Run health check for custom URL
            const healthOk = await EvolutionService.healthCheck(apiUrl);
            if (!healthOk) {
              result = {
                success: false,
                error:
                  'Health check falhou. Verifique se a URL da Evolution API está correta e acessível.',
              };
              setHealthCheckPassed(false);
              setIsTesting(false);
              toast.error(result.error);
              return;
            }

            verifyPayload.apiUrl = apiUrl;
            verifyPayload.adminToken = getStr(form, 'admin_token');
          }

          // Backend will run health check if using global config
          await EvolutionService.verifyConnection(verifyPayload);
          result = { success: true, message: 'Conexão verificada com sucesso' };
          setHealthCheckPassed(true);
        } catch (error) {
          result = { success: false, error: (error as Error).message };
          setHealthCheckPassed(false);
        }
      } else if (selectedProvider.id === 'evolution_go') {
        // 🔒 SECURITY: When using global config, don't send api_url/admin_token from frontend
        const useGlobalConfig = config.hasEvolutionGoConfig === true;

        try {
          // Build verify payload
          const verifyPayload: any = {
            instanceName: getStr(form, 'instance_name') || getStr(form, 'name'),
            phoneNumber: getStr(form, 'phone_number'),
            mode: 'test',
            instanceSettings: {
              alwaysOnline: !!form.alwaysOnline,
              rejectCall: !!form.rejectCall,
              readMessages: !!form.readMessages,
              ignoreGroups: !!form.ignoreGroups,
              ignoreStatus: !!form.ignoreStatus,
            },
          };

          // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
          if (!useGlobalConfig) {
            const apiUrl = getStr(form, 'api_url');
            if (!apiUrl) {
              toast.error('URL da API é obrigatória');
              setIsTesting(false);
              return;
            }

            // Run health check for custom URL
            const healthOk = await EvolutionGoService.healthCheck(apiUrl);
            if (!healthOk) {
              result = {
                success: false,
                error:
                  'Health check falhou. Verifique se a URL da Evolution Go está correta e acessível.',
              };
              setHealthCheckPassed(false);
              setIsTesting(false);
              toast.error(result.error);
              return;
            }

            verifyPayload.apiUrl = apiUrl;
            verifyPayload.adminToken = getStr(form, 'admin_token');
          }

          // Backend will run health check if using global config
          await EvolutionGoService.verifyConnection(verifyPayload);
          result = { success: true, message: 'Conexão verificada com sucesso' };
          setHealthCheckPassed(true);
        } catch (error) {
          result = { success: false, error: (error as Error).message };
          setHealthCheckPassed(false);
        }
      } else if (selectedProvider.id === 'twilio' && selectedChannel.type === 'whatsapp') {
        try {
          result = await TwilioService.verifyConnection({
            accountSid: getStr(form, 'account_sid'),
            authToken: getStr(form, 'auth_token'),
            apiKeySid: form.use_api_key ? getStr(form, 'api_key_sid') : undefined,
            phoneNumber: form.use_messaging_service ? undefined : getStr(form, 'phone_number'),
            messagingServiceSid: form.use_messaging_service
              ? getStr(form, 'messaging_service_sid')
              : undefined,
          });
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
      } else if (selectedProvider.id === 'notificame') {
        try {
          result = await NotificameService.verifyConnection({
            api_token: getStr(form, 'api_token'),
            channel_id: getStr(form, 'channel_id'),
            phone_number: getStr(form, 'phone_number'),
          });
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
      }

      if (result) {
        if (result.success) {
          toast.success(result.message || 'Conexão testada com sucesso');
        } else {
          toast.error(result.error || 'Falha no teste de conexão');
        }
      }
    } catch (error) {
      toast.error((error as Error).message || 'Erro no teste de conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const submitCreate = async (
    selectedChannel: ChannelType,
    selectedProvider: ProviderType | null,
    form: FormData,
    config: any,
  ) => {
    if (!selectedChannel) return;

    // Validate fields based on channel type and provider
    if (!validateByChannelAndProvider(selectedChannel.type, selectedProvider?.id, form, config)) {
      return;
    }

    setIsSubmitting(true);
    try {
      let payload:
        | WebWidgetPayload
        | ApiChannelPayload
        | EmailChannelPayload
        | TelegramChannelPayload
        | SmsChannelPayload
        | WhatsappCloudPayload
        | WhatsappEvolutionPayload
        | WhatsappEvolutionGoPayload
        | WhatsappTwilioPayload
        | WhatsappNotificamePayload
        | WhatsappZapiPayload;

      switch (selectedChannel.type) {
        case 'web_widget': {
          payload = {
            name: getStr(form, 'name') || 'Website',
            display_name: getStr(form, 'display_name') || getStr(form, 'name') || 'Website',
            greeting_enabled: Boolean(form.greeting_enabled),
            greeting_message: getStr(form, 'greeting_message'),
            channel: {
              type: 'web_widget',
              website_url: getStr(form, 'website_url'),
              widget_color: getStr(form, 'widget_color', '#009CE0'),
              welcome_title: getStr(form, 'welcome_title'),
              welcome_tagline: getStr(form, 'welcome_tagline'),
            },
          };
          break;
        }
        case 'api': {
          payload = {
            name: getStr(form, 'name') || 'API Inbox',
            display_name: getStr(form, 'display_name') || getStr(form, 'name') || 'API Inbox',
            channel: { type: 'api', webhook_url: getStr(form, 'webhook_url') },
          };
          break;
        }
        case 'email': {
          if (!selectedProvider) throw new Error('Selecione um provedor de email');

          if (selectedProvider.id === 'google') {
            if (!(typeof config.googleOAuthClientId === 'string' && config.googleOAuthClientId)) {
              toast.error('OAuth do Google não está configurado');
              setIsSubmitting(false);
              return;
            }
            toast.info('Redirecionando para autenticação Gmail...');
            try {
              const { url } = await EmailOauthService.generateGoogleAuthorization(
                getStr(form, 'email'),
              );
              if (url) {
                window.location.href = url;
                return;
              }
              toast.error('Não foi possível iniciar o OAuth do Google');
            } catch (e: unknown) {
              toast.error((e as Error)?.message || 'Falha no OAuth do Google');
            }
            setIsSubmitting(false);
            return;
          } else if (selectedProvider.id === 'microsoft') {
            if (!(typeof config.azureAppId === 'string' && config.azureAppId)) {
              toast.error('OAuth da Microsoft não está configurado');
              setIsSubmitting(false);
              return;
            }
            toast.info('Redirecionando para autenticação Outlook...');
            try {
              const { url } = await EmailOauthService.generateMicrosoftAuthorization(
                getStr(form, 'email'),
              );
              if (url) {
                window.location.href = url;
                return;
              }
              toast.error('Não foi possível iniciar o OAuth da Microsoft');
            } catch (e: unknown) {
              toast.error((e as Error)?.message || 'Falha no OAuth da Microsoft');
            }
            setIsSubmitting(false);
            return;
          } else if (selectedProvider.id === 'other_provider') {
            payload = {
              name: getStr(form, 'name') || 'Canal Email',
              channel: {
                type: 'email',
                email: getStr(form, 'email'),
              },
            };
          } else {
            throw new Error('Provedor de email não suportado');
          }
          break;
        }
        case 'telegram': {
          payload = {
            name: getStr(form, 'name') || 'Telegram',
            channel: { type: 'telegram', bot_token: getStr(form, 'bot_token') },
          };
          break;
        }
        case 'sms': {
          if (!selectedProvider) throw new Error('Selecione um provedor SMS');

          if (selectedProvider.id === 'twilio') {
            payload = {
              name: getStr(form, 'name') || 'SMS Twilio',
              display_name: getStr(form, 'display_name') || getStr(form, 'name') || 'SMS Twilio',
              channel: {
                type: 'sms',
                provider: 'twilio',
                phone_number: form.use_messaging_service ? null : getStr(form, 'phone_number'),
                provider_config: {
                  account_sid: getStr(form, 'account_sid'),
                  auth_token: getStr(form, 'auth_token'),
                  api_key_sid: form.use_api_key ? getStr(form, 'api_key_sid') : null,
                  messaging_service_sid: form.use_messaging_service
                    ? getStr(form, 'messaging_service_sid')
                    : null,
                  medium: 'sms',
                },
              },
            } as SmsTwilioPayload;
          } else if (selectedProvider.id === 'bandwidth') {
            payload = {
              name: getStr(form, 'name') || 'SMS Bandwidth',
              display_name: getStr(form, 'display_name') || getStr(form, 'name') || 'SMS Bandwidth',
              channel: {
                type: 'sms',
                provider: 'bandwidth',
                phone_number: getStr(form, 'phone_number'),
                provider_config: {
                  api_key: getStr(form, 'api_key'),
                  api_secret: getStr(form, 'api_secret'),
                  application_id: getStr(form, 'application_id'),
                  account_id: getStr(form, 'account_id'),
                },
              },
            } as SmsBandwidthPayload;
          } else {
            throw new Error('Provedor SMS não suportado');
          }
          break;
        }
        case 'whatsapp': {
          if (!selectedProvider) throw new Error('Selecione um provedor');
          if (selectedProvider.id === 'whatsapp_cloud') {
            payload = {
              name: getStr(form, 'name') || 'WhatsApp Cloud',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Cloud',
              channel: {
                type: 'whatsapp',
                phone_number: getStr(form, 'phone_number'),
                provider: 'whatsapp_cloud',
                provider_config: {
                  api_key: getStr(form, 'api_key'),
                  phone_number_id: getStr(form, 'phone_number_id'),
                  waba_id: getStr(form, 'waba_id'),
                },
              },
            } as WhatsappCloudPayload;
          } else if (selectedProvider.id === 'twilio') {
            // verify connection first
            try {
              await TwilioService.verifyConnection({
                accountSid: getStr(form, 'account_sid'),
                authToken: getStr(form, 'auth_token'),
                apiKeySid: form.use_api_key ? getStr(form, 'api_key_sid') : undefined,
                phoneNumber: form.use_messaging_service ? undefined : getStr(form, 'phone_number'),
                messagingServiceSid: form.use_messaging_service
                  ? getStr(form, 'messaging_service_sid')
                  : undefined,
              });
            } catch (error) {
              throw new Error((error as Error).message || 'Falha na verificação do Twilio');
            }
            payload = {
              name: getStr(form, 'name') || 'WhatsApp Twilio',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Twilio',
              channel: {
                type: 'whatsapp',
                provider: 'twilio',
                phone_number: form.use_messaging_service ? '' : getStr(form, 'phone_number'),
                account_sid: getStr(form, 'account_sid'),
                auth_token: getStr(form, 'auth_token'),
                messaging_service_sid: form.use_messaging_service
                  ? getStr(form, 'messaging_service_sid')
                  : undefined,
              },
            } as WhatsappTwilioPayload;
          } else if (selectedProvider.id === 'notificame') {
            // verify connection first
            try {
              await NotificameService.verifyConnection({
                api_token: getStr(form, 'api_token'),
                channel_id: getStr(form, 'channel_id'),
                phone_number: getStr(form, 'phone_number'),
              });
            } catch (error) {
              throw new Error((error as Error).message || 'Falha na verificação do Notificame');
            }
            payload = {
              name: getStr(form, 'name') || 'WhatsApp Notificame',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Notificame',
              channel: {
                type: 'whatsapp',
                provider: 'notificame',
                phone_number: getStr(form, 'phone_number'),
                provider_config: {
                  api_token: getStr(form, 'api_token'),
                  channel_id: getStr(form, 'channel_id'),
                },
              },
            } as WhatsappNotificamePayload;
          } else if (selectedProvider.id === 'evolution') {
            // 🔒 SECURITY: When using global config, don't send api_url/admin_token from frontend
            const useGlobalConfig = config.hasEvolutionConfig === true;

            // Only run health check if NOT using global config (backend will handle it)
            if (!useGlobalConfig) {
              const apiUrl = getStr(form, 'api_url');
              if (!apiUrl) {
                throw new Error('URL da API é obrigatória');
              }

              const healthOk = await EvolutionService.healthCheck(apiUrl);
              if (!healthOk) {
                throw new Error(
                  'Health check falhou. Verifique se a URL da Evolution API está correta e acessível.',
                );
              }
            }

            // verify connection
            const verifyPayload: any = {
              instanceName: getStr(form, 'instance_name') || getStr(form, 'name'),
              phoneNumber: getStr(form, 'phone_number'),
              proxySettings: form.proxy_enabled
                ? {
                    enabled: true,
                    host: getStr(form, 'proxy_host'),
                    port: getStr(form, 'proxy_port'),
                    protocol: getStr(form, 'proxy_protocol', 'http'),
                    username: getStr(form, 'proxy_username'),
                    password: getStr(form, 'proxy_password'),
                  }
                : { enabled: false },
              instanceSettings: {
                rejectCall: !!form.rejectCall,
                msgCall: getStr(form, 'msgCall', 'I do not accept calls'),
                groupsIgnore: !!form.groupsIgnore,
                alwaysOnline: !!form.alwaysOnline,
                readMessages: !!form.readMessages,
                syncFullHistory: !!form.syncFullHistory,
                readStatus: !!form.readStatus,
                enable_sync_features: !!form.enable_sync_features,
              },
            };

            // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
            if (!useGlobalConfig) {
              verifyPayload.apiUrl = getStr(form, 'api_url');
              verifyPayload.adminToken = getStr(form, 'admin_token');
            }

            await EvolutionService.verifyConnection(verifyPayload);

            // Build final payload
            const providerConfig: any = {
              instance_name: getStr(form, 'name'),
              proxy_settings: form.proxy_enabled
                ? {
                    enabled: true,
                    host: getStr(form, 'proxy_host'),
                    port: getStr(form, 'proxy_port'),
                    protocol: getStr(form, 'proxy_protocol', 'http'),
                    username: getStr(form, 'proxy_username'),
                    password: getStr(form, 'proxy_password'),
                  }
                : { enabled: false },
              instance_settings: {
                rejectCall: !!form.rejectCall,
                msgCall: getStr(form, 'msgCall', 'I do not accept calls'),
                groupsIgnore: !!form.groupsIgnore,
                alwaysOnline: !!form.alwaysOnline,
                readMessages: !!form.readMessages,
                syncFullHistory: !!form.syncFullHistory,
                readStatus: !!form.readStatus,
                enable_sync_features: !!form.enable_sync_features,
              },
            };

            // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
            if (!useGlobalConfig) {
              providerConfig.api_url = getStr(form, 'api_url');
              providerConfig.admin_token = getStr(form, 'admin_token');
            }

            payload = {
              name: getStr(form, 'name') || 'WhatsApp Evolution',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Evolution',
              channel: {
                type: 'whatsapp',
                phone_number: getStr(form, 'phone_number'),
                provider: 'evolution',
                provider_config: providerConfig,
              },
            } as WhatsappEvolutionPayload;
          } else if (selectedProvider.id === 'evolution_go') {
            // 🔒 SECURITY: When using global config, don't send api_url/admin_token from frontend
            const useGlobalConfig = config.hasEvolutionGoConfig === true;

            // Only run health check if NOT using global config (backend will handle it)
            if (!useGlobalConfig) {
              const apiUrl = getStr(form, 'api_url');
              if (!apiUrl) {
                throw new Error('URL da API é obrigatória');
              }

              const healthOk = await EvolutionGoService.healthCheck(apiUrl);
              if (!healthOk) {
                throw new Error(
                  'Health check falhou. Verifique se a URL da Evolution Go está correta e acessível.',
                );
              }
            }

            // verify connection first
            const verifyPayload: any = {
              instanceName: getStr(form, 'instance_name') || getStr(form, 'name'),
              phoneNumber: getStr(form, 'phone_number'),
              mode: 'create',
              instanceSettings: {
                alwaysOnline: !!form.alwaysOnline,
                rejectCall: !!form.rejectCall,
                readMessages: !!form.readMessages,
                ignoreGroups: !!form.ignoreGroups,
                ignoreStatus: !!form.ignoreStatus,
              },
            };

            // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
            if (!useGlobalConfig) {
              verifyPayload.apiUrl = getStr(form, 'api_url');
              verifyPayload.adminToken = getStr(form, 'admin_token');
            }

            const verify = await EvolutionGoService.verifyConnection(verifyPayload);

            if (verify?.instance_uuid && !verify?.reused) {
              pendingInstanceRef.current = {
                instanceUuid: verify.instance_uuid,
                apiUrl: !useGlobalConfig ? getStr(form, 'api_url') : undefined,
                adminToken: !useGlobalConfig ? getStr(form, 'admin_token') : undefined,
              };
            }

            // Build final payload
            const providerConfig: any = {
              instance_name: getStr(form, 'instance_name') || getStr(form, 'name'),
              instance_uuid: verify?.instance_uuid || getStr(form, 'instance_uuid'),
              instance_token: verify?.instance_token || getStr(form, 'instance_token'),
              always_online: !!form.alwaysOnline,
              reject_call: !!form.rejectCall,
              read_messages: !!form.readMessages,
              ignore_groups: !!form.ignoreGroups,
              ignore_status: !!form.ignoreStatus,
            };

            // 🔒 SECURITY: Only send api_url/admin_token if NOT using global config
            if (!useGlobalConfig) {
              providerConfig.api_url = getStr(form, 'api_url');
              providerConfig.admin_token = getStr(form, 'admin_token');
            }

            payload = {
              name: getStr(form, 'name') || 'WhatsApp Evolution Go',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Evolution Go',
              channel: {
                type: 'whatsapp',
                phone_number: getStr(form, 'phone_number'),
                provider: 'evolution_go',
                provider_config: providerConfig,
              },
            } as WhatsappEvolutionGoPayload;
          } else if (selectedProvider.id === 'zapi') {
            payload = {
              name: getStr(form, 'name') || 'WhatsApp Z-API',
              display_name:
                getStr(form, 'display_name') || getStr(form, 'name') || 'WhatsApp Z-API',
              channel: {
                type: 'whatsapp',
                phone_number: getStr(form, 'phone_number'),
                provider: 'zapi',
                provider_config: {
                  instance_id: getStr(form, 'instance_id'),
                  token: getStr(form, 'token'),
                  client_token: getStr(form, 'client_token'),
                },
              },
            } as WhatsappZapiPayload;
          } else {
            throw new Error(`Provedor WhatsApp '${selectedProvider.id}' não implementado`);
          }
          break;
        }
        default:
          throw new Error('Tipo de canal não suportado');
      }

      // Capture and clear pending ref BEFORE createChannel so that
      // unmount during the request won't race-delete a valid instance.
      const pendingInstance = pendingInstanceRef.current;
      pendingInstanceRef.current = null;

      let response;
      try {
        response = await InboxesService.createChannel(payload);
      } catch (createError) {
        // createChannel failed — instance exists on Evolution Go but no inbox in CRM.
        if (pendingInstance) {
          EvolutionGoService.deleteInstance(pendingInstance).catch(() => {});
        }
        throw createError;
      }

      const data = (response as any)?.data ?? response;
      const createdId = data?.id;

      if (data && typeof data === 'object' && 'id' in data) {
        addInbox(data as Inbox);
      }

      toast.success('Canal criado com sucesso');
      navigate(`/channels/${createdId}/settings`);
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Falha ao criar canal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isTesting,
    testConnection,
    submitCreate,
    healthCheckPassed,
  };
};
