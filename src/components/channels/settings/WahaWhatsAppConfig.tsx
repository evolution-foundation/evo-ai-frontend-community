import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Card,
  CardContent,
  Input,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { Key, Smartphone, QrCode, Info } from 'lucide-react';
import WahaService from '@/services/channels/wahaService';
import InboxesService from '@/services/channels/inboxesService';

/**
 * WAHA WhatsApp channel configuration.
 *
 * Sibling of the inline EvolutionWhatsAppConfig in ConfigurationForm.tsx: same
 * status badge + QR modal + disconnect flow, but WAHA has no instance/profile/
 * privacy management endpoints, and its connection state is not polled from the
 * provider directly. WAHA pushes `session.status` webhooks that the backend
 * persists onto the channel's `provider_connection` (open / connecting /
 * close), so this component polls the inbox itself for that state instead of a
 * provider status endpoint.
 */
interface WahaInbox {
  id?: string | number;
  name?: string;
  phone_number?: string;
  provider_config?: Record<string, unknown>;
  provider_connection?: Record<string, unknown>;
}

/** Reads the connection state the backend persists from WAHA session.status. */
const readConnection = (source?: { provider_connection?: Record<string, unknown> }) => {
  const connection = source?.provider_connection?.connection;
  return typeof connection === 'string' ? connection : null;
};

/** Backend error envelope message, falling back to the caller's translation. */
const providerErrorMessage = (error: unknown, fallback: string): string => {
  const envelope = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof envelope === 'string' && envelope ? envelope : fallback;
};

const WahaWhatsAppConfig: React.FC<{
  inbox: WahaInbox;
  onUpdate: (data: { channel: { provider_config: Record<string, unknown> } }) => void;
}> = ({ inbox, onUpdate }) => {
  const { t } = useLanguage('channels');

  const inboxId = inbox?.id != null ? String(inbox.id) : '';
  const providerConfig = inbox?.provider_config || {};
  const sessionName = (providerConfig.session_name as string) || '';

  const [connectionState, setConnectionState] = useState<string | null>(readConnection(inbox));
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [connectionSettings, setConnectionSettings] = useState({
    baseUrl: (providerConfig.base_url as string) || '',
    // Never pre-populate apiKey — avoids exposing the secret in the DOM value
    // attribute. Only sent when the user explicitly types a new value.
    apiKey: '',
  });
  const [isUpdatingConnection, setIsUpdatingConnection] = useState(false);

  const isConnected = connectionState === 'open';

  const handleUpdateConnectionSettings = async () => {
    if (!connectionSettings.baseUrl.trim()) {
      toast.error(t('settings.configuration.whatsapp.instance.connection.errors.apiUrlRequired'));
      return;
    }
    setIsUpdatingConnection(true);
    try {
      await onUpdate({
        channel: {
          provider_config: {
            ...providerConfig,
            base_url: connectionSettings.baseUrl.trim(),
            ...(connectionSettings.apiKey.trim()
              ? { api_key: connectionSettings.apiKey.trim() }
              : {}),
          },
        },
      });
      toast.success(t('settings.configuration.whatsapp.instance.connection.success.updated'));
    } catch (error) {
      console.error('Error updating WAHA connection settings:', error);
      toast.error(t('settings.configuration.whatsapp.instance.connection.errors.updateError'));
    } finally {
      setIsUpdatingConnection(false);
    }
  };

  // Poll the inbox for the connection state the WAHA session.status webhook
  // persists on the channel. Faster while the QR modal is open, slower
  // otherwise, and paused while the tab is hidden (Page Visibility API) —
  // same polling shape as EvolutionWhatsAppConfig.
  useEffect(() => {
    let cancelled = false;

    const loadConnectionState = async () => {
      if (!inboxId) {
        if (!cancelled) {
          setLoadError(
            t(
              'settings.configuration.whatsapp.instance.errors.nameNotFound',
              'Could not resolve instance identifier from channel config.',
            ),
          );
          setIsLoadingStatus(false);
        }
        return;
      }

      try {
        const response = await InboxesService.getById(inboxId);
        if (cancelled) return;

        const connection = readConnection(response?.data);

        setConnectionState(connection);
        setLoadError(null);

        if (connection === 'open' && showQrModal) {
          setShowQrModal(false);
          setQrCode(null);
          toast.success(t('settings.configuration.whatsapp.instance.success.connected'));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading WAHA connection state:', error);
          setLoadError(
            t(
              'settings.configuration.whatsapp.instance.errors.loadFailed',
              'Failed to load instance status. Check your connection settings.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      }
    };

    loadConnectionState();

    const pollInterval = showQrModal ? 3000 : 15000;
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadConnectionState();
      }
    }, pollInterval);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadConnectionState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId, showQrModal]);

  const handleGenerateQR = async () => {
    if (!inboxId) {
      toast.error(t('settings.configuration.whatsapp.instance.errors.nameNotFound'));
      return;
    }

    setIsLoading(true);
    setQrCode(null);
    setShowQrModal(true);
    try {
      const response = await WahaService.getQRCode(inboxId);
      const qrDataUrl = response?.qr_data_url;

      if (qrDataUrl) {
        setQrCode(qrDataUrl);
        toast.success(t('settings.configuration.whatsapp.instance.success.qrCodeGenerated'));
      } else {
        setShowQrModal(false);
        toast.error(t('settings.configuration.whatsapp.instance.errors.qrCodeError'));
      }
    } catch (error) {
      console.error('Error generating WAHA QR code:', error);
      setShowQrModal(false);
      toast.error(
        providerErrorMessage(
          error,
          t('settings.configuration.whatsapp.instance.errors.qrCodeError'),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!inboxId) {
      toast.error(t('settings.configuration.whatsapp.instance.errors.nameNotFound'));
      return;
    }
    if (!confirm(t('settings.configuration.whatsapp.instance.actions.confirmDisconnect'))) return;

    setIsLoading(true);
    try {
      await WahaService.logout(inboxId);
      setConnectionState('close');
      toast.success(t('settings.configuration.whatsapp.instance.actions.success.disconnected'));
    } catch (error) {
      console.error('Error disconnecting WAHA session:', error);
      toast.error(
        providerErrorMessage(
          error,
          t('settings.configuration.whatsapp.instance.actions.errors.disconnectError'),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingStatus && connectionState === null) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
            <span className="sr-only">
              {t(
                'settings.configuration.whatsapp.instance.loading',
                'Loading instance settings...',
              )}
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Smartphone className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.configuration.whatsapp.instance.statusTitle')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {inbox.name} - {inbox.phone_number || sessionName || '-'}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <Badge
                  variant={
                    isConnected ? 'default' : connectionState === 'connecting' ? 'outline' : 'secondary'
                  }
                >
                  {isConnected
                    ? t('settings.configuration.whatsapp.instance.statusConnected')
                    : connectionState === 'connecting'
                    ? t('settings.configuration.whatsapp.instance.statusConnecting')
                    : t('settings.configuration.whatsapp.instance.statusDisconnected')}
                </Badge>
                {!isConnected && (
                  <Button onClick={handleGenerateQR} disabled={isLoading} size="sm">
                    <QrCode className="w-4 h-4 mr-2" />
                    {t('settings.configuration.whatsapp.instance.connectDevice')}
                  </Button>
                )}
              </div>

              {loadError && (
                <div className="flex items-start gap-2 mt-4">
                  <Info className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
              )}
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

      {/* Connection settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Key className="w-5 h-5 text-primary mt-1 shrink-0" />
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
                  {t('settings.configuration.whatsapp.waha.baseUrlLabel', 'Base URL')}
                </label>
                <Input
                  value={connectionSettings.baseUrl}
                  onChange={e =>
                    setConnectionSettings(prev => ({ ...prev, baseUrl: e.target.value }))
                  }
                  placeholder="https://waha.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.configuration.whatsapp.waha.apiKeyLabel', 'API Key')}
                </label>
                <Input
                  type="password"
                  value={connectionSettings.apiKey}
                  onChange={e =>
                    setConnectionSettings(prev => ({ ...prev, apiKey: e.target.value }))
                  }
                  placeholder={t(
                    'settings.configuration.whatsapp.instance.connection.adminTokenPlaceholder',
                  )}
                />
                {providerConfig.api_key && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      'settings.configuration.whatsapp.instance.connection.adminTokenSet',
                      'A key is already configured. Leave blank to keep it.',
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.configuration.whatsapp.waha.sessionNameLabel', 'Session name')}
                </label>
                {/* Read-only: the session name identifies the session already
                    created on the WAHA server and registered for webhooks —
                    renaming it here would silently orphan the channel. */}
                <Input value={sessionName} readOnly disabled />
              </div>

              <Button onClick={handleUpdateConnectionSettings} loading={isUpdatingConnection}>
                {t('settings.configuration.whatsapp.instance.connection.saveButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session actions */}
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

export default WahaWhatsAppConfig;
