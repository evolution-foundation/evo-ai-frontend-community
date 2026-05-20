import { Send, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface WebhookResponseMapping {
  id: string;
  jsonPath: string;
  variableName: string;
  description?: string;
}

export interface SendWebhookNodeData {
  label: string;
  description?: string;
  webhookUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: WebhookHeader[];
  body?: string;
  bodyType?: 'json' | 'form' | 'text' | 'xml';
  timeout?: number;
  retryAttempts?: number;
  authenticationType?: 'none' | 'bearer' | 'basic' | 'api_key';
  authToken?: string;
  authUsername?: string;
  authPassword?: string;
  authApiKey?: string;
  authApiKeyHeader?: string;
  responseMappings?: WebhookResponseMapping[];
}

export interface SendWebhookNodeType {
  id: string;
  type: 'send-webhook-node';
  position: { x: number; y: number };
  data: SendWebhookNodeData;
}

interface SendWebhookNodeProps {
  selected: boolean;
  data: SendWebhookNodeData;
  id: string;
}

export function SendWebhookNode({ selected, data, id }: SendWebhookNodeProps) {
  const { t } = useLanguage('journey');

  const getWebhookDescription = () => {
    if (!data.webhookUrl) {
      return t('flowEditor.nodes.sendWebhook.configure');
    }

    const method = data.method || 'POST';
    const url = data.webhookUrl;

    // Extrair o domínio da URL para exibição
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;

      return `${method} ${domain}${path}`;
    } catch {
      return `${method} ${url}`;
    }
  };

  const getStatusIndicators = () => {
    const indicators = [];

    if (data.authenticationType && data.authenticationType !== 'none') {
      indicators.push(t('flowEditor.nodes.sendWebhook.indicators.auth'));
    }

    if (data.headers && data.headers.length > 0) {
      indicators.push(t('flowEditor.nodes.sendWebhook.indicators.headers', { count: data.headers.length }));
    }

    if (data.retryAttempts && data.retryAttempts > 0) {
      indicators.push(t('flowEditor.nodes.sendWebhook.indicators.retries', { count: data.retryAttempts }));
    }

    if (data.responseMappings && data.responseMappings.length > 0) {
      indicators.push(t('flowEditor.nodes.sendWebhook.indicators.variables', { count: data.responseMappings.length }));
    }

    return indicators;
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="purple"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="send-webhook-output"
      targetHandleId="send-webhook-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('flowEditor.nodes.sendWebhook.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Descrição principal */}
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed font-medium">
            {getWebhookDescription()}
          </p>

          {/* Método HTTP */}
          {data.webhookUrl && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                data.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                data.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                data.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                data.method === 'PATCH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                data.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {data.method || 'POST'}
              </span>

              {/* Indicadores de configuração */}
              {getStatusIndicators().map((indicator, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  {indicator}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mapeamentos de resposta configurados */}
        {data.responseMappings && data.responseMappings.length > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-2">
              {t('flowEditor.nodes.sendWebhook.mappedVariables')}:
            </p>
            <div className="space-y-1">
              {data.responseMappings.slice(0, 3).map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-300 font-mono">
                    {mapping.jsonPath}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">→</span>
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {mapping.variableName}
                  </span>
                </div>
              ))}
              {data.responseMappings.length > 3 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                  {t('flowEditor.nodes.sendWebhook.moreVariables', { count: data.responseMappings.length - 3 })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Estado não configurado */}
        {!data.webhookUrl && (
          <div className="p-3 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 dark:bg-purple-950/20 text-center">
            <Send className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-purple-600 dark:text-purple-300">{t('flowEditor.nodes.sendWebhook.configureEndpoint')}</p>
          </div>
        )}
      </div>
    </BaseFlowNode>
  );
}
