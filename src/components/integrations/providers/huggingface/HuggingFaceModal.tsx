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
import { Bot, AlertCircle, ExternalLink } from 'lucide-react';
import { HuggingFaceHook, HuggingFaceFormData, IntegrationHook } from '@/types/integrations';

interface HuggingFaceModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function HuggingFaceModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false,
}: HuggingFaceModalProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<HuggingFaceFormData>({ api_key: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const hfHook = hook as HuggingFaceHook | undefined;
    setFormData({ api_key: hfHook?.settings?.api_key || '' });
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.api_key.trim()) {
      newErrors.api_key = t('huggingface.modal.fields.apiKey.required');
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

  const openHuggingFaceDoc = () => {
    window.open('https://huggingface.co/settings/tokens', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            {hook ? t('huggingface.modal.updateTitle') : t('huggingface.modal.title')}
          </DialogTitle>
          <DialogDescription>{t('huggingface.modal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('huggingface.modal.apiConfig')}</h4>

            <div>
              <label
                htmlFor="huggingface_api_key"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('huggingface.modal.fields.apiKey.label')} *
              </label>
              <Input
                id="huggingface_api_key"
                type="password"
                placeholder={t('huggingface.modal.fields.apiKey.placeholder')}
                value={formData.api_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                className={errors.api_key ? 'border-red-500' : ''}
              />
              {errors.api_key && <p className="text-sm text-red-600 mt-1">{errors.api_key}</p>}
              <p className="text-xs text-slate-500 mt-1">{t('huggingface.modal.fields.apiKey.hint')}</p>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('huggingface.modal.security.title')}</strong>{' '}
                {t('huggingface.modal.security.description')}
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={openHuggingFaceDoc}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('huggingface.modal.actions.help')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('huggingface.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting
                  ? t('huggingface.modal.actions.saving')
                  : hook
                    ? t('huggingface.modal.actions.update')
                    : t('huggingface.modal.actions.configure')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
