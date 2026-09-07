import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
} from '@evoapi/design-system';
import { MessageSquare, Settings, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { integrationsService } from '@/services/integrations';
import { BMSHook } from '@/types/integrations';

import IntegrationBackButton from '../../shared/IntegrationBackButton';
import BMSModal from './BMSModal';

interface BMSSettingsProps {
  onBack?: () => void;
}

export default function BMSSettings({ onBack }: BMSSettingsProps = {}) {
  const { t } = useLanguage('integrations');
  const [hook, setHook] = useState<BMSHook | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    create: false,
    update: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load BMS hook
  const loadBMSHook = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const hookData = (await integrationsService.getIntegrationHook('bms')) as BMSHook | null;
      setHook(hookData);
    } catch (error) {
      console.error('Error loading BMS hook:', error);
      toast.error(t('bms.messages.loadError'));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadBMSHook();
    }
  }, [loadBMSHook]);

  // Handlers
  const handleConfigure = () => {
    setConfigModalOpen(true);
  };

  const handleDeleteIntegration = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfigFormSubmit = async (data: Record<string, unknown>) => {
    setLoading(prev => ({ ...prev, [hook ? 'update' : 'create']: true }));

    try {
      if (hook) {
        // Update existing hook
        await integrationsService.updateIntegrationHook(hook.id, data as Record<string, unknown>);
        toast.success(t('bms.messages.updateSuccess'));
      } else {
        // Create new hook
        await integrationsService.createIntegrationHook('bms', data as Record<string, unknown>);
        toast.success(t('bms.messages.createSuccess'));
      }

      // Reload hook data
      await loadBMSHook();

      // Close modal
      setConfigModalOpen(false);
    } catch (error) {
      console.error('Error saving BMS config:', error);
      toast.error(hook ? t('bms.messages.updateError') : t('bms.messages.createError'));
    } finally {
      setLoading(prev => ({ ...prev, create: false, update: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!hook) return;

    setLoading(prev => ({ ...prev, delete: true }));

    try {
      await integrationsService.deleteIntegrationHook(hook.id);
      toast.success(t('bms.messages.deleteSuccess'));

      // Clear hook state
      setHook(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting BMS hook:', error);
      toast.error(t('bms.messages.deleteError'));
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleConfigModalClose = (open: boolean) => {
    if (!open) {
      setConfigModalOpen(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-4 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <IntegrationBackButton onBack={onBack} />
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">{t('bms.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('bms.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 mt-6">
        {loading.get ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('genericSettings.loadingConfig')}</div>
          </div>
        ) : !hook ? (
          <EmptyState
            icon={MessageSquare}
            title={t('bms.notConfigured')}
            description={t('bms.notConfiguredDescription')}
            action={{
              label: t('bms.configureBMS'),
              onClick: handleConfigure,
            }}
            className="h-full"
          />
        ) : (
          <div className="space-y-6 max-w-2xl">
            {/* Status Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t('bms.status.title')}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {hook.status ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">{t('bms.status.active')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium">{t('bms.status.inactive')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">{t('bms.status.configuredAt')}</label>
                  <p className="text-sm font-medium">
                    {new Date(hook.created_at).toLocaleDateString(getFormattingLocale(), {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">{t('bms.status.lastUpdate')}</label>
                  <p className="text-sm font-medium">
                    {new Date(hook.updated_at).toLocaleDateString(getFormattingLocale(), {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </Card>

            {/* Configuration Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('bms.configuration.title')}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleConfigure}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t('bms.configuration.edit')}
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteIntegration}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('bms.configuration.remove')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500">{t('bms.configuration.apiKey')}</label>
                  <p className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {hook.settings?.api_key
                      ? '••••••••••••••••'
                      : t('bms.configuration.notConfigured')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">
                      {t('bms.configuration.contactSync')}
                    </label>
                    <p className="text-sm">
                      {hook.settings?.enable_contact_sync ? (
                        <span className="text-green-600">{t('bms.configuration.enabled')}</span>
                      ) : (
                        <span className="text-red-600">{t('bms.configuration.disabled')}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      {t('bms.configuration.labelSync')}
                    </label>
                    <p className="text-sm">
                      {hook.settings?.enable_label_sync ? (
                        <span className="text-green-600">{t('bms.configuration.enabled')}</span>
                      ) : (
                        <span className="text-red-600">{t('bms.configuration.disabled')}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      {t('bms.configuration.customAttributes')}
                    </label>
                    <p className="text-sm">
                      {hook.settings?.enable_custom_attributes_sync ? (
                        <span className="text-green-600">{t('bms.configuration.enabled')}</span>
                      ) : (
                        <span className="text-red-600">{t('bms.configuration.disabled')}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      {t('bms.configuration.campaignSync')}
                    </label>
                    <p className="text-sm">
                      {hook.settings?.enable_campaign_sync ? (
                        <span className="text-green-600">{t('bms.configuration.enabled')}</span>
                      ) : (
                        <span className="text-red-600">{t('bms.configuration.disabled')}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Features Card */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">
                {t('bms.featuresCard.title')}
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <li>• {t('bms.featuresCard.contactSync')}</li>
                <li>• {t('bms.featuresCard.labelManagement')}</li>
                <li>• {t('bms.featuresCard.customAttributes')}</li>
                <li>• {t('bms.featuresCard.campaigns')}</li>
                <li>• {t('bms.featuresCard.unifiedHistory')}</li>
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bms.deleteDialog.title')}</DialogTitle>
            <DialogDescription>{t('bms.deleteDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading.delete}
            >
              {t('bms.deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading.delete}>
              {loading.delete ? t('bms.deleteDialog.removing') : t('bms.deleteDialog.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Modal */}
      <BMSModal
        hook={hook || undefined}
        open={configModalOpen}
        onOpenChange={handleConfigModalClose}
        onSubmit={handleConfigFormSubmit}
        isNew={!hook}
        loading={loading.create || loading.update}
      />
    </div>
  );
}
