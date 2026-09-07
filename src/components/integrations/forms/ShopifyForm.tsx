import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function ShopifyForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="SHOPIFY_CLIENT_ID"
        label={t("shopify.clientId")}
        value={getValue('shopifyClientId')}
        onChange={(value) => onConfigChange('shopifyClientId', value)}
        placeholder={t("shopify.placeholders.clientId")}
      />
      <FormField
        id="SHOPIFY_CLIENT_SECRET"
        label={t("shopify.clientSecret")}
        value={getValue('shopifyClientSecret')}
        onChange={(value) => onConfigChange('shopifyClientSecret', value)}
        placeholder={t("shopify.placeholders.clientSecret")}
        type="password"
      />
    </div>
  );
}

