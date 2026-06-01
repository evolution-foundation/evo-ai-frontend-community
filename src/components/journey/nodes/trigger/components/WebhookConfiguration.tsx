import { useState, useEffect, useRef } from 'react';
import { Label, Input, Separator, Button, Badge, Textarea } from '@evoapi/design-system';
import { Copy } from 'lucide-react';
import {
  VariableInput,
  JourneyVariable,
  VariableMapping,
  type DataMapping,
} from '@/components/journey/environment-manager';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookConfigurationProps {
  webhookUrl: string;
  expectedHeaders?: Array<{
    name: string;
    value: string;
  }>;
  onWebhookUrlChange: (url: string) => void;
  onExpectedHeadersChange: (headers: Array<{ name: string; value: string }>) => void;
  journeyId?: string;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  onVariablesChange?: (variables: JourneyVariable[]) => void;
}

export function WebhookConfiguration({
  webhookUrl,
  expectedHeaders = [],
  onWebhookUrlChange,
  onExpectedHeadersChange,
  journeyId,
  variableMappings = [],
  onVariableMappingsChange,
}: WebhookConfigurationProps) {
  const { t } = useLanguage('journey');
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Paths comuns para webhooks
  const webhookPaths = [
    'webhook.headers.authorization',
    'webhook.headers.content-type',
    'webhook.body.contact_id',
    'webhook.body.timestamp',
  ];

  const [localHeaders, setLocalHeaders] = useState(expectedHeaders);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Generate the trigger webhook URL from the REAL journey id. Contexts without a
    // journey (trigger-type Campaigns / automations) pass no journeyId (EVO-1608, ex
    // sentinel 'campaign-trigger' que gerava uma URL .../trigger/campaign-trigger não
    // roteável). Nesses casos NÃO auto-geramos URL — o contexto deve fornecer a sua.
    // Campanha precisa de uma URL de trigger própria.
    if (journeyId && !webhookUrl) {
      const campaignApiUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'http://localhost:3000';
      const url = `${campaignApiUrl}/api/v1/journeys/trigger/${journeyId}`;
      setGeneratedUrl(url);
      onWebhookUrlChange(url);
    }
  }, [journeyId, webhookUrl, onWebhookUrlChange]);

  useEffect(() => {
    // Only update localHeaders if it's actually different and not from our own updates
    if (!isInitialized.current) {
      setLocalHeaders(expectedHeaders);
      isInitialized.current = true;
    } else if (JSON.stringify(expectedHeaders) !== JSON.stringify(localHeaders)) {
      setLocalHeaders(expectedHeaders);
    }
  }, [expectedHeaders]); // Remove localHeaders from dependencies

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast.success(t('triggerComponents.webhook.urlCopied'));
      // Você pode adicionar uma notificação de sucesso aqui
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
    }
  };

  const addHeader = () => {
    const newHeaders = [...localHeaders, { name: '', value: '' }];
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = localHeaders.filter((_, i) => i !== index);
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    const newHeaders = localHeaders.map((header, i) =>
      i === index ? { ...header, [field]: value } : header,
    );
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('triggerComponents.webhook.configuration')}
        </Label>

        {/* URL do Webhook */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.webhook.webhookUrl')}</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={webhookUrl || generatedUrl}
              placeholder={t('triggerComponents.webhook.urlPlaceholder')}
              className="flex-1 bg-sidebar border-sidebar-border text-sidebar-foreground min-w-[400px]"
              readOnly={true}
            />
            <Button
              onClick={() => copyToClipboard(webhookUrl || generatedUrl)}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-sidebar-foreground/60">
            {t('triggerComponents.webhook.urlDescription')}
          </p>
        </div>

        {/* Método HTTP */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.webhook.httpMethod')}</Label>
          <div className="flex gap-2">
            <div className="px-3 py-1 text-xs rounded-md transition-colors bg-blue-500 text-white">
              POST
            </div>
          </div>
        </div>

        {/* Autenticação */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('triggerComponents.webhook.authentication')}
          </Label>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>{t('triggerComponents.webhook.required')}:</strong>{' '}
              {t('triggerComponents.webhook.authDescription')}
            </p>
          </div>
        </div>

        {/* Headers Esperados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {t('triggerComponents.webhook.expectedHeaders')}
            </Label>
            <Button onClick={addHeader} variant="outline" size="sm" className="h-8 text-xs">
              {t('triggerComponents.webhook.addHeader')}
            </Button>
          </div>

          {localHeaders.length === 0 ? (
            <div className="p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50 text-center">
              <p className="text-xs text-sidebar-foreground/60">
                {t('triggerComponents.webhook.noCustomHeaders')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {localHeaders.map((header, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center p-2 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/30"
                >
                  <VariableInput
                    placeholder={t('triggerComponents.webhook.headerName')}
                    value={header.name}
                    onChange={e => updateHeader(index, 'name', e.target.value)}
                    className="flex-1 h-8 bg-sidebar border-sidebar-border text-sidebar-foreground text-xs"
                    onVariableInsert={variable => {
                      console.log('Variable inserted in header name:', variable);
                    }}
                    journeyId={journeyId}
                  />
                  <VariableInput
                    placeholder={t('triggerComponents.webhook.headerValue')}
                    value={header.value}
                    onChange={e => updateHeader(index, 'value', e.target.value)}
                    className="flex-1 h-8 bg-sidebar border-sidebar-border text-sidebar-foreground text-xs"
                    onVariableInsert={variable => {
                      console.log('Variable inserted in header value:', variable);
                    }}
                    journeyId={journeyId}
                  />
                  <Button
                    onClick={() => removeHeader(index)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payload de Exemplo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('triggerComponents.webhook.payloadStructure')}
          </Label>
          <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-md">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>{t('triggerComponents.webhook.flexible')}:</strong>{' '}
              {t('triggerComponents.webhook.dataFieldDescription')}
            </p>
          </div>
          <Textarea
            value={JSON.stringify(
              {
                contact_id: '<contact_id>',
                data: {
                  contact: {
                    id: '<contact_id>',
                    name: t('triggerComponents.webhook.exampleContactName'),
                    email: t('triggerComponents.webhook.exampleEmail'),
                  },
                },
              },
              null,
              2,
            )}
            rows={8}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground text-xs font-mono"
            readOnly
          />
        </div>

        {/* Descrição da Configuração */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('triggerComponents.webhook.description')}
            {localHeaders.length > 0 && (
              <span className="block mt-1">
                • {t('triggerComponents.webhook.customHeaders')}:{' '}
                {localHeaders.map(h => h.name).join(', ')}
              </span>
            )}
          </p>
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
              {t('triggerComponents.webhook.curlExample')}:
            </Label>
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
              {`curl --location '${
                import.meta.env.VITE_CAMPAIGN_API_URL || 'http://localhost:3000'
              }/api/v1/journeys/trigger/5286fd5c-7ed9-4c0c-ae3e-479e35047fb8' \\
--header 'Content-Type: application/json' \\
--header 'api_access_token: [SEU_API_TOKEN]' \\
--data-raw '{
  "contact_id": "uuid-do-contato",
  "data": {
    "contact": {
      "id": "uuid-do-contato",
      "name": "${t('triggerComponents.webhook.exampleContactName')}",
      "email": "${t('triggerComponents.webhook.exampleEmail')}"
    }
  }
}'`}
            </pre>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {t('triggerComponents.webhook.method')}: POST
            </Badge>
            {localHeaders.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {localHeaders.length} {t('triggerComponents.webhook.headersCount')}
              </Badge>
            )}
          </div>
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('triggerComponents.webhook.captureWebhookData')}
              </Label>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={webhookPaths}
                journeyId={journeyId}
                className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
