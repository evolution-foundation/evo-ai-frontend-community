import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../../shared/FormField';
import { FormSection } from '../../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface ZapiFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
}

export const ZapiForm = ({ form, onFormChange }: ZapiFormProps) => {
  const { t } = useLanguage('whatsapp');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6">
      {/* Phone Number */}
      <div data-tour="whatsapp-credentials">
        <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
          {t('zapiForm.fields.phoneNumber.label')} <span className="text-destructive">*</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder={t('zapiForm.fields.phoneNumber.placeholder')}
          defaultCountry="BR"
        />
      </div>

      {/* Instance ID */}
      <FormField
        label={t('zapiForm.fields.instanceId.label')}
        value={getStr('instance_id')}
        onChange={value => onFormChange('instance_id', value)}
        placeholder={t('zapiForm.fields.instanceId.placeholder')}
        helpText={t('zapiForm.fields.instanceId.helpText')}
        required
      />

      {/* Token (Instance Token) */}
      <FormField
        label={t('zapiForm.fields.token.label')}
        value={getStr('token')}
        onChange={value => onFormChange('token', value)}
        placeholder={t('zapiForm.fields.token.placeholder')}
        helpText={t('zapiForm.fields.token.helpText')}
        type="password"
        required
      />

      {/* Client Token */}
      <FormField
        label={t('zapiForm.fields.clientToken.label')}
        value={getStr('client_token')}
        onChange={value => onFormChange('client_token', value)}
        placeholder={t('zapiForm.fields.clientToken.placeholder')}
        helpText={t('zapiForm.fields.clientToken.helpText')}
        type="password"
        required
      />

      {/* Help Section */}
      <FormSection
        title={t('zapiForm.help.title')}
        className="bg-blue-50/10 border-blue-200/20"
        data-tour="whatsapp-help"
      >
        <div className="text-sm text-sidebar-foreground/70 space-y-2">
          <p>
            <strong>{t('zapiForm.help.instanceId.title')}:</strong>{' '}
            {t('zapiForm.help.instanceId.description')}
          </p>
          <p>
            <strong>{t('zapiForm.help.token.title')}:</strong>{' '}
            {t('zapiForm.help.token.description')}
          </p>
          <p>
            <strong>{t('zapiForm.help.webhook.title')}:</strong>{' '}
            {t('zapiForm.help.webhook.description')}
          </p>
          <p>
            <strong>{t('zapiForm.help.phone.title')}:</strong>{' '}
            {t('zapiForm.help.phone.description')}
          </p>
        </div>
      </FormSection>
    </div>
  );
};
