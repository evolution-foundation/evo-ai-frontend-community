import { useState } from 'react';
import { Button, Input } from '@evoapi/design-system';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import instagramService from '@/services/channels/instagramService';
import { Instagram, AlertTriangle } from 'lucide-react';
import HubConnectButton from '@/components/inbox/HubConnectButton';

interface InstagramFormProps {
  onCancel?: () => void;
}

export default function InstagramForm({ onCancel }: InstagramFormProps) {
  const { t } = useLanguage('instagram');
  const config = useGlobalConfig();
  const hubEnabled = config.evolutionHubEnabled === true;

  const [isConnecting, setIsConnecting] = useState(false);
  const [inboxName, setInboxName] = useState('');

  // Check if Instagram is properly configured
  const isInstagramConfigured = !!config.instagramAppId;

  if (hubEnabled) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('channelName') || 'Channel Name'}
          </label>
          <Input
            placeholder={t('channelNamePlaceholder') || 'Instagram Channel'}
            value={inboxName}
            onChange={(e) => setInboxName(e.target.value)}
          />
        </div>
        <HubConnectButton channelType="instagram" name={inboxName} />
        {onCancel && (
          <div className="text-center">
            <Button variant="outline" onClick={onCancel}>
              {t('cancel') || 'Cancel'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const handleInstagramConnect = async () => {
    if (!isInstagramConfigured) {
      toast.error(t('errors.notConfigured'));
      return;
    }

    setIsConnecting(true);

    try {
      // Generate authorization URL
      const response = await instagramService.generateAuthorization();

      // Redirect to Instagram OAuth (no popup)
      window.location.href = response.url;
    } catch (error: unknown) {
      console.error('Instagram: Error generating authorization URL:', error);
      const errorMessage =
        (error as { response?: { data?: { error?: { message?: string } } }; message?: string })
          ?.response?.data?.error?.message ||
        (error as { message?: string })?.message ||
        t('errors.authorizationFailed');
      toast.error(errorMessage);
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6" data-tour="instagram-connect">
      {/* Configuration Check */}
      {!isInstagramConfigured && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              {t('warnings.notConfigured')}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {t('warnings.notConfiguredDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Connection Info */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
            <Instagram className="w-12 h-12 text-white" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t('description')}</p>
        </div>
      </div>

      {/* Connection Button */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={handleInstagramConnect}
          disabled={!isInstagramConfigured || isConnecting}
          size="lg"
          className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white min-w-[240px] disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              {t('connecting')}
            </>
          ) : (
            <>
              <Instagram className="w-4 h-4 mr-2" />
              {t('connectButton')}
            </>
          )}
        </Button>

        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isConnecting}>
            {t('cancel')}
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center space-y-2 pt-4 border-t">
        <p className="text-sm text-muted-foreground">{t('instructions.redirect')}</p>
        <p className="text-xs text-muted-foreground">{t('instructions.businessAccount')}</p>
      </div>
    </div>
  );
}
