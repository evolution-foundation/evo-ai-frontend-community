import { Label, Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

export interface DifyConfig {
  apiUrl?: string;
  apiKey?: string;
  botType?: 'chatBot' | 'textGenerator' | 'agent';
}

interface DifyConfigFormProps {
  config: DifyConfig;
  onChange: (config: DifyConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  /** EVO-2250 story 2.7: the inline secret retired behind the migration
   * guard. Only the secret input locks; address fields stay editable. */
  secretRetired?: boolean;
  secretRetiredHint?: string;
}

export const DifyConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
  secretRetired = false,
  secretRetiredHint,
}: DifyConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dify_apiUrl">{t('edit.configuration.sections.externalIntegration.forms.dify.apiUrl')}</Label>
        <Input
          id="dify_apiUrl"
          value={config.apiUrl || ''}
          onChange={(e) => onChange({ ...config, apiUrl: e.target.value })}
          placeholder="https://api.dify.ai/v1"
          disabled={disabled}
        />
        {errors.apiUrl && (
          <p className="text-xs text-red-600">{errors.apiUrl}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dify_apiKey">{t('edit.configuration.sections.externalIntegration.forms.dify.apiKey')}</Label>
        <Input
          id="dify_apiKey"
          type="password"
          value={config.apiKey || ''}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          placeholder="app-..."
          disabled={disabled || secretRetired}
        />
        {errors.apiKey && (
          <p className="text-xs text-red-600">{errors.apiKey}</p>
        )}
        {secretRetired && secretRetiredHint && (
          <p className="text-xs text-muted-foreground">{secretRetiredHint}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dify_botType">{t('edit.configuration.sections.externalIntegration.forms.dify.botType')}</Label>
        <select
          id="dify_botType"
          value={config.botType || 'chatBot'}
          onChange={(e) =>
            onChange({ ...config, botType: e.target.value as any })
          }
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="chatBot">{t('edit.configuration.sections.externalIntegration.forms.dify.botTypes.chatBot')}</option>
          <option value="textGenerator">{t('edit.configuration.sections.externalIntegration.forms.dify.botTypes.textGenerator')}</option>
          <option value="agent">{t('edit.configuration.sections.externalIntegration.forms.dify.botTypes.agent')}</option>
        </select>
      </div>
    </>
  );
};
