import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function EvolutionForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="EVOLUTION_API_URL"
        label={t("evolution.apiUrl")}
        value={getValue('evolutionApiUrl')}
        onChange={(value) => onConfigChange('evolutionApiUrl', value)}
        placeholder={t("evolution.placeholders.apiUrl")}
        type="url"
      />
      <FormField
        id="EVOLUTION_ADMIN_TOKEN"
        label={t("evolution.adminToken")}
        value={getValue('evolutionAdminToken')}
        onChange={(value) => onConfigChange('evolutionAdminToken', value)}
        placeholder={t("evolution.placeholders.adminToken")}
        type="password"
      />
    </div>
  );
}

