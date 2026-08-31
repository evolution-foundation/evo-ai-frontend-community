import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
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
import { Brain, Settings, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { integrationsService } from '@/services/integrations';
import { OpenAIConfig, OpenAIHook } from '@/types/integrations';

import IntegrationBackButton from '../../shared/IntegrationBackButton';
import OpenAIModal from './OpenAIModal';

interface OpenAISettingsProps {
  onBack?: () => void;
}

export default function OpenAISettings({ onBack }: OpenAISettingsProps = {}) {
  const { t } = useLanguage('integrations');
  const [hook, setHook] = useState<OpenAIHook | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    create: false,
    update: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load OpenAI hook
  const loadOpenAIHook = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const hookData = await integrationsService.getOpenAIHook();
      setHook(hookData);
    } catch (error) {
      console.error('Error loading OpenAI hook:', error);
      toast.error(t('openai.settings.messages.loadError'));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadOpenAIHook();
    }
  }, [loadOpenAIHook]);

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
        await integrationsService.updateOpenAIHook(hook.id, data as unknown as OpenAIConfig);
        toast.success(t('openai.settings.messages.updateSuccess'));
      } else {
        // Create new hook
        await integrationsService.createOpenAIHook(data as unknown as OpenAIConfig);
        toast.success(t('openai.settings.messages.createSuccess'));
      }

      // Reload hook data
      await loadOpenAIHook();

      // Close modal
      setConfigModalOpen(false);
    } catch (error) {
      console.error('Error saving OpenAI config:', error);
      toast.error(
        hook
          ? t('openai.settings.messages.updateError')
          : t('openai.settings.messages.createError'),
      );
    } finally {
      setLoading(prev => ({ ...prev, create: false, update: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!hook) return;

    setLoading(prev => ({ ...prev, delete: true }));

    try {
      await integrationsService.deleteOpenAIHook(hook.id);
      toast.success(t('openai.settings.messages.deleteSuccess'));

      // Clear hook state
      setHook(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting OpenAI hook:', error);
      toast.error(t('openai.settings.messages.deleteError'));
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
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">{t('openai.header.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('openai.header.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 mt-6">
        {loading.get ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('openai.settings.loading')}</div>
          </div>
        ) : !hook ? (
          <EmptyState
            icon={Brain}
            title={t('openai.settings.notConfigured.title')}
            description={t('openai.settings.notConfigured.description')}
            action={{
              label: t('openai.settings.notConfigured.action'),
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
                  {t('openai.settings.status.title')}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {hook.status ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">
                        {t('openai.settings.status.active')}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium">
                        {t('openai.settings.status.inactive')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">
                    {t('openai.settings.status.configuredAt')}
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(hook.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    {t('openai.settings.status.lastUpdate')}
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(hook.updated_at).toLocaleDateString('pt-BR', {
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
                <h3 className="text-lg font-semibold">
                  {t('openai.settings.configuration.title')}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleConfigure}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t('openai.settings.configuration.actions.edit')}
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteIntegration}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('openai.settings.configuration.actions.remove')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Reading hook.settings.api_key here would lie on a migrated
                    install: the credential lives in the registry, not in the
                    hook, so this points at the screen that owns it. */}
                <div>
                  <label className="text-xs text-slate-500">
                    {t('openai.settings.configuration.apiKey')}
                  </label>
                  <p className="text-sm">
                    {t('openai.settings.configuration.managedElsewhere')}
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('openai.modal.fields.enableAudioTranscription.label')}
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('openai.modal.fields.enableAudioTranscription.description')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hook.settings?.enable_audio_transcription ? (
                      <span className="text-sm text-green-600 font-medium">
                        {t('openai.settings.status.active')}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">
                        {t('openai.settings.status.inactive')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Features Card */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">
                {t('openai.settings.features.title')}
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <li>• {t('openai.settings.features.suggestions')}</li>
                <li>• {t('openai.settings.features.summaries')}</li>
                <li>• {t('openai.settings.features.improvement')}</li>
                <li>• {t('openai.settings.features.correction')}</li>
                <li>• {t('openai.settings.features.labels')}</li>
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('openai.settings.deleteDialog.title')}</DialogTitle>
            <DialogDescription>{t('openai.settings.deleteDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading.delete}
            >
              {t('openai.settings.deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading.delete}>
              {loading.delete
                ? t('openai.settings.deleteDialog.removing')
                : t('openai.settings.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Modal */}
      <OpenAIModal
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
