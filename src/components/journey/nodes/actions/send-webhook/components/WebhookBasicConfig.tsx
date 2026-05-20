import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookBasicConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}


export function WebhookBasicConfig({ data, onChange, journeyId }: WebhookBasicConfigProps) {
  const { t } = useLanguage('journey');

  const HTTP_METHODS = [
    { value: 'GET', label: t('panels.sendWebhook.basic.methods.get.label'), description: t('panels.sendWebhook.basic.methods.get.description') },
    { value: 'POST', label: t('panels.sendWebhook.basic.methods.post.label'), description: t('panels.sendWebhook.basic.methods.post.description') },
    { value: 'PUT', label: t('panels.sendWebhook.basic.methods.put.label'), description: t('panels.sendWebhook.basic.methods.put.description') },
    { value: 'PATCH', label: t('panels.sendWebhook.basic.methods.patch.label'), description: t('panels.sendWebhook.basic.methods.patch.description') },
    { value: 'DELETE', label: t('panels.sendWebhook.basic.methods.delete.label'), description: t('panels.sendWebhook.basic.methods.delete.description') },
  ];
  const handleUrlChange = (value: string) => {
    onChange({ webhookUrl: value });
  };

  const handleMethodChange = (value: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => {
    onChange({ method: value });
  };

  const handleTimeoutChange = (value: string) => {
    const timeout = parseInt(value) || 30;
    onChange({ timeout: Math.max(1, Math.min(300, timeout)) }); // Entre 1 e 300 segundos
  };

  const handleRetryChange = (value: string) => {
    const retryAttempts = parseInt(value) || 0;
    onChange({ retryAttempts: Math.max(0, Math.min(5, retryAttempts)) }); // Entre 0 e 5 tentativas
  };

  return (
    <div className="space-y-4">
      {/* URL do Webhook */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.basic.endpointUrl')}</Label>
        <VariableInput
          type="url"
          value={data.webhookUrl || ''}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder={t('panels.sendWebhook.basic.urlPlaceholder')}
          className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
          journeyId={journeyId}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('panels.sendWebhook.basic.urlDescription')}
        </p>
      </div>

      {/* Método HTTP */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.basic.httpMethod')}</Label>
        <Select value={data.method || 'POST'} onValueChange={handleMethodChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {HTTP_METHODS.map(method => (
              <SelectItem
                key={method.value}
                value={method.value}
                className="text-sidebar-foreground"
              >
                <div>
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-muted-foreground">{method.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Configurações avançadas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendWebhook.basic.timeout')}</Label>
          <Input
            type="number"
            min="1"
            max="300"
            value={data.timeout || 30}
            onChange={e => handleTimeoutChange(e.target.value)}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('panels.sendWebhook.basic.timeoutDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendWebhook.basic.retryAttempts')}</Label>
          <Input
            type="number"
            min="0"
            max="5"
            value={data.retryAttempts || 0}
            onChange={e => handleRetryChange(e.target.value)}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('panels.sendWebhook.basic.retryDescription')}
          </p>
        </div>
      </div>

      {/* Preview da configuração */}
      {data.webhookUrl && (
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>{t('panels.sendWebhook.basic.summaryTitle')}</strong> {t('panels.sendWebhook.basic.summaryRequest', { method: data.method || 'POST' })}{' '}
            <span className="font-mono text-xs break-all">{data.webhookUrl}</span>
            {data.timeout !== 30 && <span className="block mt-1">{t('panels.sendWebhook.basic.summaryTimeout', { timeout: data.timeout })}</span>}
            {data.retryAttempts && data.retryAttempts > 0 && (
              <span className="block mt-1">{t('panels.sendWebhook.basic.summaryRetries', { retries: data.retryAttempts })}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
