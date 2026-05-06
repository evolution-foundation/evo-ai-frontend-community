import { useState } from 'react';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

export interface ChannelType {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: 'web_widget' | 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'sms' | 'email' | 'api';
  providers?: ProviderType[];
}

export interface FormData {
  [key: string]: string | boolean;
}

export const useChannelForm = () => {
  const config = useGlobalConfig();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [form, setForm] = useState<FormData>({});

  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  const updateForm = (updates: Partial<FormData>) => {
    setForm(prev => {
      const filteredUpdates: FormData = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredUpdates[key] = value;
        }
      });
      return { ...prev, ...filteredUpdates };
    });
  };

  const handleChannelSelect = (channel: ChannelType) => {
    setSelectedChannel(channel);
    setSelectedProvider(null);

    // Set defaults based on channel type
    if (channel.type === 'web_widget') {
      setForm({
        name: 'Website',
        website_url: '',
        widget_color: '#009CE0',
        welcome_title: '',
        welcome_tagline: '',
        greeting_enabled: false,
        greeting_message: '',
      });
    } else {
      setForm({});
    }
  };

  const handleProviderSelect = (provider: ProviderType) => {
    setSelectedProvider(provider);

    // Apply provider-specific defaults
    if (!provider) return;

    switch (provider.id) {
      case 'whatsapp_cloud':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'WhatsApp Cloud',
          phone_number: prev.phone_number || '',
          api_key: prev.api_key || '',
          phone_number_id: prev.phone_number_id || '',
          business_account_id: prev.business_account_id || '',
          waba_id: prev.waba_id || '',
        }));
        break;

      case 'evolution':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'WhatsApp Evolution',
          phone_number: prev.phone_number || '',
          // 🔒 SECURITY: Don't pre-fill api_url from config (it's not exposed anymore)
          api_url: prev.api_url || '',
          admin_token: prev.admin_token || '',
          // Proxy defaults - exact same as Evolution.vue
          proxy_enabled: prev.proxy_enabled ?? false,
          proxy_host: prev.proxy_host || '',
          proxy_port: prev.proxy_port || '',
          proxy_protocol: prev.proxy_protocol || 'http',
          proxy_username: prev.proxy_username || '',
          proxy_password: prev.proxy_password || '',
          // Instance settings defaults - exact same as Evolution.vue
          rejectCall: prev.rejectCall ?? true,
          msgCall: prev.msgCall || 'I do not accept calls',
          groupsIgnore: prev.groupsIgnore ?? false,
          alwaysOnline: prev.alwaysOnline ?? true,
          readMessages: prev.readMessages ?? false,
          syncFullHistory: prev.syncFullHistory ?? false,
          readStatus: prev.readStatus ?? false,
          enable_sync_features: prev.enable_sync_features ?? true,
        }));
        break;

      case 'evolution_go':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'WhatsApp Evolution Go',
          phone_number: prev.phone_number || '',
          // 🔒 SECURITY: Don't pre-fill api_url from config (it's not exposed anymore)
          api_url: prev.api_url || '',
          admin_token: prev.admin_token || '',
          instance_name: prev.instance_name || prev.name || '',
          // Evolution Go instance settings defaults
          alwaysOnline: prev.alwaysOnline ?? true,
          rejectCall: prev.rejectCall ?? true,
          readMessages: prev.readMessages ?? true,
          ignoreGroups: prev.ignoreGroups ?? false,
          ignoreStatus: prev.ignoreStatus ?? true,
          // Optional returns from verify
          instance_uuid: prev.instance_uuid || '',
          instance_token: prev.instance_token || '',
        }));
        break;

      case 'twilio':
        if (selectedChannel?.type === 'whatsapp') {
          setForm(prev => ({
            ...prev,
            name: prev.name || 'WhatsApp Twilio',
            phone_number: prev.phone_number || '',
            account_sid: prev.account_sid || '',
            auth_token: prev.auth_token || '',
            api_key_sid: prev.api_key_sid || '',
            messaging_service_sid: prev.messaging_service_sid || '',
            use_messaging_service: prev.use_messaging_service ?? false,
            use_api_key: prev.use_api_key ?? false,
          }));
        } else if (selectedChannel?.type === 'sms') {
          setForm(prev => ({
            ...prev,
            name: prev.name || 'SMS Twilio',
            phone_number: prev.phone_number || '',
            account_sid: prev.account_sid || '',
            auth_token: prev.auth_token || '',
            api_key_sid: prev.api_key_sid || '',
            messaging_service_sid: prev.messaging_service_sid || '',
            use_messaging_service: prev.use_messaging_service ?? false,
            use_api_key: prev.use_api_key ?? false,
          }));
        }
        break;

      case 'notificame':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'WhatsApp Notificame',
          phone_number: prev.phone_number || '',
          api_token: prev.api_token || '',
          channel_id: prev.channel_id || '',
        }));
        break;

      case 'zapi':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'WhatsApp Z-API',
          phone_number: prev.phone_number || '',
          instance_id: prev.instance_id || '',
          token: prev.token || '',
          client_token: prev.client_token || '',
        }));
        break;

      case 'bandwidth':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'SMS Bandwidth',
          phone_number: prev.phone_number || '',
          api_key: prev.api_key || '',
          api_secret: prev.api_secret || '',
          application_id: prev.application_id || '',
          account_id: prev.account_id || '',
        }));
        break;

      case 'google':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'Email Gmail',
          email: prev.email || '',
          access_token: prev.access_token || '',
          refresh_token: prev.refresh_token || '',
        }));
        break;

      case 'microsoft':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'Email Outlook',
          email: prev.email || '',
          access_token: prev.access_token || '',
          refresh_token: prev.refresh_token || '',
        }));
        break;

      case 'other_provider':
        setForm(prev => ({
          ...prev,
          name: prev.name || 'Canal Email',
          email: prev.email || '',
        }));
        break;

      default:
        break;
    }
  };

  const resetForm = () => {
    setSelectedChannel(null);
    setSelectedProvider(null);
    setForm({});
  };

  const goBack = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
      return true; // indica que voltou um nível
    }
    if (selectedChannel) {
      setSelectedChannel(null);
      return true; // indica que voltou um nível
    }
    return false; // indica que deve sair da página
  };

  return {
    // State
    selectedChannel,
    selectedProvider,
    form,

    // Getters
    getStr,

    // Actions
    updateForm,
    handleChannelSelect,
    handleProviderSelect,
    setSelectedChannel,
    setSelectedProvider,
    resetForm,
    goBack,

    // Config helpers — derived from backend `hasXxxConfig` booleans, which share
    // the `IntegrationRequirements` source of truth with the admin save endpoint.
    hasEvolutionConfig: config.hasEvolutionConfig === true,
    hasEvolutionGoConfig: config.hasEvolutionGoConfig === true,
    canFB: config.hasFacebookConfig === true,
    canWpCloud: config.hasWhatsappConfig === true,
    canIG: config.hasInstagramConfig === true,
    canTwitter: config.hasTwitterConfig === true,
    canEmailGoogle: typeof config.googleOAuthClientId === 'string' && config.googleOAuthClientId.length > 0,
    canEmailMicrosoft: typeof config.azureAppId === 'string' && config.azureAppId.length > 0,
    config,
  };
};
