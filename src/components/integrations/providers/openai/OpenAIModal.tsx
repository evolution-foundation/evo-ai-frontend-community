import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_CREDENTIALS_ROUTE } from '@/components/ApiKeysModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  Switch,
  Label
} from '@evoapi/design-system';
import { Brain, AlertCircle, ExternalLink } from 'lucide-react';
import { OpenAIHook, OpenAIFormData, IntegrationHook } from '@/types/integrations';

interface OpenAIModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function OpenAIModal({
  hook,
  open,
  onOpenChange,
  onSubmit,

  loading: submitting = false
}: OpenAIModalProps) {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OpenAIFormData>({
    api_key: '',
    enable_audio_transcription: false
  });

  useEffect(() => {
    const openaiHook = hook as OpenAIHook | undefined;
    if (openaiHook?.settings) {
      setFormData({
        api_key: openaiHook.settings.api_key || '',
        enable_audio_transcription: openaiHook.settings.enable_audio_transcription || false
      });
    } else {
      setFormData({
        api_key: '',
        enable_audio_transcription: false
      });
    }
  }, [hook, open]);

  // The credential is registered under Settings > AI Credentials (EVO-2250);
  // this screen only carries the feature toggles, so there is nothing left to
  // validate here.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The hook update REPLACES the settings jsonb, so the stored key has to
      // travel with the payload. Dropping it would erase a migrated credential
      // and, on an install whose only key lives here, silently switch AI off.
      await onSubmit(formData as unknown as Record<string, unknown>);
    } catch {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const openOpenAIDoc = () => {
    window.open('https://platform.openai.com/api-keys', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {hook ? t('openai.modal.updateTitle') : t('openai.modal.title')}
          </DialogTitle>
          <DialogDescription>{t('openai.modal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Key Configuration */}
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('openai.modal.apiConfig')}</h4>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t('openai.modal.credentialMoved')}
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-sm"
                  onClick={() => navigate(AI_CREDENTIALS_ROUTE)}
                >
                  {t('openai.modal.goToCredentials')}
                </Button>
              </div>

              {/* Audio Transcription Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <Label htmlFor="enable_audio_transcription" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('openai.modal.fields.enableAudioTranscription.label')}
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('openai.modal.fields.enableAudioTranscription.description')}
                  </p>
                </div>
                <Switch
                  id="enable_audio_transcription"
                  checked={formData.enable_audio_transcription || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_audio_transcription: checked }))}
                />
              </div>
            </div>
          </Card>

          {/* Features Info */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">
              {t('openai.modal.features.title')}
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <li>• {t('openai.modal.features.suggestions')}</li>
              <li>• {t('openai.modal.features.summaries')}</li>
              <li>• {t('openai.modal.features.improvement')}</li>
              <li>• {t('openai.modal.features.correction')}</li>
              <li>• {t('openai.modal.features.labels')}</li>
            </ul>
          </Card>

          {/* Security Warning */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('openai.modal.security.title')}</strong> {t('openai.modal.security.description')}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={openOpenAIDoc}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('openai.modal.actions.help')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('openai.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting ? t('openai.modal.actions.saving') : (hook ? t('openai.modal.actions.update') : t('openai.modal.actions.configure'))}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
