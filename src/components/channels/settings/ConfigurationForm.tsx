import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Card,
  CardContent,
  Input,
  Button,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import {
  Key,
  Settings,
  Shield,
  Mail,
  Phone,
  Copy,
  CheckCircle,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { EvolutionApiService, ZapiService } from '@/services/channels/channelConfigurationService';
import InboxesService from '@/services/channels/inboxesService';

interface ConfigurationFormProps {
  inboxId: string;
  inbox: any;
  onUpdate: (data: any) => Promise<void>;
}

// API Channel Configuration
const APIChannelConfig: React.FC<{
  inbox: any;
  onUpdate: (data: any) => void;
}> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');
  const [hmacMandatory, setHmacMandatory] = useState(inbox.hmac_mandatory || false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleHmacToggle = async (enabled: boolean) => {
    setHmacMandatory(enabled);
    setIsUpdating(true);

    try {
      await onUpdate({
        channel: {
          hmac_mandatory: enabled,
        },
      });
      toast.success(t('settings.configuration.api.hmac.success.updated'));
    } catch (error) {
      console.error('Erro ao atualizar HMAC:', error);
      toast.error(t('settings.configuration.api.hmac.errors.updateError'));
      setHmacMandatory(!enabled); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.api.hmac.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.configuration.api.hmac.description')}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <Switch
                  checked={hmacMandatory}
                  onCheckedChange={handleHmacToggle}
                  disabled={isUpdating}
                />
                <label className="text-sm font-medium">
                  {hmacMandatory
                    ? t('settings.configuration.api.hmac.enabled')
                    : t('settings.configuration.api.hmac.disabled')}
                </label>
              </div>

              {hmacMandatory && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t('settings.configuration.api.hmac.active')}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {t('settings.configuration.api.hmac.activeDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// WhatsApp Channel Configuration
const WhatsAppChannelConfig: React.FC<{
  inbox: any;
  onUpdate: (data: any) => void;
}> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');
  const [markAsRead, setMarkAsRead] = useState(inbox.provider_config?.mark_as_read ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setMarkAsRead(inbox.provider_config?.mark_as_read ?? true);
  }, [inbox]);

  const handleUpdateMarkAsRead = async (enabled: boolean) => {
    setMarkAsRead(enabled);
    setIsUpdating(true);
    try {
      await onUpdate({
        channel: {
          provider_config: {
            ...inbox.provider_config,
            mark_as_read: enabled,
          },
        },
      });
      toast.success(t('settings.configuration.api.markAsRead.success.updated'));
    } catch (error) {
      console.error('Erro ao atualizar marcar como lido:', error);
      toast.error(t('settings.configuration.api.markAsRead.errors.updateError'));
      setMarkAsRead(!enabled); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  const copyApiKey = () => {
    if (inbox.provider_config?.api_key) {
      navigator.clipboard.writeText(inbox.provider_config.api_key);
      toast.success(t('settings.configuration.api.keys.success.copied'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Current API Key */}
      {inbox.provider_config?.api_key && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Key className="w-5 h-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.api.keys.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('settings.configuration.api.keys.description')}
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-sm">
                    {showApiKey
                      ? inbox.provider_config.api_key
                      : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey
                      ? t('settings.configuration.api.keys.hide')
                      : t('settings.configuration.api.keys.show')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyApiKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as Read */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.api.markAsRead.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.configuration.api.markAsRead.description')}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <Switch
                  checked={markAsRead}
                  onCheckedChange={handleUpdateMarkAsRead}
                  disabled={isUpdating}
                />
                <label className="text-sm font-medium">
                  {markAsRead
                    ? t('settings.configuration.api.markAsRead.enabled')
                    : t('settings.configuration.api.markAsRead.disabled')}
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Privacy Settings Component for Evolution
const EvolutionPrivacySettings: React.FC<{
  instanceName: string;
  provider: string;
}> = ({ instanceName, provider }) => {
  const { t } = useLanguage('channels');
  const [privacySettings, setPrivacySettings] = useState({
    readreceipts: 'all',
    profile: 'all',
    status: 'contacts',
    online: 'all',
    last: 'contacts',
    groupadd: 'all',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load privacy settings on mount
  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const response = await EvolutionApiService.fetchPrivacySettings(instanceName, provider);
        // Handle Evolution Go API response format: { data: { data: { GroupAdd, LastSeen, ... } } }
        const privacyData = response?.data?.data || response?.data || {};

        setPrivacySettings({
          readreceipts:
            privacyData.ReadReceipts ||
            privacyData.readReceipts ||
            privacyData.readreceipts ||
            'all',
          profile: privacyData.Profile || privacyData.profile || 'all',
          status: privacyData.Status || privacyData.status || 'contacts',
          online: privacyData.Online || privacyData.online || 'all',
          last: privacyData.LastSeen || privacyData.lastSeen || privacyData.last || 'contacts',
          groupadd: privacyData.GroupAdd || privacyData.groupAdd || privacyData.groupadd || 'all',
        });
      } catch (error) {
        console.error('Erro ao carregar configurações de privacidade:', error);
      }
    };

    loadPrivacySettings();
  }, [instanceName, provider]);

  const handlePrivacyUpdate = async (setting: string, value: string) => {
    setIsLoading(true);
    try {
      const updatedSettings = { ...privacySettings, [setting]: value };

      // Map frontend keys to Evolution Go API format (camelCase)
      const apiPayload: any = {
        groupAdd: updatedSettings.groupadd,
        lastSeen: updatedSettings.last,
        status: updatedSettings.status,
        profile: updatedSettings.profile,
        readReceipts: updatedSettings.readreceipts,
        online: updatedSettings.online,
      };

      // For Evolution Go, include callAdd (not used in Evolution)
      if (provider === 'evolution_go') {
        apiPayload.callAdd = updatedSettings.groupadd; // Default to same as groupadd
      }

      await EvolutionApiService.updatePrivacySettings(instanceName, apiPayload, provider);
      setPrivacySettings(updatedSettings);
      toast.success(t('settings.configuration.whatsapp.instance.privacy.success.updated'));
    } catch (error: any) {
      console.error(`Erro ao atualizar ${setting}:`, error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.privacy.errors.updateError', { setting }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Per-field privacy options — each field has different valid values per provider
  // evolution (Baileys): WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue, WAReadReceiptsValue
  // evolution_go: subset without contact_blacklist, no 'none' for groupadd
  const opt = (values: string[]) =>
    values.map(v => ({
      value: v,
      label: t(
        `settings.configuration.whatsapp.instance.privacy.options.${
          v === 'contact_blacklist'
            ? 'contactBlacklist'
            : v === 'match_last_seen'
              ? 'matchLastSeen'
              : v
        }`,
      ),
    }));

  const privacyFieldOptions: Record<string, { value: string; label: string }[]> =
    provider === 'evolution_go'
      ? {
          readreceipts: opt(['all', 'none']),
          profile: opt(['all', 'contacts', 'none']),
          status: opt(['all', 'contacts', 'none']),
          online: opt(['all', 'match_last_seen']),
          last: opt(['all', 'contacts', 'none']),
          groupadd: opt(['all', 'contacts', 'none']),
        }
      : {
          // evolution (Baileys): types WAReadReceiptsValue, WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue
          readreceipts: opt(['all', 'none']),
          profile: opt(['all', 'contacts', 'contact_blacklist', 'none']),
          status: opt(['all', 'contacts', 'contact_blacklist', 'none']),
          online: opt(['all', 'match_last_seen']),
          last: opt(['all', 'contacts', 'contact_blacklist', 'none']),
          groupadd: opt(['all', 'contacts', 'contact_blacklist']),
        };

  return (
    <div className="space-y-6">
      {/* Read Receipts */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.readReceipts')}
        </label>
        <Select
          value={privacySettings.readreceipts}
          onValueChange={value => handlePrivacyUpdate('readreceipts', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.readreceipts.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Profile Picture Visibility */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.profilePicture')}
        </label>
        <Select
          value={privacySettings.profile}
          onValueChange={value => handlePrivacyUpdate('profile', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.profile.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Visibility */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.status')}
        </label>
        <Select
          value={privacySettings.status}
          onValueChange={value => handlePrivacyUpdate('status', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.status.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Online Visibility */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.online')}
        </label>
        <Select
          value={privacySettings.online}
          onValueChange={value => handlePrivacyUpdate('online', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.online.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Last Seen */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.lastSeen')}
        </label>
        <Select
          value={privacySettings.last}
          onValueChange={value => handlePrivacyUpdate('last', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.last.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group Add Permission */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('settings.configuration.whatsapp.instance.privacy.groupAdd')}
        </label>
        <Select
          value={privacySettings.groupadd}
          onValueChange={value => handlePrivacyUpdate('groupadd', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyFieldOptions.groupadd.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Evolution WhatsApp Configuration
const EvolutionWhatsAppConfig: React.FC<{
  inbox: any;
  onUpdate: (data: any) => void;
}> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');
  const [instanceSettings, setInstanceSettings] = useState({
    rejectCall: true,
    msgCall: 'Não aceito chamadas',
    groupsIgnore: false,
    alwaysOnline: true,
    readMessages: false,
    syncFullHistory: false,
    readStatus: false,
  });
  const [profileSettings, setProfileSettings] = useState({
    profileName: '',
    profileStatus: '',
    profilePictureUrl: '',
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState({
    apiUrl: (inbox?.provider_config?.api_url as string) || '',
    // Never pre-populate adminToken — avoids exposing the secret in the DOM value attribute.
    // The field is only sent if the user explicitly types a new value.
    adminToken: '',
  });
  const [isUpdatingConnection, setIsUpdatingConnection] = useState(false);

  const handleUpdateConnectionSettings = async () => {
    if (!connectionSettings.apiUrl.trim()) {
      toast.error(t('settings.configuration.whatsapp.instance.connection.errors.apiUrlRequired'));
      return;
    }
    setIsUpdatingConnection(true);
    try {
      await onUpdate({
        channel: {
          provider_config: {
            ...inbox.provider_config,
            api_url: connectionSettings.apiUrl.trim(),
            ...(connectionSettings.adminToken.trim()
              ? { admin_token: connectionSettings.adminToken.trim() }
              : {}),
          },
        },
      });
      toast.success(t('settings.configuration.whatsapp.instance.connection.success.updated'));
    } catch (error) {
      console.error('Erro ao atualizar configurações de conexão:', error);
      toast.error(t('settings.configuration.whatsapp.instance.connection.errors.updateError'));
    } finally {
      setIsUpdatingConnection(false);
    }
  };

  const getIdentifier = () => {
    const providerConfig = inbox?.provider_config || {};
    if (inbox?.provider === 'evolution_go') {
      return (
        providerConfig.instance_uuid ||
        providerConfig.instance_id ||
        providerConfig.instanceId ||
        providerConfig.instance_name ||
        null
      );
    }

    return (
      providerConfig.instance_name ||
      providerConfig.instanceName ||
      providerConfig.instance ||
      inbox?.name ||
      null
    );
  };

  // Load instance settings on mount
  useEffect(() => {
    const loadInstanceSettings = async () => {
      try {
        const provider = inbox.provider;
        const isEvolutionGo = provider === 'evolution_go';
        const identifier = getIdentifier();

        if (!identifier) return;

        const response = await EvolutionApiService.getSettings(identifier, provider);

        // Extract settings from nested data structure (similar to Vue components)
        const settings = response?.data?.data || response?.data || response;

        if (settings) {
          if (isEvolutionGo) {
            // Evolution Go settings mapping
            // Note: ignoreStatus true means ignore status (don't read), so readStatus is the opposite
            const ignoreStatus = settings.ignoreStatus ?? settings.ignore_status ?? true;
            setInstanceSettings({
              rejectCall: settings.rejectCall ?? settings.reject_call ?? true,
              msgCall: settings.msgCall || settings.msg_call || 'Não aceito chamadas',
              groupsIgnore: settings.ignoreGroups ?? settings.ignore_groups ?? false, // Evolution Go uses ignoreGroups
              alwaysOnline: settings.alwaysOnline ?? settings.always_online ?? true,
              readMessages: settings.readMessages ?? settings.read_messages ?? true,
              syncFullHistory: false, // Evolution Go doesn't have this
              readStatus: !ignoreStatus, // Invert ignoreStatus to readStatus
            });
          } else {
            // Evolution (normal) settings mapping
            setInstanceSettings({
              rejectCall: settings.rejectCall ?? true,
              msgCall: settings.msgCall || 'Não aceito chamadas',
              groupsIgnore: settings.groupsIgnore ?? false,
              alwaysOnline: settings.alwaysOnline ?? true,
              readMessages: settings.readMessages ?? false,
              syncFullHistory: settings.syncFullHistory ?? false,
              readStatus: settings.readStatus ?? false,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações da instância:', error);
        // Keep default values on error
      }
    };

    loadInstanceSettings();

    // Load profile settings for Evolution Go
    const loadProfileSettings = async () => {
      try {
        if (inbox.provider !== 'evolution_go') return;
        const identifier = getIdentifier();
        if (!identifier) return;

        const response = await EvolutionApiService.getProfile(identifier, inbox.provider);
        const profileData = response?.data || response;
        if (profileData) {
          setProfileSettings(prev => ({
            ...prev,
            profileName: profileData.profileName || prev.profileName,
          }));
        }
      } catch (error) {
        console.error('Error loading profile settings:', error);
      }
    };

    loadProfileSettings();
  }, [inbox.provider, inbox.provider_config, inbox.name]);

  // Load instance status on mount and poll while modal is open
  useEffect(() => {
    const loadInstanceStatus = async () => {
      try {
        const provider = inbox.provider;
        const identifier = getIdentifier();

        if (!identifier) return;

        const response = await EvolutionApiService.getInstances(identifier, provider);
        if (response?.data?.instance?.state) {
          const newStatus = response.data.instance.state;
          setInstanceStatus(newStatus);

          // Close modal and show success if connected
          if (newStatus === 'open' && showQrModal) {
            setShowQrModal(false);
            setQrCode(null);
            toast.success(t('settings.configuration.whatsapp.instance.success.connected'));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar status da instância:', error);
      }
    };

    loadInstanceStatus();

    // Poll status every 3 seconds while QR modal is open
    let interval: NodeJS.Timeout | null = null;
    if (showQrModal) {
      interval = setInterval(loadInstanceStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inbox.provider, inbox.provider_config, inbox.name, showQrModal, t]);

  const handleGenerateQR = async () => {
    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.errors.nameNotFound'));
        return;
      }

      const response = await EvolutionApiService.getQRCode(identifier, provider);
      if (response?.base64) {
        setQrCode(response.base64);
        setShowQrModal(true);
        toast.success(t('settings.configuration.whatsapp.instance.success.qrCodeGenerated'));
      } else if (response?.data?.base64) {
        setQrCode(response.data.base64);
        setShowQrModal(true);
        toast.success(t('settings.configuration.whatsapp.instance.success.qrCodeGenerated'));
      } else if (response?.qr_code) {
        // Fallback para formato antigo
        setQrCode(response.qr_code);
        setShowQrModal(true);
        toast.success(t('settings.configuration.whatsapp.instance.success.qrCodeGenerated'));
      } else {
        toast.error(t('settings.configuration.whatsapp.instance.errors.qrCodeError'));
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error(t('settings.configuration.whatsapp.instance.errors.qrCodeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInstanceSettings = async () => {
    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const isEvolutionGo = provider === 'evolution_go';
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.errors.nameNotFound'));
        return;
      }

      // Prepare settings payload based on provider
      let settingsPayload: any;
      if (isEvolutionGo) {
        // Evolution Go: convert readStatus to ignoreStatus (invert) and groupsIgnore to ignoreGroups
        settingsPayload = {
          rejectCall: instanceSettings.rejectCall,
          msgCall: instanceSettings.msgCall,
          ignoreGroups: instanceSettings.groupsIgnore, // Convert groupsIgnore to ignoreGroups
          alwaysOnline: instanceSettings.alwaysOnline,
          readMessages: instanceSettings.readMessages,
          ignoreStatus: !instanceSettings.readStatus, // Convert readStatus to ignoreStatus (invert)
        };
      } else {
        // Evolution (normal): use settings as-is
        settingsPayload = {
          rejectCall: instanceSettings.rejectCall,
          msgCall: instanceSettings.msgCall,
          groupsIgnore: instanceSettings.groupsIgnore,
          alwaysOnline: instanceSettings.alwaysOnline,
          readMessages: instanceSettings.readMessages,
          syncFullHistory: instanceSettings.syncFullHistory,
          readStatus: instanceSettings.readStatus,
        };
      }

      // Update via Evolution API (support both evolution and evolution_go)
      await EvolutionApiService.updateSettings(identifier, settingsPayload as any, provider);

      // Also update the inbox configuration
      await onUpdate({
        channel: {
          provider_config: {
            ...inbox.provider_config,
            instance_settings: instanceSettings,
          },
        },
      });

      toast.success(t('settings.configuration.whatsapp.instance.success.updated'));
    } catch (error) {
      console.error('Erro ao atualizar configurações da instância:', error);
      toast.error(t('settings.configuration.whatsapp.instance.errors.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Profile management functions
  const handleUpdateProfileName = async () => {
    if (!profileSettings.profileName.trim()) return;

    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.profile.errors.nameNotFound'));
        return;
      }

      await EvolutionApiService.updateProfileName(
        identifier,
        profileSettings.profileName,
        provider,
      );
      toast.success(t('settings.configuration.whatsapp.instance.profile.success.nameUpdated'));
    } catch (error: any) {
      console.error('Erro ao atualizar nome do perfil:', error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.profile.errors.nameUpdateError'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileStatus = async () => {
    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.profile.errors.nameNotFound'));
        return;
      }

      await EvolutionApiService.updateProfileStatus(
        identifier,
        profileSettings.profileStatus,
        provider,
      );
      toast.success(t('settings.configuration.whatsapp.instance.profile.success.statusUpdated'));
    } catch (error: any) {
      console.error('Erro ao atualizar status do perfil:', error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.profile.errors.statusUpdateError'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfilePicture = async () => {
    if (!profileSettings.profilePictureUrl.trim()) return;

    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.profile.errors.nameNotFound'));
        return;
      }

      await EvolutionApiService.updateProfilePicture(
        identifier,
        profileSettings.profilePictureUrl,
        provider,
      );
      toast.success(t('settings.configuration.whatsapp.instance.profile.success.pictureUpdated'));
    } catch (error: any) {
      console.error('Erro ao atualizar foto do perfil:', error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.profile.errors.pictureUpdateError'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm(t('settings.configuration.whatsapp.instance.profile.confirmRemovePicture')))
      return;

    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.profile.errors.nameNotFound'));
        return;
      }

      await EvolutionApiService.removeProfilePicture(identifier, provider);
      setProfileSettings(prev => ({ ...prev, profilePictureUrl: '' }));
      toast.success(t('settings.configuration.whatsapp.instance.profile.success.pictureRemoved'));
    } catch (error: any) {
      console.error('Erro ao remover foto do perfil:', error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.profile.errors.pictureRemoveError'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm(t('settings.configuration.whatsapp.instance.actions.confirmDisconnect'))) return;

    setIsLoading(true);
    try {
      const provider = inbox.provider;
      const identifier = getIdentifier();

      if (!identifier) {
        toast.error(t('settings.configuration.whatsapp.instance.profile.errors.nameNotFound'));
        return;
      }

      await EvolutionApiService.logout(identifier, provider);
      setInstanceStatus('close');
      toast.success(t('settings.configuration.whatsapp.instance.actions.success.disconnected'));
    } catch (error: any) {
      console.error('Erro ao desconectar instância:', error);
      toast.error(
        error?.response?.data?.error ||
          t('settings.configuration.whatsapp.instance.actions.errors.disconnectError'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instance Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Smartphone className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.whatsapp.instance.statusTitle')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {inbox.name} - {inbox.phone_number || getIdentifier() || '-'}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <Badge
                  variant={
                    instanceStatus === 'open'
                      ? 'default'
                      : instanceStatus === 'connecting'
                      ? 'outline'
                      : 'secondary'
                  }
                >
                  {instanceStatus === 'open'
                    ? t('settings.configuration.whatsapp.instance.statusConnected')
                    : instanceStatus === 'connecting'
                    ? t('settings.configuration.whatsapp.instance.statusConnecting')
                    : t('settings.configuration.whatsapp.instance.statusDisconnected')}
                </Badge>
                {instanceStatus !== 'open' && (
                  <Button onClick={handleGenerateQR} disabled={isLoading} size="sm">
                    <QrCode className="w-4 h-4 mr-2" />
                    {t('settings.configuration.whatsapp.instance.connectDevice')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.configuration.whatsapp.instance.qrCodeTitle')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('settings.configuration.whatsapp.instance.qrCodeInstructions')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            {qrCode ? (
              <>
                <div className="bg-white p-4 rounded-lg border">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
                  {t('settings.configuration.whatsapp.instance.qrCodeInstructions')}
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{t('settings.configuration.whatsapp.instance.waitingConnection')}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-slate-600">
                  {t('settings.configuration.whatsapp.instance.generatingQrCode')}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Settings - Only show when connected */}
      {instanceStatus === 'open' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Settings className="w-5 h-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.whatsapp.instance.profile.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('settings.configuration.whatsapp.instance.profile.description')}
                </p>

                <div className="space-y-4 mt-6">
                  {/* Profile Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('settings.configuration.whatsapp.instance.profile.name')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={profileSettings.profileName}
                        onChange={e =>
                          setProfileSettings(prev => ({ ...prev, profileName: e.target.value }))
                        }
                        placeholder={t(
                          'settings.configuration.whatsapp.instance.profile.namePlaceholder',
                        )}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleUpdateProfileName}
                        disabled={isLoading || !profileSettings.profileName.trim()}
                      >
                        {t('settings.configuration.whatsapp.instance.profile.update')}
                      </Button>
                    </div>
                  </div>

                  {/* Profile Status/Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('settings.configuration.whatsapp.instance.profile.status')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={profileSettings.profileStatus}
                        onChange={e =>
                          setProfileSettings(prev => ({ ...prev, profileStatus: e.target.value }))
                        }
                        placeholder={t(
                          'settings.configuration.whatsapp.instance.profile.statusPlaceholder',
                        )}
                        className="flex-1"
                      />
                      <Button onClick={handleUpdateProfileStatus} disabled={isLoading}>
                        {t('settings.configuration.whatsapp.instance.profile.update')}
                      </Button>
                    </div>
                  </div>

                  {/* Profile Picture URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('settings.configuration.whatsapp.instance.profile.picture')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={profileSettings.profilePictureUrl}
                        onChange={e =>
                          setProfileSettings(prev => ({
                            ...prev,
                            profilePictureUrl: e.target.value,
                          }))
                        }
                        placeholder={t(
                          'settings.configuration.whatsapp.instance.profile.picturePlaceholder',
                        )}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleUpdateProfilePicture}
                        disabled={isLoading || !profileSettings.profilePictureUrl.trim()}
                        variant="outline"
                      >
                        {t('settings.configuration.whatsapp.instance.profile.update')}
                      </Button>
                      <Button
                        onClick={handleRemoveProfilePicture}
                        disabled={isLoading}
                        variant="destructive"
                      >
                        {t('settings.configuration.whatsapp.instance.profile.remove')}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {t('settings.configuration.whatsapp.instance.profile.pictureHelp')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings - Only show when connected */}
      {instanceStatus === 'open' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-5 h-5 text-purple-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.whatsapp.instance.privacy.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('settings.configuration.whatsapp.instance.privacy.description')}
                </p>
                <div className="mt-6">
                    <EvolutionPrivacySettings
                      instanceName={
                        getIdentifier()
                      }
                      provider={inbox.provider}
                    />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instance Settings - Only show when connected */}
      {instanceStatus === 'open' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Settings className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.whatsapp.instance.settingsTitle')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('settings.configuration.whatsapp.instance.settingsDescription')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t('settings.configuration.whatsapp.instance.rejectCall')}
                    </label>
                    <Switch
                      checked={instanceSettings.rejectCall}
                      onCheckedChange={checked =>
                        setInstanceSettings(prev => ({ ...prev, rejectCall: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t('settings.configuration.whatsapp.instance.alwaysOnline')}
                    </label>
                    <Switch
                      checked={instanceSettings.alwaysOnline}
                      onCheckedChange={checked =>
                        setInstanceSettings(prev => ({ ...prev, alwaysOnline: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t('settings.configuration.whatsapp.instance.readMessages')}
                    </label>
                    <Switch
                      checked={instanceSettings.readMessages}
                      onCheckedChange={checked =>
                        setInstanceSettings(prev => ({ ...prev, readMessages: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t('settings.configuration.whatsapp.instance.ignoreGroups')}
                    </label>
                    <Switch
                      checked={instanceSettings.groupsIgnore}
                      onCheckedChange={checked =>
                        setInstanceSettings(prev => ({ ...prev, groupsIgnore: checked }))
                      }
                    />
                  </div>

                  {/* Only show syncFullHistory for Evolution (not Evolution Go) */}
                  {inbox.provider !== 'evolution_go' && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {t('settings.configuration.whatsapp.instance.syncFullHistory')}
                      </label>
                      <Switch
                        checked={instanceSettings.syncFullHistory}
                        onCheckedChange={checked =>
                          setInstanceSettings(prev => ({ ...prev, syncFullHistory: checked }))
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {inbox.provider === 'evolution_go'
                        ? t('settings.configuration.whatsapp.instance.ignoreStatus')
                        : t('settings.configuration.whatsapp.instance.readStatus')}
                    </label>
                    <Switch
                      checked={
                        inbox.provider === 'evolution_go'
                          ? !instanceSettings.readStatus
                          : instanceSettings.readStatus
                      }
                      onCheckedChange={checked => {
                        if (inbox.provider === 'evolution_go') {
                          // For Evolution Go, invert the value (ignoreStatus is opposite of readStatus)
                          setInstanceSettings(prev => ({ ...prev, readStatus: !checked }));
                        } else {
                          setInstanceSettings(prev => ({ ...prev, readStatus: checked }));
                        }
                      }}
                    />
                  </div>
                </div>

                {instanceSettings.rejectCall && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      {t('settings.configuration.whatsapp.instance.callRejectionMessage')}
                    </label>
                    <Input
                      value={instanceSettings.msgCall}
                      onChange={e =>
                        setInstanceSettings(prev => ({ ...prev, msgCall: e.target.value }))
                      }
                      placeholder={t(
                        'settings.configuration.whatsapp.instance.callRejectionPlaceholder',
                      )}
                    />
                  </div>
                )}

                <Button onClick={handleUpdateInstanceSettings} loading={isLoading} className="mt-6">
                  {t('settings.configuration.whatsapp.instance.saveSettings')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Key className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.whatsapp.instance.connection.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t('settings.configuration.whatsapp.instance.connection.description')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.configuration.whatsapp.instance.connection.apiUrlLabel')}
                </label>
                <Input
                  value={connectionSettings.apiUrl}
                  onChange={e =>
                    setConnectionSettings(prev => ({ ...prev, apiUrl: e.target.value }))
                  }
                  placeholder={t('settings.configuration.whatsapp.instance.connection.apiUrlPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.configuration.whatsapp.instance.connection.adminTokenLabel')}
                </label>
                <Input
                  type="password"
                  value={connectionSettings.adminToken}
                  onChange={e =>
                    setConnectionSettings(prev => ({ ...prev, adminToken: e.target.value }))
                  }
                  placeholder={t('settings.configuration.whatsapp.instance.connection.adminTokenPlaceholder')}
                />
                {inbox?.provider_config?.admin_token && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('settings.configuration.whatsapp.instance.connection.adminTokenSet', 'A key is already configured. Leave blank to keep it.')}
                  </p>
                )}
              </div>

              <Button
                onClick={handleUpdateConnectionSettings}
                loading={isUpdatingConnection}
              >
                {t('settings.configuration.whatsapp.instance.connection.saveButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instance Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t('settings.configuration.whatsapp.instance.actions.title')}
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleLogout} disabled={isLoading} variant="destructive">
              {t('settings.configuration.whatsapp.instance.actions.disconnect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Privacy Settings Component for Z-API
const PrivacySettings: React.FC<{
  instanceId: string;
}> = ({ instanceId }) => {
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: 'ALL',
    photoVisualization: 'ALL',
    description: 'ALL',
    groupAdd: 'ALL',
    online: 'ALL',
    readReceipts: 'ALL',
    messagesDuration: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handlePrivacyUpdate = async (setting: string, value: string) => {
    setIsLoading(true);
    try {
      switch (setting) {
        case 'lastSeen':
          await ZapiService.setLastSeen(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, lastSeen: value }));
          toast.success('Configuração de "Visto por último" atualizada');
          break;
        case 'photoVisualization':
          await ZapiService.setPhotoVisualization(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, photoVisualization: value }));
          toast.success('Configuração de visualização de foto atualizada');
          break;
        case 'description':
          await ZapiService.setDescription(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, description: value }));
          toast.success('Configuração de descrição atualizada');
          break;
        case 'groupAdd':
          await ZapiService.setGroupAddPermission(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, groupAdd: value }));
          toast.success('Configuração de permissão de grupo atualizada');
          break;
        case 'online':
          await ZapiService.setOnline(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, online: value }));
          toast.success('Configuração de online atualizada');
          break;
        case 'readReceipts':
          await ZapiService.setReadReceipts(instanceId, value);
          setPrivacySettings(prev => ({ ...prev, readReceipts: value }));
          toast.success('Configuração de confirmações de leitura atualizada');
          break;
      }
    } catch (error: any) {
      console.error(`Erro ao atualizar ${setting}:`, error);
      toast.error(error?.response?.data?.error || `Erro ao atualizar ${setting}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagesDurationUpdate = async () => {
    if (privacySettings.messagesDuration < 0) {
      toast.error('Duração deve ser maior ou igual a 0');
      return;
    }
    setIsLoading(true);
    try {
      await ZapiService.setMessagesDuration(instanceId, privacySettings.messagesDuration);
      toast.success('Duração das mensagens atualizada');
    } catch (error: any) {
      console.error('Erro ao atualizar duração das mensagens:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar duração das mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const privacyOptions = [
    { value: 'ALL', label: 'Todos' },
    { value: 'CONTACTS', label: 'Contatos' },
    { value: 'CONTACT_BLACKLIST', label: 'Lista de bloqueio' },
    { value: 'NOBODY', label: 'Ninguém' },
  ];

  return (
    <div className="space-y-6">
      {/* Last Seen */}
      <div>
        <label className="block text-sm font-medium mb-2">Visto por último</label>
        <Select
          value={privacySettings.lastSeen}
          onValueChange={value => handlePrivacyUpdate('lastSeen', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Photo Visualization */}
      <div>
        <label className="block text-sm font-medium mb-2">Visualização da foto do perfil</label>
        <Select
          value={privacySettings.photoVisualization}
          onValueChange={value => handlePrivacyUpdate('photoVisualization', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Visualização do recado</label>
        <Select
          value={privacySettings.description}
          onValueChange={value => handlePrivacyUpdate('description', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group Add Permission */}
      <div>
        <label className="block text-sm font-medium mb-2">Permissão para adicionar em grupos</label>
        <Select
          value={privacySettings.groupAdd}
          onValueChange={value => handlePrivacyUpdate('groupAdd', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Online */}
      <div>
        <label className="block text-sm font-medium mb-2">Visualização de online</label>
        <Select
          value={privacySettings.online}
          onValueChange={value => handlePrivacyUpdate('online', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Read Receipts */}
      <div>
        <label className="block text-sm font-medium mb-2">Confirmações de leitura</label>
        <Select
          value={privacySettings.readReceipts}
          onValueChange={value => handlePrivacyUpdate('readReceipts', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages Duration */}
      <div>
        <label className="block text-sm font-medium mb-2">Duração das mensagens (segundos)</label>
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            value={privacySettings.messagesDuration}
            onChange={e =>
              setPrivacySettings(prev => ({
                ...prev,
                messagesDuration: parseInt(e.target.value) || 0,
              }))
            }
            placeholder="0 = desabilitado"
            className="flex-1"
          />
          <Button onClick={handleMessagesDurationUpdate} disabled={isLoading}>
            Atualizar
          </Button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Configure quanto tempo as mensagens ficam visíveis (0 = desabilitado)
        </p>
      </div>
    </div>
  );
};

// Z-API WhatsApp Configuration
const ZapiWhatsAppConfig: React.FC<{
  inbox: any;
  onUpdate: (data: any) => void;
}> = ({ inbox }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    profileName: '',
    profileDescription: '',
    callReject: false,
    callRejectMessage: 'Não aceito chamadas',
  });

  const instanceId = inbox.provider_config?.instance_id;
  const inboxId = inbox.id;

  // Ref to track last known status to detect changes
  const lastStatusRef = useRef<string | null>(null);

  // Sync inbox name with Z-API instance name
  const syncInboxWithZapi = async (instanceName: string) => {
    if (!inboxId || !instanceName) return;

    try {
      await InboxesService.update(inboxId, {
        display_name: instanceName,
      });
    } catch (error) {
      console.error('Erro ao sincronizar inbox com Z-API:', error);
      // Don't show error toast as this is a background sync
    }
  };

  // Load instance data on mount
  useEffect(() => {
    if (!instanceId) return;

    const loadInstanceData = async () => {
      try {
        setIsLoading(true);
        const data = await ZapiService.getInstanceData(instanceId);

        // Update status from response
        // The full instance data endpoint returns whatsappConnected and phoneConnected
        let initialStatus: string | null = null;
        if (data?.status) {
          // Use connected boolean or state field
          const isConnected =
            data.status.connected === true ||
            data.status.state === 'open' ||
            data.status.state === 'connected';
          initialStatus = isConnected ? 'connected' : 'disconnected';
        } else if (data?.instance) {
          // Check for whatsappConnected from full instance data endpoint
          const isConnected =
            data.instance.whatsappConnected === true || data.instance.connected === true;
          initialStatus = isConnected ? 'connected' : 'disconnected';
        }

        if (initialStatus) {
          setInstanceStatus(initialStatus);
          lastStatusRef.current = initialStatus;
        }

        // Update profile settings from device data (primary) or instance data (fallback)
        if (data?.device) {
          const deviceName = data.device.name || '';

          setProfileSettings(prev => ({
            ...prev,
            profileName: deviceName || prev.profileName,
            profileDescription: data.device.about || prev.profileDescription,
            // Only update callReject if the field exists in the response, otherwise keep false
            callReject:
              data.instance?.callRejectAuto !== undefined
                ? data.instance.callRejectAuto
                : data.instance?.rejectCalls !== undefined
                ? data.instance.rejectCalls
                : false,
            callRejectMessage:
              data.instance?.callRejectMessage ||
              data.instance?.rejectCallMessage ||
              prev.callRejectMessage,
          }));

          // Sync inbox name with Z-API instance name
          if (deviceName) {
            const instanceName = data.instance?.name || deviceName || '';
            await syncInboxWithZapi(instanceName);
          }
        } else if (data?.instance) {
          const instanceName = data.instance.profileName || data.instance.name || '';

          setProfileSettings(prev => ({
            ...prev,
            profileName: instanceName || prev.profileName,
            profileDescription:
              data.instance.profileDescription ||
              data.instance.description ||
              prev.profileDescription,
            // Only update callReject if the field exists in the response, otherwise keep false
            callReject:
              data.instance.callRejectAuto !== undefined
                ? data.instance.callRejectAuto
                : data.instance.rejectCalls !== undefined
                ? data.instance.rejectCalls
                : false,
            callRejectMessage:
              data.instance.callRejectMessage ||
              data.instance.rejectCallMessage ||
              prev.callRejectMessage,
          }));

          // Sync inbox name with Z-API instance name
          if (instanceName) {
            await syncInboxWithZapi(instanceName);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da instância Z-API:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInstanceData();
  }, [instanceId]);

  // Poll instance status while QR modal is open
  useEffect(() => {
    if (!showQrModal || !instanceId) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await ZapiService.getStatus(instanceId);
        // Status endpoint returns { connected: true, error: "...", smartphone_connected: true }
        const isConnected = statusData?.connected === true;

        if (isConnected) {
          setShowQrModal(false);
          setQrCode(null);
          setInstanceStatus('connected');
          lastStatusRef.current = 'connected';
          toast.success('Instância conectada com sucesso!');
          // Reload instance data
          const data = await ZapiService.getInstanceData(instanceId);
          // Update profile settings from device data (primary) or instance data (fallback)
          if (data?.device) {
            setProfileSettings(prev => ({
              ...prev,
              profileName: data.device.name || prev.profileName,
              profileDescription: data.device.about || prev.profileDescription,
              callReject:
                data.instance?.callRejectAuto !== undefined
                  ? data.instance.callRejectAuto
                  : data.instance?.rejectCalls !== undefined
                  ? data.instance.rejectCalls
                  : prev.callReject,
              callRejectMessage:
                data.instance?.callRejectMessage ||
                data.instance?.rejectCallMessage ||
                prev.callRejectMessage,
            }));
          } else if (data?.instance) {
            setProfileSettings(prev => ({
              ...prev,
              profileName: data.instance.profileName || data.instance.name || prev.profileName,
              profileDescription:
                data.instance.profileDescription ||
                data.instance.description ||
                prev.profileDescription,
              callReject:
                data.instance.callRejectAuto !== undefined
                  ? data.instance.callRejectAuto
                  : data.instance.rejectCalls !== undefined
                  ? data.instance.rejectCalls
                  : prev.callReject,
              callRejectMessage:
                data.instance.callRejectMessage ||
                data.instance.rejectCallMessage ||
                prev.callRejectMessage,
            }));
          }
        } else {
          // Update status to disconnected if not connected
          setInstanceStatus('disconnected');
          lastStatusRef.current = 'disconnected';
        }
      } catch (error) {
        console.error('Erro ao verificar status da instância:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showQrModal, instanceId]);

  // Poll instance status and data periodically to keep UI updated
  useEffect(() => {
    if (!instanceId) return;

    let shouldContinue = true;

    const pollStatus = async () => {
      if (!shouldContinue) return;

      try {
        // Get full instance data which includes status
        const data = await ZapiService.getInstanceData(instanceId);

        if (data && shouldContinue) {
          // Determine current status
          let currentStatus: string | null = null;
          if (data?.status?.connected === true) {
            currentStatus = 'connected';
          } else if (
            data?.instance?.connected === true ||
            data?.instance?.whatsappConnected === true
          ) {
            currentStatus = 'connected';
          } else {
            currentStatus = 'disconnected';
          }

          // Update status if changed
          if (currentStatus !== lastStatusRef.current) {
            const previousStatus = lastStatusRef.current;
            setInstanceStatus(currentStatus);
            lastStatusRef.current = currentStatus;

            // If just connected, close QR modal and show success message
            if (currentStatus === 'connected' && previousStatus === 'disconnected') {
              setShowQrModal(false);
              setQrCode(null);
              toast.success('Instância conectada com sucesso!');
            }
          }

          // Update profile settings from device data (primary) or instance data (fallback)
          if (data?.device) {
            setProfileSettings(prev => ({
              ...prev,
              profileName: data.device.name || prev.profileName,
              profileDescription: data.device.about || prev.profileDescription,
              callReject:
                data.instance?.callRejectAuto !== undefined
                  ? data.instance.callRejectAuto
                  : data.instance?.rejectCalls !== undefined
                  ? data.instance.rejectCalls
                  : prev.callReject,
              callRejectMessage:
                data.instance?.callRejectMessage ||
                data.instance?.rejectCallMessage ||
                prev.callRejectMessage,
            }));
          } else if (data?.instance) {
            setProfileSettings(prev => ({
              ...prev,
              profileName: data.instance.profileName || data.instance.name || prev.profileName,
              profileDescription:
                data.instance.profileDescription ||
                data.instance.description ||
                prev.profileDescription,
              callReject:
                data.instance.callRejectAuto !== undefined
                  ? data.instance.callRejectAuto
                  : data.instance.rejectCalls !== undefined
                  ? data.instance.rejectCalls
                  : prev.callReject,
              callRejectMessage:
                data.instance.callRejectMessage ||
                data.instance.rejectCallMessage ||
                prev.callRejectMessage,
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status da instância:', error);
      }
    };

    // Poll every 5 seconds
    const pollInterval = 5000;

    // Initial poll
    pollStatus();

    // Set up interval
    const interval = setInterval(pollStatus, pollInterval);

    return () => {
      shouldContinue = false;
      clearInterval(interval);
    };
  }, [instanceId]);

  const handleGetQRCode = async () => {
    if (!instanceId) return;

    try {
      setIsLoading(true);
      const response = await ZapiService.getQRCode(instanceId);
      // Backend returns { base64: "...", code: null, connected: false }
      const qrData =
        response?.base64 ||
        response?.qrcode?.base64 ||
        response?.qrcode ||
        response?.data?.qrcode ||
        response?.data?.base64;

      if (qrData) {
        setQrCode(qrData);
        setShowQrModal(true);
      } else {
        toast.error('QR Code não encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao obter QR code:', error);
      toast.error(error?.response?.data?.error || 'Erro ao obter QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQRCode = async () => {
    if (!instanceId) return;

    try {
      setIsLoading(true);
      const response = await ZapiService.refreshQRCode(instanceId);
      // Backend returns { base64: "...", code: null, connected: false } or { success: true, qrcode: {...} }
      const qrData =
        response?.base64 ||
        response?.qrcode?.base64 ||
        response?.qrcode ||
        response?.data?.qrcode ||
        response?.data?.base64;

      if (qrData) {
        setQrCode(qrData);
        if (!showQrModal) {
          setShowQrModal(true);
        }
        toast.success('QR Code atualizado com sucesso!');
      } else {
        toast.error('QR Code não encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar QR code:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileName = async () => {
    if (!instanceId || !profileSettings.profileName) return;

    try {
      setIsLoading(true);

      // Update profile name via Z-API
      await ZapiService.updateProfileName(instanceId, profileSettings.profileName);

      // Update instance name via Z-API (syncs with inbox name)
      await ZapiService.updateInstanceName(instanceId, profileSettings.profileName);

      // Sync inbox name with Z-API instance name
      await syncInboxWithZapi(profileSettings.profileName);

      toast.success('Nome do perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar nome do perfil:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar nome do perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileDescription = async () => {
    if (!instanceId) return;

    try {
      setIsLoading(true);
      await ZapiService.updateProfileDescription(instanceId, profileSettings.profileDescription);
      toast.success('Descrição do perfil atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar descrição do perfil:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar descrição do perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCallReject = async () => {
    if (!instanceId) return;

    try {
      setIsLoading(true);
      await ZapiService.updateCallReject(instanceId, profileSettings.callReject);
      toast.success('Configuração de rejeição de chamadas atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar configuração de rejeição de chamadas:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCallRejectMessage = async () => {
    if (!instanceId) return;

    try {
      setIsLoading(true);
      await ZapiService.updateCallRejectMessage(instanceId, profileSettings.callRejectMessage);
      toast.success('Mensagem de rejeição atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar mensagem de rejeição de chamadas:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!instanceId) return;

    if (!confirm('Tem certeza que deseja reiniciar a instância?')) return;

    try {
      setIsLoading(true);
      await ZapiService.restartInstance(instanceId);
      toast.success('Instância reiniciada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao reiniciar instância:', error);
      toast.error(error?.response?.data?.error || 'Erro ao reiniciar instância');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceId) return;

    if (!confirm('Tem certeza que deseja desconectar a instância?')) return;

    try {
      setIsLoading(true);
      await ZapiService.disconnectInstance(instanceId);
      toast.success('Instância desconectada com sucesso!');
      setInstanceStatus('disconnected');
    } catch (error: any) {
      console.error('Erro ao desconectar instância:', error);
      toast.error(error?.response?.data?.error || 'Erro ao desconectar instância');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;

    const statusLower = status.toLowerCase();
    if (statusLower === 'connected' || statusLower === 'open') {
      return <Badge className="bg-green-600 dark:bg-green-500 text-white">Connected</Badge>;
    } else if (statusLower === 'disconnected' || statusLower === 'close') {
      return <Badge className="bg-red-600 dark:bg-red-500 text-white">Disconnected</Badge>;
    } else if (statusLower === 'connecting') {
      return <Badge className="bg-yellow-600 dark:bg-yellow-500 text-white">Connecting</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (!instanceId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600 dark:text-slate-400">Instance ID não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                QR Code para Conexão
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Escaneie o QR code com seu WhatsApp para conectar a instância
              </p>
            </div>
            {getStatusBadge(instanceStatus)}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGetQRCode} disabled={isLoading} variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              Obter QR Code
            </Button>
            <Button onClick={handleRefreshQRCode} disabled={isLoading} variant="outline">
              Atualizar QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings - Only show when connected */}
      {instanceStatus === 'connected' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Configurações de Perfil
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Perfil</label>
                <div className="flex gap-2">
                  <Input
                    value={profileSettings.profileName}
                    onChange={e =>
                      setProfileSettings(prev => ({ ...prev, profileName: e.target.value }))
                    }
                    placeholder="Nome do perfil"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUpdateProfileName}
                    disabled={isLoading || !profileSettings.profileName}
                  >
                    Atualizar
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descrição do Perfil</label>
                <div className="flex gap-2">
                  <Input
                    value={profileSettings.profileDescription}
                    onChange={e =>
                      setProfileSettings(prev => ({ ...prev, profileDescription: e.target.value }))
                    }
                    placeholder="Descrição do perfil"
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateProfileDescription} disabled={isLoading}>
                    Atualizar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Settings - Only show when connected */}
      {instanceStatus === 'connected' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Configurações de Chamadas
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">
                    Rejeitar Chamadas Automaticamente
                  </label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Rejeita automaticamente todas as chamadas recebidas
                  </p>
                </div>
                <Switch
                  checked={profileSettings.callReject}
                  onCheckedChange={checked => {
                    setProfileSettings(prev => ({ ...prev, callReject: checked }));
                    handleUpdateCallReject();
                  }}
                  disabled={isLoading}
                />
              </div>
              {profileSettings.callReject && (
                <div>
                  <label className="block text-sm font-medium mb-2">Mensagem de Rejeição</label>
                  <div className="flex gap-2">
                    <Input
                      value={profileSettings.callRejectMessage}
                      onChange={e =>
                        setProfileSettings(prev => ({ ...prev, callRejectMessage: e.target.value }))
                      }
                      placeholder="Mensagem enviada ao rejeitar chamadas"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUpdateCallRejectMessage}
                      disabled={isLoading || !profileSettings.callRejectMessage}
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings - Only show when connected */}
      {instanceStatus === 'connected' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Configurações de Privacidade
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure as configurações de privacidade do WhatsApp
                </p>
              </div>
            </div>
            <PrivacySettings instanceId={instanceId} />
          </CardContent>
        </Card>
      )}

      {/* Instance Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Ações da Instância
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleRestart} disabled={isLoading} variant="outline">
              Reiniciar Instância
            </Button>
            <Button onClick={handleDisconnect} disabled={isLoading} variant="destructive">
              Desconectar Instância
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code para Conexão</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Gerando QR Code...
                </span>
              </div>
            ) : qrCode ? (
              <>
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code"
                  className="w-64 h-64 border border-slate-200 dark:border-slate-700 rounded-lg bg-white p-2"
                  onError={e => {
                    console.error('Erro ao carregar QR code:', e);
                    toast.error('Erro ao exibir QR code');
                  }}
                />
                <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                  Escaneie este QR code com seu WhatsApp para conectar a instância
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                  QR Code não disponível. Clique em "Atualizar QR Code" para gerar um novo.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowQrModal(false)} variant="outline">
                Fechar
              </Button>
              <Button onClick={handleRefreshQRCode} disabled={isLoading}>
                Atualizar QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Email Channel Configuration
const EmailChannelConfig: React.FC<{
  inbox: any;
  onUpdate: (data: any) => void;
}> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');
  const [imapSettings, setImapSettings] = useState({
    enabled: inbox.imap_enabled || false,
    address: inbox.imap_address || '',
    port: inbox.imap_port || 993,
    login: inbox.imap_login || '',
    password: '',
    enable_ssl: inbox.imap_enable_ssl || true,
  });

  const [smtpSettings, setSmtpSettings] = useState({
    enabled: inbox.smtp_enabled || false,
    address: inbox.smtp_address || '',
    port: inbox.smtp_port || 587,
    login: inbox.smtp_login || '',
    password: '',
    enable_starttls_auto: inbox.smtp_enable_starttls_auto || true,
    authentication: inbox.smtp_authentication || 'login',
  });

  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateEmailSettings = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        channel: {
          imap_enabled: imapSettings.enabled,
          imap_address: imapSettings.address,
          imap_port: imapSettings.port,
          imap_login: imapSettings.login,
          imap_password: imapSettings.password,
          imap_enable_ssl: imapSettings.enable_ssl,
          smtp_enabled: smtpSettings.enabled,
          smtp_address: smtpSettings.address,
          smtp_port: smtpSettings.port,
          smtp_login: smtpSettings.login,
          smtp_password: smtpSettings.password,
          smtp_enable_starttls_auto: smtpSettings.enable_starttls_auto,
          smtp_authentication: smtpSettings.authentication,
        },
      });
      toast.success(t('settings.configuration.email.success.updated'));
    } catch (error) {
      console.error('Erro ao atualizar configurações de email:', error);
      toast.error(t('settings.configuration.email.errors.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* IMAP Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.email.imap.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.configuration.email.imap.description')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.imap.server')}
                  </label>
                  <Input
                    value={imapSettings.address}
                    onChange={e => setImapSettings(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={t('settings.configuration.email.imap.serverPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.imap.port')}
                  </label>
                  <Input
                    type="number"
                    value={imapSettings.port}
                    onChange={e =>
                      setImapSettings(prev => ({ ...prev, port: parseInt(e.target.value) }))
                    }
                    placeholder={t('settings.configuration.email.imap.portPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.imap.login')}
                  </label>
                  <Input
                    value={imapSettings.login}
                    onChange={e => setImapSettings(prev => ({ ...prev, login: e.target.value }))}
                    placeholder={t('settings.configuration.email.imap.loginPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.imap.password')}
                  </label>
                  <Input
                    type="password"
                    value={imapSettings.password}
                    onChange={e => setImapSettings(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={t('settings.configuration.email.imap.passwordPlaceholder')}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={imapSettings.enable_ssl}
                    onCheckedChange={checked =>
                      setImapSettings(prev => ({ ...prev, enable_ssl: checked }))
                    }
                  />
                  <label className="text-sm font-medium">
                    {t('settings.configuration.email.imap.enableSsl')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.email.smtp.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t('settings.configuration.email.smtp.description')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.smtp.server')}
                  </label>
                  <Input
                    value={smtpSettings.address}
                    onChange={e => setSmtpSettings(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={t('settings.configuration.email.smtp.serverPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.smtp.port')}
                  </label>
                  <Input
                    type="number"
                    value={smtpSettings.port}
                    onChange={e =>
                      setSmtpSettings(prev => ({ ...prev, port: parseInt(e.target.value) }))
                    }
                    placeholder={t('settings.configuration.email.smtp.portPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.smtp.login')}
                  </label>
                  <Input
                    value={smtpSettings.login}
                    onChange={e => setSmtpSettings(prev => ({ ...prev, login: e.target.value }))}
                    placeholder={t('settings.configuration.email.smtp.loginPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.smtp.password')}
                  </label>
                  <Input
                    type="password"
                    value={smtpSettings.password}
                    onChange={e => setSmtpSettings(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={t('settings.configuration.email.smtp.passwordPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.configuration.email.smtp.authentication')}
                  </label>
                  <Select
                    value={smtpSettings.authentication}
                    onValueChange={value =>
                      setSmtpSettings(prev => ({ ...prev, authentication: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="login">
                        {t('settings.configuration.email.smtp.authOptions.login')}
                      </SelectItem>
                      <SelectItem value="plain">
                        {t('settings.configuration.email.smtp.authOptions.plain')}
                      </SelectItem>
                      <SelectItem value="cram_md5">
                        {t('settings.configuration.email.smtp.authOptions.cramMd5')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={smtpSettings.enable_starttls_auto}
                    onCheckedChange={checked =>
                      setSmtpSettings(prev => ({ ...prev, enable_starttls_auto: checked }))
                    }
                  />
                  <label className="text-sm font-medium">
                    {t('settings.configuration.email.smtp.enableStarttls')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleUpdateEmailSettings} loading={isUpdating} className="w-full">
        {t('settings.configuration.email.saveButton')}
      </Button>
    </div>
  );
};

const ConfigurationForm: React.FC<ConfigurationFormProps> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');

  if (!inbox) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const channelType = inbox.channel_type;
  const isAPIChannel = channelType === 'Channel::Api';
  const isWhatsAppChannel = channelType === 'Channel::Whatsapp';
  const isEvolutionChannel = inbox.provider === 'evolution';
  const isEvolutionGoChannel = inbox.provider === 'evolution_go';
  const isZapiChannel = inbox.provider === 'zapi';
  const isEmailChannel = channelType === 'Channel::Email';
  const isTwilioChannel = channelType === 'Channel::TwilioSms';

  const handleUpdate = async (data: any) => {
    try {
      await onUpdate(data);
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      throw error;
    }
  };

  // API Channel
  if (isAPIChannel) {
    return <APIChannelConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // WhatsApp Evolution
  if (isWhatsAppChannel && isEvolutionChannel) {
    return <EvolutionWhatsAppConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // WhatsApp Evolution Go
  if (isWhatsAppChannel && isEvolutionGoChannel) {
    return <EvolutionWhatsAppConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // WhatsApp Z-API
  if (isWhatsAppChannel && isZapiChannel) {
    return <ZapiWhatsAppConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // WhatsApp (Cloud, Twilio, etc.)
  if (isWhatsAppChannel) {
    return <WhatsAppChannelConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // Email Channel
  if (isEmailChannel) {
    return <EmailChannelConfig inbox={inbox} onUpdate={handleUpdate} />;
  }

  // Twilio SMS
  if (isTwilioChannel) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Phone className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('settings.configuration.twilio.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('settings.configuration.twilio.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for other channel types
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Settings className="w-8 h-8 text-slate-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.fallback.title')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('settings.configuration.fallback.description', { channelType })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationForm;
