import i18n from '@/i18n/config';
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
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Building2, AlertCircle, ExternalLink } from 'lucide-react';
import { LeadSquaredHook, LeadSquaredFormData, IntegrationHook } from '@/types/integrations';

interface LeadSquaredModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/London', get label() { return i18n.t("channels:settings.businessHours.timezones.london"); } },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Kolkata', label: 'Mumbai (GMT+5:30)' },
];

export default function LeadSquaredModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false,
}: LeadSquaredModalProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LeadSquaredFormData>({
    access_key: '',
    secret_key: '',
    endpoint_url: '',
    app_url: '',
    host_url: '',
    timezone: 'America/Sao_Paulo',
    enable_conversation_activity: true,
    enable_transcript_activity: false,
    enable_contact_sync: false,
    enable_lead_creation: false,
    enable_activity_sync: false,
    enable_opportunity_sync: false,
    conversation_activity_score: '10',
    transcript_activity_score: '5',
    conversation_activity_code: 100,
    transcript_activity_code: 101,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const leadSquaredHook = hook as LeadSquaredHook | undefined;
    if (leadSquaredHook?.settings) {
      setFormData({
        access_key: leadSquaredHook.settings.access_key || '',
        secret_key: leadSquaredHook.settings.secret_key || '',
        endpoint_url: leadSquaredHook.settings.endpoint_url || '',
        app_url: leadSquaredHook.settings.app_url || '',
        host_url: leadSquaredHook.settings.host_url || '',
        timezone: leadSquaredHook.settings.timezone || 'America/Sao_Paulo',
        enable_conversation_activity: leadSquaredHook.settings.enable_conversation_activity ?? true,
        enable_transcript_activity: leadSquaredHook.settings.enable_transcript_activity ?? false,
        enable_contact_sync: leadSquaredHook.settings.enable_contact_sync ?? false,
        enable_lead_creation: leadSquaredHook.settings.enable_lead_creation ?? false,
        enable_activity_sync: leadSquaredHook.settings.enable_activity_sync ?? false,
        enable_opportunity_sync: leadSquaredHook.settings.enable_opportunity_sync ?? false,
        conversation_activity_score: leadSquaredHook.settings.conversation_activity_score || '10',
        transcript_activity_score: leadSquaredHook.settings.transcript_activity_score || '5',
        conversation_activity_code: leadSquaredHook.settings.conversation_activity_code || 100,
        transcript_activity_code: leadSquaredHook.settings.transcript_activity_code || 101,
      });
    } else {
      setFormData({
        access_key: '',
        secret_key: '',
        endpoint_url: '',
        app_url: '',
        host_url: '',
        timezone: 'America/Sao_Paulo',
        enable_conversation_activity: true,
        enable_transcript_activity: false,
        enable_contact_sync: false,
        enable_lead_creation: false,
        enable_activity_sync: false,
        enable_opportunity_sync: false,
        conversation_activity_score: '10',
        transcript_activity_score: '5',
        conversation_activity_code: 100,
        transcript_activity_code: 101,
      });
    }
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.access_key.trim()) {
      newErrors.access_key = t('leadSquared.modal.fields.accessKey.required');
    }

    if (!formData.secret_key.trim()) {
      newErrors.secret_key = t('leadSquared.modal.fields.secretKey.required');
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

  const openLeadSquaredDoc = () => {
    window.open('https://apidocs.leadsquared.com/', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {hook ? t('leadSquared.modal.updateTitle') : t('leadSquared.modal.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Description */}
          <div className="text-sm text-muted-foreground">
            {t('leadSquared.modal.description')}
          </div>

          {/* API Configuration */}
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('leadSquared.modal.apiConfig')}</h4>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="access_key"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('leadSquared.modal.fields.accessKey.label')} *
                  </label>
                  <Input
                    id="access_key"
                    type="password"
                    placeholder={t('leadSquared.modal.fields.accessKey.placeholder')}
                    value={formData.access_key}
                    onChange={e => setFormData(prev => ({ ...prev, access_key: e.target.value }))}
                    className={errors.access_key ? 'border-red-500' : ''}
                  />
                  {errors.access_key && (
                    <p className="text-sm text-red-600 mt-1">{errors.access_key}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="secret_key"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('leadSquared.modal.fields.secretKey.label')} *
                  </label>
                  <Input
                    id="secret_key"
                    type="password"
                    placeholder={t('leadSquared.modal.fields.secretKey.placeholder')}
                    value={formData.secret_key}
                    onChange={e => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                    className={errors.secret_key ? 'border-red-500' : ''}
                  />
                  {errors.secret_key && (
                    <p className="text-sm text-red-600 mt-1">{errors.secret_key}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="endpoint_url"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('leadSquared.modal.fields.endpointUrl.label')}
                  </label>
                  <Input
                    id="endpoint_url"
                    placeholder={t('leadSquared.modal.fields.endpointUrl.placeholder')}
                    value={formData.endpoint_url}
                    onChange={e => setFormData(prev => ({ ...prev, endpoint_url: e.target.value }))}
                  />
                </div>

                <div>
                  <label
                    htmlFor="app_url"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('leadSquared.modal.fields.appUrl.label')}
                  </label>
                  <Input
                    id="app_url"
                    placeholder={t('leadSquared.modal.fields.appUrl.placeholder')}
                    value={formData.app_url}
                    onChange={e => setFormData(prev => ({ ...prev, app_url: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  {t('leadSquared.modal.fields.timezone.label')}
                </label>
                <Select
                  value={formData.timezone}
                  onValueChange={value => setFormData(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('leadSquared.modal.fields.timezone.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map(timezone => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Activity Settings */}
          <Card className="p-4">
            <h4 className="font-semibold mb-4">{t('leadSquared.modal.activitySettings')}</h4>

            <div className="space-y-6">
              {/* Conversation Activity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_conversation_activity">{t('leadSquared.modal.fields.conversationActivity.label')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('leadSquared.modal.fields.conversationActivity.description')}
                    </p>
                  </div>
                  <Switch
                    id="enable_conversation_activity"
                    checked={formData.enable_conversation_activity}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, enable_conversation_activity: checked }))
                    }
                  />
                </div>

                {formData.enable_conversation_activity && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                    <div>
                      <Label htmlFor="conversation_activity_score">{t('leadSquared.modal.fields.conversationActivity.score')}</Label>
                      <Input
                        id="conversation_activity_score"
                        placeholder={t('leadSquared.modal.fields.conversationActivity.scorePlaceholder')}
                        value={formData.conversation_activity_score}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            conversation_activity_score: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="conversation_activity_code">{t('leadSquared.modal.fields.conversationActivity.code')}</Label>
                      <Input
                        id="conversation_activity_code"
                        type="number"
                        placeholder={t('leadSquared.modal.fields.conversationActivity.codePlaceholder')}
                        value={formData.conversation_activity_code}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            conversation_activity_code: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript Activity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_transcript_activity">{t('leadSquared.modal.fields.transcriptActivity.label')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('leadSquared.modal.fields.transcriptActivity.description')}
                    </p>
                  </div>
                  <Switch
                    id="enable_transcript_activity"
                    checked={formData.enable_transcript_activity}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, enable_transcript_activity: checked }))
                    }
                  />
                </div>

                {formData.enable_transcript_activity && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-green-200">
                    <div>
                      <Label htmlFor="transcript_activity_score">{t('leadSquared.modal.fields.transcriptActivity.score')}</Label>
                      <Input
                        id="transcript_activity_score"
                        placeholder={t('leadSquared.modal.fields.transcriptActivity.scorePlaceholder')}
                        value={formData.transcript_activity_score}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            transcript_activity_score: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="transcript_activity_code">{t('leadSquared.modal.fields.transcriptActivity.code')}</Label>
                      <Input
                        id="transcript_activity_code"
                        type="number"
                        placeholder={t('leadSquared.modal.fields.transcriptActivity.codePlaceholder')}
                        value={formData.transcript_activity_code}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            transcript_activity_code: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Security Warning */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{t('leadSquared.modal.security.title')}</strong> {t('leadSquared.modal.security.description')}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={openLeadSquaredDoc}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {t('leadSquared.modal.actions.documentation')}
            </Button>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('leadSquared.modal.actions.cancel')}
              </Button>
              <Button type="submit" disabled={loading || submitting}>
                {loading || submitting ? t('leadSquared.modal.actions.saving') : (hook ? t('leadSquared.modal.actions.update') : t('leadSquared.modal.actions.configure'))}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
