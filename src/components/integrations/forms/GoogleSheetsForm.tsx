import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function GoogleSheetsForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="GOOGLE_SHEETS_CLIENT_ID"
        label={t("googleSheets.clientId")}
        value={getValue('googleSheetsClientId')}
        onChange={(value) => onConfigChange('googleSheetsClientId', value)}
        placeholder="xxx.apps.googleusercontent.com"
      />
      <FormField
        id="GOOGLE_SHEETS_CLIENT_SECRET"
        label={t("googleSheets.clientSecret")}
        value={getValue('googleSheetsClientSecret')}
        onChange={(value) => onConfigChange('googleSheetsClientSecret', value)}
        placeholder="GOCSPX-xxx"
        type="password"
      />
      <FormField
        id="GOOGLE_SHEETS_REDIRECT_URI"
        label={t("googleSheets.redirectUri")}
        value={getValue('googleSheetsRedirectUri')}
        onChange={(value) => onConfigChange('googleSheetsRedirectUri', value)}
        placeholder="https://your-domain.com/google-sheets/callback"
        type="url"
        description={t("googleSheets.redirectUriDescription")}
      />
    </div>
  );
}
