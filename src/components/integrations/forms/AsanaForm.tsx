import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function AsanaForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="ASANA_OAUTH_REDIRECT_URI"
        label={t("asana.redirectUri")}
        value={getValue('asanaRedirectUri')}
        onChange={(value) => onConfigChange('asanaRedirectUri', value)}
        placeholder={t("asana.placeholders.redirectUri")}
        type="url"
        description={t("asana.redirectUriDescription")}
      />
    </div>
  );
}

