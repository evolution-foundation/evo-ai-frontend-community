import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Card,
} from '@evoapi/design-system';
import { Megaphone, AlertCircle, ExternalLink } from 'lucide-react';
import { GoogleAdsHook, GoogleAdsFormData, IntegrationHook } from '@/types/integrations';

interface GoogleAdsModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function GoogleAdsModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  isNew: _ = false,
  loading: submitting = false,
}: GoogleAdsModalProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<GoogleAdsFormData>({
    client_id: '',
    client_secret: '',
    refresh_token: '',
    developer_token: '',
    login_customer_id: '',
    customer_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const adsHook = hook as GoogleAdsHook | undefined;
    if (adsHook?.settings) {
      setFormData({
        client_id: adsHook.settings.client_id || '',
        client_secret: adsHook.settings.client_secret || '',
        refresh_token: adsHook.settings.refresh_token || '',
        developer_token: adsHook.settings.developer_token || '',
        login_customer_id: adsHook.settings.login_customer_id || '',
        customer_id: adsHook.settings.customer_id || '',
      });
    } else {
      setFormData({
        client_id: '',
        client_secret: '',
        refresh_token: '',
        developer_token: '',
        login_customer_id: '',
        customer_id: '',
      });
    }
    setErrors({});
  }, [hook, open]);

  const REQUIRED_FIELDS: Array<keyof GoogleAdsFormData> = [
    'client_id',
    'client_secret',
    'refresh_token',
    'developer_token',
    'customer_id',
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = t(`googleAds.modal.fields.${field}.required`);
      }
    });
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

  const openGoogleAdsDoc = () => {
    window.open('https://developers.google.com/google-ads/api/docs/first-call/overview', '_blank');
  };

  const renderField = (
    field: keyof GoogleAdsFormData,
    labelKey: string,
    { secret = false, required = true }: { secret?: boolean; required?: boolean } = {},
  ) => (
    <div key={field}>
      <label
        htmlFor={`google_ads_${field}`}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
      >
        {t(`googleAds.modal.fields.${labelKey}.label`)} {required && '*'}
      </label>
      <Input
        id={`google_ads_${field}`}
        type={secret ? 'password' : 'text'}
        placeholder={t(`googleAds.modal.fields.${labelKey}.placeholder`)}
        value={formData[field]}
        onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
        className={errors[field] ? 'border-red-500' : ''}
      />
      {errors[field] && <p className="text-sm text-red-600 mt-1">{errors[field]}</p>}
      <p className="text-xs text-slate-500 mt-1">{t(`googleAds.modal.fields.${labelKey}.hint`)}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {hook ? t('googleAds.modal.updateTitle') : t('googleAds.modal.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-sm text-muted-foreground">{t('googleAds.modal.description')}</div>

          <Card className="p-4 space-y-4">
            <h4 className="font-semibold mb-2">{t('googleAds.modal.apiConfig')}</h4>

            {renderField('client_id', 'clientId')}
            {renderField('client_secret', 'clientSecret', { secret: true })}
            {renderField('refresh_token', 'refreshToken', { secret: true })}
            {renderField('developer_token', 'developerToken', { secret: true })}
            {renderField('customer_id', 'customerId')}
            {renderField('login_customer_id', 'loginCustomerId', { required: false })}
          </Card>

          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('googleAds.modal.security.title')}</strong>{' '}
                {t('googleAds.modal.security.description')}
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={openGoogleAdsDoc}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('googleAds.modal.actions.documentation')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('googleAds.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting
                  ? t('googleAds.modal.actions.saving')
                  : hook
                    ? t('googleAds.modal.actions.update')
                    : t('googleAds.modal.actions.configure')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
