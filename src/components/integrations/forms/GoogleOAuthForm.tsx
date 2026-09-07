import { useTranslation as useUiTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function GoogleOAuthForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="GOOGLE_OAUTH_CLIENT_ID"
        label={t("googleOAuth.clientId")}
        value={getValue('googleOauthClientId')}
        onChange={(value) => onConfigChange('googleOauthClientId', value)}
        placeholder="xxx.apps.googleusercontent.com"
      />
      <FormField
        id="GOOGLE_OAUTH_CLIENT_SECRET"
        label={t("googleOAuth.clientSecret")}
        value={getValue('googleOauthClientSecret')}
        onChange={(value) => onConfigChange('googleOauthClientSecret', value)}
        placeholder="GOCSPX-xxx"
        type="password"
      />
      <FormField
        id="GOOGLE_OAUTH_CALLBACK_URL"
        label={t("googleOAuth.callbackUrl")}
        value={getValue('googleOauthCallbackUrl')}
        onChange={(value) => onConfigChange('googleOauthCallbackUrl', value)}
        placeholder={tUi("adminSettings:socialLogin.google.placeholders.callbackUrl")}
        type="url"
        description={t("googleOAuth.callbackUrlDescription")}
      />
      <FormField
        id="GCP_PROJECT_ID"
        label={t("googleOAuth.gcpProjectId")}
        value={getValue('gcpProjectId')}
        onChange={(value) => onConfigChange('gcpProjectId', value)}
        placeholder={tUi("integrations:googleOAuth.placeholders.gcpProjectId")}
        description={t("googleOAuth.gcpProjectIdDescription")}
      />
      <FormField
        id="GMAIL_PUBSUB_TOPIC"
        label={t("googleOAuth.gmailPubsubTopic")}
        value={getValue('gmailPubsubTopic')}
        onChange={(value) => onConfigChange('gmailPubsubTopic', value)}
        placeholder="gmail-topic"
        description={t("googleOAuth.gmailPubsubTopicDescription")}
      />
    </div>
  );
}

