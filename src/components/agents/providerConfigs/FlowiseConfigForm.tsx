import { Label, Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

export interface FlowiseConfig {
  apiUrl?: string;
  apiKey?: string;
}

interface FlowiseConfigFormProps {
  config: FlowiseConfig;
  onChange: (config: FlowiseConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  /** EVO-2250 story 2.7: the inline secret retired behind the migration
   * guard. Only the secret input locks; address fields stay editable. */
  secretRetired?: boolean;
  secretRetiredHint?: string;
}

export const FlowiseConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
  secretRetired = false,
  secretRetiredHint,
}: FlowiseConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="flowise_apiUrl">{t('edit.configuration.sections.externalIntegration.forms.flowise.apiUrl')}</Label>
        <Input
          id="flowise_apiUrl"
          value={config.apiUrl || ''}
          onChange={(e) => onChange({ ...config, apiUrl: e.target.value })}
          placeholder="https://flowise.example.com/api/v1/prediction/{chatflowId}"
          disabled={disabled}
        />
        {errors.apiUrl && (
          <p className="text-xs text-red-600">{errors.apiUrl}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="flowise_apiKey">{t('edit.configuration.sections.externalIntegration.forms.flowise.apiKey')}</Label>
        <Input
          id="flowise_apiKey"
          type="password"
          value={config.apiKey || ''}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          disabled={disabled || secretRetired}
        />
        {secretRetired && secretRetiredHint && (
          <p className="text-xs text-muted-foreground">{secretRetiredHint}</p>
        )}
      </div>
    </>
  );
};
