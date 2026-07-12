import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../shared/FormField';
import { FormSection } from '../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';

interface ApiFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
}

export const ApiForm = ({ form, onFormChange }: ApiFormProps) => {
  const { t } = useLanguage('api');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6">
      <div data-tour="api-webhook-url">
        <FormField
          label={t('fields.webhookUrl.label')}
          value={getStr('webhook_url')}
          onChange={value => onFormChange('webhook_url', value)}
          placeholder={t('fields.webhookUrl.placeholder')}
          helpText={t('fields.webhookUrl.helpText')}
        />
      </div>

      <FormSection
        title={t('info.title')}
        className="bg-gray-50/10 border-gray-200/20"
        data-tour="api-info"
      >
        <div className="text-sm text-sidebar-foreground/70 space-y-2">
          <p><strong>{t('info.title')}:</strong> {t('info.description')}</p>
          <p><strong>{t('fields.webhookUrl.label')}:</strong> {t('info.webhookInfo')}</p>
          <p><strong>{t('info.documentationLabel')}:</strong> {t('info.documentation')}</p>
        </div>
      </FormSection>
    </div>
  );
};
