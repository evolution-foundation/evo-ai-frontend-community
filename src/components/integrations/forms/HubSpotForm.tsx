import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function HubSpotForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="HUBSPOT_OAUTH_CLIENT_ID"
        label={t("hubspot.clientId")}
        value={getValue('hubspotClientId')}
        onChange={(value) => onConfigChange('hubspotClientId', value)}
        placeholder={t("hubspot.placeholders.clientId")}
        description={t("hubspot.clientIdDescription")}
      />
      <FormField
        id="HUBSPOT_OAUTH_CLIENT_SECRET"
        label={t("hubspot.clientSecret")}
        value={getValue('hubspotClientSecret')}
        onChange={(value) => onConfigChange('hubspotClientSecret', value)}
        placeholder={t("hubspot.placeholders.clientSecret")}
        type="password"
        description={t("hubspot.clientSecretDescription")}
      />
      <FormField
        id="HUBSPOT_OAUTH_REDIRECT_URI"
        label={t("hubspot.redirectUri")}
        value={getValue('hubspotRedirectUri')}
        onChange={(value) => onConfigChange('hubspotRedirectUri', value)}
        placeholder={t("hubspot.placeholders.redirectUri")}
        type="url"
        description={t("hubspot.redirectUriDescription")}
      />
      <FormField
        id="HUBSPOT_MCP_REDIRECT_URI"
        label={t("hubspot.mcpRedirectUri")}
        value={getValue('hubspotMcpRedirectUri')}
        onChange={(value) => onConfigChange('hubspotMcpRedirectUri', value)}
        placeholder={t("hubspot.placeholders.mcpRedirectUri")}
        type="url"
        description={t("hubspot.mcpRedirectUriDescription")}
      />
    </div>
  );
}
