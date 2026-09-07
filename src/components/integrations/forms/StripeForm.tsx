import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function StripeForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="STRIPE_OAUTH_CLIENT_ID"
        label={t("stripe.clientId")}
        value={getValue('stripeClientId')}
        onChange={(value) => onConfigChange('stripeClientId', value)}
        placeholder={t("stripe.placeholders.clientId")}
        description={t("stripe.clientIdDescription")}
      />
      <FormField
        id="STRIPE_OAUTH_CLIENT_SECRET"
        label={t("stripe.clientSecret")}
        value={getValue('stripeClientSecret')}
        onChange={(value) => onConfigChange('stripeClientSecret', value)}
        placeholder={t("stripe.placeholders.clientSecret")}
        type="password"
        description={t("stripe.clientSecretDescription")}
      />
      <FormField
        id="STRIPE_OAUTH_REDIRECT_URI"
        label={t("stripe.redirectUri")}
        value={getValue('stripeRedirectUri')}
        onChange={(value) => onConfigChange('stripeRedirectUri', value)}
        placeholder={t("stripe.placeholders.redirectUri")}
        type="url"
        description={t("stripe.redirectUriDescription")}
      />
      <FormField
        id="STRIPE_OAUTH_AUTHORIZATION_URL"
        label={t("stripe.authorizationUrl")}
        value={getValue('stripeAuthorizationUrl')}
        onChange={(value) => onConfigChange('stripeAuthorizationUrl', value)}
        placeholder={t("stripe.placeholders.authorizationUrl")}
        type="url"
        description={t("stripe.authorizationUrlDescription")}
      />
    </div>
  );
}

