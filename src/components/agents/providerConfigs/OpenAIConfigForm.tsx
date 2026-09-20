import { Label, Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

export interface OpenAIConfig {
  apiKey?: string;
  botType?: 'assistant' | 'chatCompletion';
  assistantId?: string;
  model?: string;
  maxTokens?: number;
}

interface OpenAIConfigFormProps {
  config: OpenAIConfig;
  onChange: (config: OpenAIConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  /** EVO-2250 story 2.7: the inline secret retired behind the migration
   * guard. Only the secret input locks; address fields stay editable. */
  secretRetired?: boolean;
  secretRetiredHint?: string;
}

export const OpenAIConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
  secretRetired = false,
  secretRetiredHint,
}: OpenAIConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="openai_apiKey">{t('edit.configuration.sections.externalIntegration.forms.openai.apiKey')}</Label>
        <Input
          id="openai_apiKey"
          type="password"
          value={config.apiKey || ''}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
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
        <Label htmlFor="openai_botType">{t('edit.configuration.sections.externalIntegration.forms.openai.botType')}</Label>
        <select
          id="openai_botType"
          value={config.botType || 'assistant'}
          onChange={(e) =>
            onChange({ ...config, botType: e.target.value as any })
          }
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="assistant">{t('edit.configuration.sections.externalIntegration.forms.openai.botTypes.assistant')}</option>
          <option value="chatCompletion">{t('edit.configuration.sections.externalIntegration.forms.openai.botTypes.chatCompletion')}</option>
        </select>
      </div>
      {config.botType === 'assistant' && (
        <div className="space-y-2">
          <Label htmlFor="openai_assistantId">{t('edit.configuration.sections.externalIntegration.forms.openai.assistantId')}</Label>
          <Input
            id="openai_assistantId"
            value={config.assistantId || ''}
            onChange={(e) => onChange({ ...config, assistantId: e.target.value })}
            placeholder="asst_..."
            disabled={disabled}
          />
          {errors.assistantId && (
            <p className="text-xs text-red-600">{errors.assistantId}</p>
          )}
        </div>
      )}
      {config.botType === 'chatCompletion' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="openai_model">{t('edit.configuration.sections.externalIntegration.forms.openai.model')}</Label>
            <Input
              id="openai_model"
              value={config.model || ''}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
              placeholder="gpt-4"
              disabled={disabled}
            />
            {errors.model && (
              <p className="text-xs text-red-600">{errors.model}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai_maxTokens">{t('edit.configuration.sections.externalIntegration.forms.openai.maxTokens')}</Label>
            <Input
              id="openai_maxTokens"
              type="number"
              value={config.maxTokens || 500}
              onChange={(e) =>
                onChange({ ...config, maxTokens: parseInt(e.target.value) })
              }
              disabled={disabled}
            />
          </div>
        </>
      )}
    </>
  );
};
