import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function LinearForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="LINEAR_CLIENT_ID"
        label={t("linear.clientId")}
        value={getValue('linearClientId')}
        onChange={(value) => onConfigChange('linearClientId', value)}
        placeholder={t("linear.placeholders.clientId")}
        type="text"
        description={t("linear.clientIdDescription")}
      />
      <FormField
        id="LINEAR_CLIENT_SECRET"
        label={t("linear.clientSecret")}
        value={getValue('linearClientSecret')}
        onChange={(value) => onConfigChange('linearClientSecret', value)}
        placeholder={t("linear.placeholders.clientSecret")}
        type="password"
        description={t("linear.clientSecretDescription")}
      />
      <FormField
        id="LINEAR_REDIRECT_URI"
        label={t("linear.redirectUri")}
        value={getValue('linearRedirectUri')}
        onChange={(value) => onConfigChange('linearRedirectUri', value)}
        placeholder={t("linear.placeholders.redirectUri")}
        type="url"
        description={t("linear.redirectUriDescription")}
      />
      <FormField
        id="LINEAR_OAUTH_REDIRECT_URI"
        label={t("linear.mcpRedirectUri")}
        value={getValue('linearMcpRedirectUri')}
        onChange={(value) => onConfigChange('linearMcpRedirectUri', value)}
        placeholder={t("linear.placeholders.mcpRedirectUri")}
        type="url"
        description={t("linear.mcpRedirectUriDescription")}
      />
    </div>
  );
}
