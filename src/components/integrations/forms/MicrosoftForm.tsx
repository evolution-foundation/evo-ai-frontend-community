import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function MicrosoftForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="AZURE_APP_ID"
        label={t("microsoft.appId")}
        value={getValue('azureAppId')}
        onChange={(value) => onConfigChange('azureAppId', value)}
        placeholder={t("microsoft.placeholders.appId")}
      />
      <FormField
        id="AZURE_APP_SECRET"
        label={t("microsoft.appSecret")}
        value={getValue('azureAppSecret')}
        onChange={(value) => onConfigChange('azureAppSecret', value)}
        placeholder={t("microsoft.placeholders.appSecret")}
        type="password"
      />
    </div>
  );
}

