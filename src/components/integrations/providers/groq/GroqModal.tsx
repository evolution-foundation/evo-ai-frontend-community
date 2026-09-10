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
import { Zap, AlertCircle, ExternalLink } from 'lucide-react';
import { GroqHook, GroqFormData, IntegrationHook } from '@/types/integrations';

interface GroqModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function GroqModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false,
}: GroqModalProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<GroqFormData>({ api_key: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const groqHook = hook as GroqHook | undefined;
    setFormData({ api_key: groqHook?.settings?.api_key || '' });
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.api_key.trim()) {
      newErrors.api_key = t('groq.modal.fields.apiKey.required');
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

  const openGroqDoc = () => {
    window.open('https://console.groq.com/keys', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {hook ? t('groq.modal.updateTitle') : t('groq.modal.title')}
          </DialogTitle>
          <DialogDescription>{t('groq.modal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('groq.modal.apiConfig')}</h4>

            <div>
              <label
                htmlFor="groq_api_key"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('groq.modal.fields.apiKey.label')} *
              </label>
              <Input
                id="groq_api_key"
                type="password"
                placeholder={t('groq.modal.fields.apiKey.placeholder')}
                value={formData.api_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                className={errors.api_key ? 'border-red-500' : ''}
              />
              {errors.api_key && <p className="text-sm text-red-600 mt-1">{errors.api_key}</p>}
              <p className="text-xs text-slate-500 mt-1">{t('groq.modal.fields.apiKey.hint')}</p>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('groq.modal.security.title')}</strong> {t('groq.modal.security.description')}
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={openGroqDoc} className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {t('groq.modal.actions.help')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('groq.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting
                  ? t('groq.modal.actions.saving')
                  : hook
                    ? t('groq.modal.actions.update')
                    : t('groq.modal.actions.configure')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
