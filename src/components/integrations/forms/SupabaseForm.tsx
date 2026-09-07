import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function SupabaseForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="SUPABASE_OAUTH_REDIRECT_URI"
        label={t("supabase.redirectUri")}
        value={getValue('supabaseRedirectUri')}
        onChange={(value) => onConfigChange('supabaseRedirectUri', value)}
        placeholder={t("supabase.placeholders.redirectUri")}
        type="url"
        description={t("supabase.redirectUriDescription")}
      />
    </div>
  );
}
