import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function NotionForm({ config, onConfigChange }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      <FormField
        id="NOTION_OAUTH_REDIRECT_URI"
        label={t("notion.redirectUri")}
        value={getValue('notionRedirectUri')}
        onChange={(value) => onConfigChange('notionRedirectUri', value)}
        placeholder={t("notion.placeholders.redirectUri")}
        type="url"
        description={t("notion.redirectUriDescription")}
      />
    </div>
  );
}

