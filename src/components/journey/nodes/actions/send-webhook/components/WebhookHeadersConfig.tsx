import { useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { SendWebhookNodeData, WebhookHeader } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookHeadersConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

const COMMON_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
  { key: 'User-Agent', value: 'EvoAI-Journey/1.0' },
  { key: 'X-API-Version', value: 'v1' },
  { key: 'X-Source', value: 'journey' },
];

export function WebhookHeadersConfig({ data, onChange, journeyId }: WebhookHeadersConfigProps) {
  const { t } = useLanguage('journey');
  const [showSensitiveHeaders, setShowSensitiveHeaders] = useState<Record<number, boolean>>({});

  const headers = data.headers || [];

  const addHeader = (preset?: { key: string; value: string }) => {
    const newHeader: WebhookHeader = preset || { key: '', value: '' };
    const updatedHeaders = [...headers, newHeader];
    onChange({ headers: updatedHeaders });
  };

  const updateHeader = (index: number, updates: Partial<WebhookHeader>) => {
    const updatedHeaders = headers.map((header, i) =>
      i === index ? { ...header, ...updates } : header,
    );
    onChange({ headers: updatedHeaders });
  };

  const removeHeader = (index: number) => {
    const updatedHeaders = headers.filter((_, i) => i !== index);
    onChange({ headers: updatedHeaders });
  };

  const toggleShowSensitive = (index: number) => {
    setShowSensitiveHeaders(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isSensitiveHeader = (key: string) => {
    const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'token', 'secret', 'password'];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t('panels.sendWebhook.headers.httpHeaders')}</Label>
        <div className="flex gap-2">
          {/* Botões para headers comuns */}
          {COMMON_HEADERS.slice(0, 2).map((preset, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => addHeader(preset)}
              className="text-xs"
            >
              + {preset.key}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => addHeader()}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.sendWebhook.headers.addHeader')}
          </Button>
        </div>
      </div>

      {/* Lista de headers */}
      <div className="space-y-3">
        {headers.length === 0 ? (
          <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-950/20 text-center">
            <p className="text-sm text-gray-500">{t('panels.sendWebhook.headers.noHeadersConfigured')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('panels.sendWebhook.headers.headersOptional')}
            </p>
          </div>
        ) : (
          headers.map((header, index) => {
            const isSensitive = isSensitiveHeader(header.key);
            const shouldHide = isSensitive && !showSensitiveHeaders[index];

            return (
              <div key={index} className="p-3 border rounded-lg bg-sidebar-accent/10 space-y-3">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Key */}
                  <div className="col-span-4">
                    <Label className="text-xs">{t('panels.sendWebhook.headers.headerName')}</Label>
                    <VariableInput
                      value={header.key}
                      onChange={e => updateHeader(index, { key: e.target.value })}
                      placeholder={t('panels.sendWebhook.headers.headerNamePlaceholder')}
                      className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                      journeyId={journeyId}
                    />
                  </div>

                  {/* Value */}
                  <div className="col-span-6">
                    <Label className="text-xs">{t('panels.sendWebhook.headers.headerValue')}</Label>
                    <div className="relative">
                      <VariableInput
                        type={shouldHide ? 'password' : 'text'}
                        value={header.value}
                        onChange={e => updateHeader(index, { value: e.target.value })}
                        placeholder={t('panels.sendWebhook.headers.headerValuePlaceholder')}
                        className="bg-sidebar border-sidebar-border text-sidebar-foreground pr-8"
                        journeyId={journeyId}
                      />
                      {isSensitive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowSensitive(index)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        >
                          {shouldHide ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    {isSensitive && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        ⚠️ {t('panels.sendWebhook.headers.sensitiveHeaderDetected')}
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  <div className="col-span-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeader(index)}
                      className="h-10 w-full p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Headers comuns sugeridos */}
      {headers.length === 0 && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">
            {t('panels.sendWebhook.headers.suggestedHeaders')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_HEADERS.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => addHeader(preset)}
                className="text-xs text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                {preset.key}: {preset.value}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      {headers.length > 0 && (
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>{t('panels.sendWebhook.headers.summaryTitle')}</strong> {t('panels.sendWebhook.headers.headersConfigured', { count: headers.length, plural: headers.length !== 1 ? 's' : '' })}
          </p>
          {headers.some(h => isSensitiveHeader(h.key)) && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              ⚠️ {t('panels.sendWebhook.headers.containsSensitive')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
