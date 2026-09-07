import { useTranslation as useUiTranslation } from 'react-i18next';
import { Label, Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

export interface TypebotConfig {
  url?: string;
  typebot?: string;
  apiVersion?: 'latest' | string;
}

interface TypebotConfigFormProps {
  config: TypebotConfig;
  onChange: (config: TypebotConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const TypebotConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
}: TypebotConfigFormProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="typebot_url">{t('edit.configuration.sections.externalIntegration.forms.typebot.url')}</Label>
        <Input
          id="typebot_url"
          value={config.url || ''}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://typebot.example.com"
          disabled={disabled}
        />
        {errors.url && (
          <p className="text-xs text-red-600">{errors.url}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="typebot_typebot">{t('edit.configuration.sections.externalIntegration.forms.typebot.typebotId')}</Label>
        <Input
          id="typebot_typebot"
          value={config.typebot || ''}
          onChange={(e) => onChange({ ...config, typebot: e.target.value })}
          placeholder={tUi("interface:typebotconfigform.typebotPublicId")}
          disabled={disabled}
        />
        {errors.typebot && (
          <p className="text-xs text-red-600">{errors.typebot}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="typebot_apiVersion">{t('edit.configuration.sections.externalIntegration.forms.typebot.apiVersion')}</Label>
        <select
          id="typebot_apiVersion"
          value={config.apiVersion || 'latest'}
          onChange={(e) => onChange({ ...config, apiVersion: e.target.value })}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="latest">{t('edit.configuration.sections.externalIntegration.forms.typebot.apiVersions.latest')}</option>
          <option value="legacy">{t('edit.configuration.sections.externalIntegration.forms.typebot.apiVersions.legacy')}</option>
        </select>
      </div>
    </>
  );
};
