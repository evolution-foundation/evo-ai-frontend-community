import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../../shared/FormField';
import { FormCheckbox } from '../../shared/FormCheckbox';
import { FormSection } from '../../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface EvolutionGoFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
  hasEvolutionGoConfig: boolean;
}

export const EvolutionGoForm = ({ form, onFormChange, hasEvolutionGoConfig }: EvolutionGoFormProps) => {
  const { t } = useLanguage('whatsapp');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6">
      {/* Basic Configuration - Only show API/Token if not auto-filled */}
      {!hasEvolutionGoConfig && (
        <>
          <FormField
            label={t('evolutionGoForm.fields.apiUrl.label')}
            value={getStr('api_url')}
            onChange={value => onFormChange('api_url', value)}
            placeholder={t('evolutionGoForm.fields.apiUrl.placeholder')}
            type="url"
            required
          />

          <FormField
            label={t('evolutionGoForm.fields.adminToken.label')}
            value={getStr('admin_token')}
            onChange={value => onFormChange('admin_token', value)}
            placeholder={t('evolutionGoForm.fields.adminToken.placeholder')}
            type="password"
            required
          />
        </>
      )}

      <div data-tour="whatsapp-credentials">
        <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
          {t('evolutionGoForm.fields.phoneNumber.label')} <span className="text-destructive">*</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder={t('evolutionGoForm.fields.phoneNumber.placeholder')}
          defaultCountry="BR"
        />
      </div>

      {/* Optional fields populated after verification */}
      {getStr('instance_uuid') && (
        <FormField
          label={t('evolutionGoForm.fields.instanceUuid.label')}
          value={getStr('instance_uuid')}
          onChange={value => onFormChange('instance_uuid', value)}
          placeholder={t('evolutionGoForm.fields.instanceUuid.placeholder')}
          readOnly
        />
      )}

      {getStr('instance_token') && (
        <FormField
          label={t('evolutionGoForm.fields.instanceToken.label')}
          value={getStr('instance_token')}
          onChange={value => onFormChange('instance_token', value)}
          placeholder={t('evolutionGoForm.fields.instanceToken.placeholder')}
          type="password"
          readOnly
        />
      )}

      {/* Advanced Settings - Evolution Go */}
      <FormSection
        title={t('evolutionGoForm.sections.instance.title')}
        className="bg-gray-50/10 border-gray-200/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Always Online */}
          <FormCheckbox
            label={t('evolutionGoForm.sections.instance.alwaysOnline')}
            checked={!!form.alwaysOnline}
            onChange={checked => onFormChange('alwaysOnline', checked)}
          />

          {/* Reject Call */}
          <FormCheckbox
            label={t('evolutionGoForm.sections.instance.rejectCall')}
            checked={!!form.rejectCall}
            onChange={checked => onFormChange('rejectCall', checked)}
          />

          {/* Read Messages */}
          <FormCheckbox
            label={t('evolutionGoForm.sections.instance.readMessages')}
            checked={!!form.readMessages}
            onChange={checked => onFormChange('readMessages', checked)}
          />

          {/* Ignore Groups */}
          <FormCheckbox
            label={t('evolutionGoForm.sections.instance.ignoreGroups')}
            checked={!!form.ignoreGroups}
            onChange={checked => onFormChange('ignoreGroups', checked)}
          />

          {/* Ignore Status */}
          <div className="md:col-span-2">
            <FormCheckbox
              label={t('evolutionGoForm.sections.instance.ignoreStatus')}
              checked={!!form.ignoreStatus}
              onChange={checked => onFormChange('ignoreStatus', checked)}
            />
          </div>
        </div>
      </FormSection>

      {/* Help Section */}
      <FormSection
        title={t('evolutionGoForm.help.title')}
        className="bg-green-50/10 border-green-200/20"
        data-tour="whatsapp-help"
      >
        <div className="text-sm text-sidebar-foreground/70 space-y-2">
          <p><strong>{t('evolutionGoForm.help.performance.title')}:</strong> {t('evolutionGoForm.help.performance.description')}</p>
          <p><strong>{t('evolutionGoForm.help.stability.title')}:</strong> {t('evolutionGoForm.help.stability.description')}</p>
          <p><strong>{t('evolutionGoForm.help.features.title')}:</strong> {t('evolutionGoForm.help.features.description')}</p>
          <p><strong>{t('evolutionGoForm.help.uuidToken.title')}:</strong> {t('evolutionGoForm.help.uuidToken.description')}</p>
        </div>
      </FormSection>
    </div>
  );
};
