import { useLanguage } from '@/hooks/useLanguage';
import { FormField, FormSwitch } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function InstagramForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  const getBoolean = (key: string, defaultValue = false) => {
    const value = config[key];
    return typeof value === 'boolean' ? value : defaultValue;
  };

  // Generate redirect URI dynamically based on current origin
  const redirectUri = `${window.location.origin}/instagram/callback`;

  return (
    <div className="space-y-4">
      <FormField
        id="INSTAGRAM_APP_ID"
        label={t("instagram.appId")}
        value={getValue('igAppId')}
        onChange={(value) => onConfigChange('igAppId', value)}
        placeholder={t("instagram.placeholders.appId")}
      />
      <FormField
        id="INSTAGRAM_APP_SECRET"
        label={t("instagram.appSecret")}
        value={getValue('igAppSecret')}
        onChange={(value) => onConfigChange('igAppSecret', value)}
        placeholder={t("instagram.placeholders.appSecret")}
        type="password"
      />
      <FormField
        id="INSTAGRAM_VERIFY_TOKEN"
        label={t("instagram.verifyToken")}
        value={getValue('igVerifyToken')}
        onChange={(value) => onConfigChange('igVerifyToken', value)}
        placeholder={t("instagram.placeholders.verifyToken")}
        type="password"
      />
      <FormField
        id="INSTAGRAM_API_VERSION"
        label={t("instagram.apiVersion")}
        value={getValue('igApiVersion', 'v23.0')}
        onChange={(value) => onConfigChange('igApiVersion', value)}
        placeholder={t("instagram.placeholders.apiVersion")}
      />
      <FormField
        id="INSTAGRAM_REDIRECT_URI"
        label={t("instagram.redirectUri")}
        value={redirectUri}
        onChange={() => {}}
        placeholder={redirectUri}
        type="url"
        readOnly={true}
        description={t("instagram.redirectUriDescription")}
      />
      <FormSwitch
        id="ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT"
        label={t("instagram.enableHumanAgent")}
        checked={getBoolean('igEnableHumanAgent', false)}
        onCheckedChange={(checked) => onConfigChange('igEnableHumanAgent', checked)}
        description={t("instagram.enableHumanAgentDescription")}
      />
    </div>
  );
}

