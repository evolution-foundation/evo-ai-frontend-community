import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../shared/FormField';
import { FormCheckbox } from '../shared/FormCheckbox';
import { FormSection } from '../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface SmsFormProps {
  selectedProvider: ProviderType;
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
}

export const SmsForm = ({ selectedProvider, form, onFormChange }: SmsFormProps) => {
  const { t } = useLanguage('sms');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  if (selectedProvider.id === 'twilio') {
    return (
      <div className="space-y-6">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="sms-credentials">
          <FormField
            label={t('fields.twilio.accountSid.label')}
            value={getStr('account_sid')}
            onChange={value => onFormChange('account_sid', value)}
            placeholder={t('fields.twilio.accountSid.placeholder')}
            required
            helpText={t('fields.twilio.accountSid.helpText')}
          />
          <FormField
            label={t('fields.twilio.authToken.label')}
            value={getStr('auth_token')}
            onChange={value => onFormChange('auth_token', value)}
            placeholder={t('fields.twilio.authToken.placeholder')}
            type="password"
            required
            helpText={t('fields.twilio.authToken.helpText')}
          />
        </div>

        {/* Advanced Authentication */}
        <FormSection
          title={t('fields.advancedAuth.title')}
          description={t('fields.advancedAuth.description')}
        >
          <div className="space-y-4">
            <FormCheckbox
              label={t('fields.advancedAuth.useApiKey')}
              checked={!!form.use_api_key}
              onChange={checked => onFormChange('use_api_key', checked)}
            />

            {form.use_api_key && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label={t('fields.advancedAuth.apiKeySid.label')}
                  value={getStr('api_key_sid')}
                  onChange={value => onFormChange('api_key_sid', value)}
                  placeholder={t('fields.twilio.advancedAuth.apiKeySid.placeholder')}
                  required
                  helpText={t('fields.advancedAuth.apiKeySid.helpText')}
                />
              </div>
            )}
          </div>
        </FormSection>

        {/* Phone Configuration */}
        <FormSection
          title={t('fields.phoneConfig.title')}
          description={t('fields.phoneConfig.description')}
          data-tour="sms-phone-config"
        >
          <div className="space-y-4">
            <FormCheckbox
              label={t('fields.phoneConfig.useMessagingService')}
              checked={!!form.use_messaging_service}
              onChange={checked => onFormChange('use_messaging_service', checked)}
            />

            {form.use_messaging_service ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label={t('fields.phoneConfig.messagingServiceSid.label')}
                  value={getStr('messaging_service_sid')}
                  onChange={value => onFormChange('messaging_service_sid', value)}
                  placeholder={t('fields.phoneConfig.messagingServiceSid.placeholder')}
                  required
                  helpText={t('fields.twilio.phoneConfig.messagingServiceSid.helpText')}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
                    {t('fields.phoneNumber.label')} <span className="text-destructive">*</span>
                  </label>
                  <PhoneInput
                    value={getStr('phone_number')}
                    onChange={value => onFormChange('phone_number', value)}
                    placeholder={t('fields.phoneNumber.placeholder')}
                    defaultCountry="BR"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('fields.twilio.phoneNumber.helpText')}</p>
                </div>
              </div>
            )}
          </div>
        </FormSection>
      </div>
    );
  }

  if (selectedProvider.id === 'bandwidth') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="sms-credentials">
          <div>
            <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
              {t('fields.bandwidth.phoneNumber.label')} <span className="text-destructive">*</span>
            </label>
            <PhoneInput
              value={getStr('phone_number')}
              onChange={value => onFormChange('phone_number', value)}
              placeholder={t('fields.bandwidth.phoneNumber.placeholder')}
              defaultCountry="BR"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('fields.bandwidth.phoneNumber.helpText')}</p>
          </div>
          <FormField
            label={t('fields.bandwidth.apiToken.label')}
            value={getStr('api_key')}
            onChange={value => onFormChange('api_key', value)}
            placeholder={t('fields.bandwidth.apiToken.placeholder')}
            required
          />
          <FormField
            label={t('fields.bandwidth.apiSecret.label')}
            value={getStr('api_secret')}
            onChange={value => onFormChange('api_secret', value)}
            placeholder={t('fields.bandwidth.apiSecret.placeholder')}
            type="password"
            required
          />
          <FormField
            label={t('fields.bandwidth.applicationId.label')}
            value={getStr('application_id')}
            onChange={value => onFormChange('application_id', value)}
            placeholder={t('fields.bandwidth.applicationId.placeholder')}
            required
          />
          <FormField
            label={t('fields.bandwidth.accountId.label')}
            value={getStr('account_id')}
            onChange={value => onFormChange('account_id', value)}
            placeholder={t('fields.bandwidth.accountId.placeholder')}
            required
          />
        </div>

        <FormSection
          title={t('fields.bandwidth.info.title')}
          className="bg-orange-50/10 border-orange-200/20"
          data-tour="sms-phone-config"
        >
          <div className="text-sm text-sidebar-foreground/70 space-y-2">
            <p><strong>API Key & Secret:</strong> {t('fields.bandwidth.info.apiKeyInfo')}</p>
            <p><strong>Application ID:</strong> {t('fields.bandwidth.info.applicationIdInfo')}</p>
            <p><strong>Account ID:</strong> {t('fields.bandwidth.info.accountIdInfo')}</p>
          </div>
        </FormSection>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-sidebar-foreground/70">
        {t('errors.providerNotImplemented', { provider: selectedProvider.name })}
      </p>
    </div>
  );
};
