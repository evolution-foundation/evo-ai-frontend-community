import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Card,
} from '@evoapi/design-system';
import { AudioWaveform, AlertCircle, ExternalLink } from 'lucide-react';
import { ElevenLabsHook, ElevenLabsFormData, IntegrationHook } from '@/types/integrations';

interface ElevenLabsModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function ElevenLabsModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false,
}: ElevenLabsModalProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ElevenLabsFormData>({ api_key: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const elevenLabsHook = hook as ElevenLabsHook | undefined;
    setFormData({ api_key: elevenLabsHook?.settings?.api_key || '' });
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.api_key.trim()) {
      newErrors.api_key = t('elevenlabs.modal.fields.apiKey.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData as unknown as Record<string, unknown>);
    } catch {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const openElevenLabsDoc = () => {
    window.open('https://elevenlabs.io/app/settings/api-keys', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AudioWaveform className="w-5 h-5" />
            {hook ? t('elevenlabs.modal.updateTitle') : t('elevenlabs.modal.title')}
          </DialogTitle>
          <DialogDescription>{t('elevenlabs.modal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('elevenlabs.modal.apiConfig')}</h4>

            <div>
              <label
                htmlFor="elevenlabs_api_key"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('elevenlabs.modal.fields.apiKey.label')} *
              </label>
              <Input
                id="elevenlabs_api_key"
                type="password"
                placeholder={t('elevenlabs.modal.fields.apiKey.placeholder')}
                value={formData.api_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                className={errors.api_key ? 'border-red-500' : ''}
              />
              {errors.api_key && <p className="text-sm text-red-600 mt-1">{errors.api_key}</p>}
              <p className="text-xs text-slate-500 mt-1">{t('elevenlabs.modal.fields.apiKey.hint')}</p>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('elevenlabs.modal.security.title')}</strong>{' '}
                {t('elevenlabs.modal.security.description')}
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={openElevenLabsDoc}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('elevenlabs.modal.actions.help')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('elevenlabs.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting
                  ? t('elevenlabs.modal.actions.saving')
                  : hook
                    ? t('elevenlabs.modal.actions.update')
                    : t('elevenlabs.modal.actions.configure')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
