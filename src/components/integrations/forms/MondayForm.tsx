import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function MondayForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="MONDAY_OAUTH_REDIRECT_URI"
        label={t("monday.redirectUri")}
        value={getValue('mondayRedirectUri')}
        onChange={(value) => onConfigChange('mondayRedirectUri', value)}
        placeholder={t("monday.placeholders.redirectUri")}
        type="url"
        description={t("monday.redirectUriDescription")}
      />
    </div>
  );
}

