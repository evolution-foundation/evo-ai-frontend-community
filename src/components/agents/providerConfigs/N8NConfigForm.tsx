import { Label, Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

export interface N8NConfig {
  webhookUrl?: string;
  basicAuthUser?: string;
  basicAuthPass?: string;
}

interface N8NConfigFormProps {
  config: N8NConfig;
  onChange: (config: N8NConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  /** EVO-2250 story 2.7: the inline secret retired behind the migration
   * guard. Only the secret input locks; address fields stay editable. */
  secretRetired?: boolean;
  secretRetiredHint?: string;
}

export const N8NConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
  secretRetired = false,
  secretRetiredHint,
}: N8NConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="n8n_webhookUrl">{t('edit.configuration.sections.externalIntegration.forms.n8n.webhookUrl')}</Label>
        <Input
          id="n8n_webhookUrl"
          value={config.webhookUrl || ''}
          onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
          placeholder="https://n8n.example.com/webhook/..."
          disabled={disabled}
        />
        {errors.webhookUrl && (
          <p className="text-xs text-red-600">{errors.webhookUrl}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="n8n_basicAuthUser">{t('edit.configuration.sections.externalIntegration.forms.n8n.basicAuthUser')}</Label>
          <Input
            id="n8n_basicAuthUser"
            value={config.basicAuthUser || ''}
            onChange={(e) => onChange({ ...config, basicAuthUser: e.target.value })}
            disabled={disabled || secretRetired}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="n8n_basicAuthPass">{t('edit.configuration.sections.externalIntegration.forms.n8n.basicAuthPass')}</Label>
          <Input
            id="n8n_basicAuthPass"
            type="password"
            value={config.basicAuthPass || ''}
            onChange={(e) => onChange({ ...config, basicAuthPass: e.target.value })}
            disabled={disabled || secretRetired}
          />
          {secretRetired && secretRetiredHint && (
          <p className="text-xs text-muted-foreground">{secretRetiredHint}</p>
        )}
      </div>
      </div>
    </>
  );
};
