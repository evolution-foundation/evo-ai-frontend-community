import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function AtlassianForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="ATLASSIAN_OAUTH_REDIRECT_URI"
        label={t("atlassian.redirectUri")}
        value={getValue('atlassianRedirectUri')}
        onChange={(value) => onConfigChange('atlassianRedirectUri', value)}
        placeholder={t("atlassian.placeholders.redirectUri")}
        type="url"
        description={t("atlassian.redirectUriDescription")}
      />
    </div>
  );
}

