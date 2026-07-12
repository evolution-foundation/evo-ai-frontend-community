import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../../shared/FormField';
import { FormCheckbox } from '../../shared/FormCheckbox';
import { FormSection } from '../../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface TwilioWhatsappFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
}

export const TwilioWhatsappForm = ({ form, onFormChange }: TwilioWhatsappFormProps) => {
  const { t } = useLanguage('whatsapp');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6" data-tour="whatsapp-credentials">
      {/* Account SID */}
      <FormField
        label={t('twilioForm.fields.accountSid.label')}
        value={getStr('account_sid')}
        onChange={value => onFormChange('account_sid', value)}
        placeholder={t('twilioForm.fields.accountSid.placeholder')}
        required
      />

      {/* Auth Token */}
      <FormField
        label={
          form.use_api_key
            ? t('twilioForm.fields.authToken.label')
            : t('twilioForm.fields.authToken.label')
        }
        value={getStr('auth_token')}
        onChange={value => onFormChange('auth_token', value)}
        placeholder={t('twilioForm.fields.authToken.placeholder')}
        type="text"
        required
      />

      {/* API Key Option */}
      <div className="max-w-[65%] w-full">
        <FormCheckbox
          label={t('twilioForm.fields.useApiKey')}
          checked={!!form.use_api_key}
          onChange={checked => onFormChange('use_api_key', checked)}
        />
      </div>

      {/* API Key SID - conditionally shown */}
      {form.use_api_key && (
        <FormField
          label={t('twilioForm.fields.apiKeySid.label')}
          value={getStr('api_key_sid')}
          onChange={value => onFormChange('api_key_sid', value)}
          placeholder={t('twilioForm.fields.apiKeySid.placeholder')}
          required
        />
      )}

      {/* Messaging Service Option */}
      <div className="max-w-[65%] w-full">
        <FormCheckbox
          label={t('twilioForm.fields.useMessagingService')}
          checked={!!form.use_messaging_service}
          onChange={checked => onFormChange('use_messaging_service', checked)}
        />
      </div>

      {/* Messaging Service SID - conditionally shown */}
      {form.use_messaging_service ? (
        <FormField
          label={t('twilioForm.fields.messagingServiceSid.label')}
          value={getStr('messaging_service_sid')}
          onChange={value => onFormChange('messaging_service_sid', value)}
          placeholder={t('twilioForm.fields.messagingServiceSid.placeholder')}
          required
        />
      ) : (
        <div>
          <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
            {t('twilioForm.fields.phoneNumber.label')} <span className="text-destructive">*</span>
          </label>
          <PhoneInput
            value={getStr('phone_number')}
            onChange={value => onFormChange('phone_number', value)}
            placeholder={t('twilioForm.fields.phoneNumber.placeholder')}
            defaultCountry="BR"
          />
        </div>
      )}

      {/* Help Section */}
      <FormSection
        title={t('twilioForm.help.title')}
        className="bg-blue-50/10 border-blue-200/20"
        data-tour="whatsapp-help"
      >
        <div className="text-sm text-sidebar-foreground/70 space-y-2">
          <p>
            <strong>
              1. {t('twilioForm.fields.accountSid.label')}:
            </strong>{' '}
            {t('twilioForm.fields.accountSid.placeholder')}
          </p>
          <p>
            <strong>
              2. {t('twilioForm.fields.messagingServiceSid.label')}:
            </strong>{' '}
            {t('twilioForm.fields.messagingServiceSid.placeholder')}
          </p>
          <p>
            <strong>
              3. {t('twilioForm.fields.apiKeySid.label')}:
            </strong>{' '}
            {t('twilioForm.useApiKey')}
          </p>
          <p>
            <strong>
              4. {t('twilioForm.fields.phoneNumber.label')}:
            </strong>{' '}
            {t('twilioForm.fields.phoneNumber.placeholder')}
          </p>
        </div>
      </FormSection>
    </div>
  );
};
