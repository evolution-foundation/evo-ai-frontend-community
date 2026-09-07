import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function GoogleCalendarForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="GOOGLE_CALENDAR_CLIENT_ID"
        label={t("googleCalendar.clientId")}
        value={getValue('googleCalendarClientId')}
        onChange={(value) => onConfigChange('googleCalendarClientId', value)}
        placeholder="xxx.apps.googleusercontent.com"
      />
      <FormField
        id="GOOGLE_CALENDAR_CLIENT_SECRET"
        label={t("googleCalendar.clientSecret")}
        value={getValue('googleCalendarClientSecret')}
        onChange={(value) => onConfigChange('googleCalendarClientSecret', value)}
        placeholder="GOCSPX-xxx"
        type="password"
      />
      <FormField
        id="GOOGLE_CALENDAR_REDIRECT_URI"
        label={t("googleCalendar.redirectUri")}
        value={getValue('googleCalendarRedirectUri')}
        onChange={(value) => onConfigChange('googleCalendarRedirectUri', value)}
        placeholder="https://your-domain.com/google-calendar/callback"
        type="url"
        description={t("googleCalendar.redirectUriDescription")}
      />
    </div>
  );
}
