import { useState, useEffect } from 'react';
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  Label,
} from '@evoapi/design-system';
import { Send, Globe, Settings, Lock, FileText, Play, ArrowRight } from 'lucide-react';
import { SendWebhookNodeData, WebhookResponseMapping } from './SendWebhookNode';
import { BaseFlowPanel } from '@/components/base';
import { VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import {
  WebhookBasicConfig,
  WebhookHeadersConfig,
  WebhookBodyConfig,
  WebhookAuthConfig,
} from './components';

interface WebhookResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  executionTime: number;
}

interface ResponseMapping extends WebhookResponseMapping {
  isCreatingNew?: boolean;
  newVariableName?: string;
}

interface SendWebhookPanelProps {
  nodeId: string;
  data: SendWebhookNodeData;
  onUpdate: (nodeId: string, newData: SendWebhookNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function SendWebhookPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: SendWebhookPanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<SendWebhookNodeData>({
    ...data,
    method: data.method || 'POST',
    timeout: data.timeout || 30,
    retryAttempts: data.retryAttempts || 0,
    bodyType: data.bodyType || 'json',
    authenticationType: data.authenticationType || 'none',
    headers: data.headers || [],
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [testResponse, setTestResponse] = useState<WebhookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [responseMappings, setResponseMappings] = useState<ResponseMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData({
      ...data,
      method: data.method || 'POST',
      timeout: data.timeout || 30,
      retryAttempts: data.retryAttempts || 0,
      bodyType: data.bodyType || 'json',
      authenticationType: data.authenticationType || 'none',
      headers: data.headers || [],
    });

    // Carregar mapeamentos salvos
    if (data.responseMappings) {
      setResponseMappings(data.responseMappings.map(mapping => ({ ...mapping })));
    } else {
      setResponseMappings([]);
    }

    setHasChanges(false);
  }, [data]);

  const handleSave = () => {
    // Validação básica
    if (!formData.webhookUrl) {
      alert(t('panels.sendWebhook.urlRequired'));
      return;
    }

    // Validação de autenticação
    if (formData.authenticationType === 'bearer' && !formData.authToken) {
      alert(t('panels.sendWebhook.bearerTokenRequired'));
      return;
    }

    if (
      formData.authenticationType === 'basic' &&
      (!formData.authUsername || !formData.authPassword)
    ) {
      alert(t('panels.sendWebhook.basicAuthRequired'));
      return;
    }

    if (
      formData.authenticationType === 'api_key' &&
      (!formData.authApiKey || !formData.authApiKeyHeader)
    ) {
      alert(t('panels.sendWebhook.apiKeyRequired'));
      return;
    }

    // Salvar com os mapeamentos
    const dataToSave = {
      ...formData,
      responseMappings: responseMappings
        .filter(mapping => mapping.jsonPath && mapping.variableName)
        .map(mapping => ({
          id: mapping.id,
          jsonPath: mapping.jsonPath,
          variableName: mapping.variableName,
          description: mapping.description,
        })),
    };

    onUpdate(nodeId, dataToSave);
    onClose();
  };

  const handleFormDataChange = (updates: Partial<SendWebhookNodeData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleTestWebhook = async () => {
    if (!formData.webhookUrl) {
      alert(t('panels.sendWebhook.configureUrlFirst'));
      return;
    }

    setIsLoading(true);
    setTestError(null);
    setTestResponse(null);

    const startTime = Date.now();

    try {
      // Preparar headers
      const headers: Record<string, string> = {
        'Content-Type':
          formData.bodyType === 'json'
            ? 'application/json'
            : formData.bodyType === 'form'
            ? 'application/x-www-form-urlencoded'
            : formData.bodyType === 'xml'
            ? 'application/xml'
            : 'text/plain',
      };

      // Adicionar headers customizados
      if (formData.headers) {
        formData.headers.forEach(header => {
          if (header.key && header.value) {
            headers[header.key] = header.value;
          }
        });
      }

      // Adicionar autenticação
      if (formData.authenticationType === 'bearer' && formData.authToken) {
        headers['Authorization'] = `Bearer ${formData.authToken}`;
      } else if (
        formData.authenticationType === 'basic' &&
        formData.authUsername &&
        formData.authPassword
      ) {
        const credentials = btoa(`${formData.authUsername}:${formData.authPassword}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (
        formData.authenticationType === 'api_key' &&
        formData.authApiKey &&
        formData.authApiKeyHeader
      ) {
        headers[formData.authApiKeyHeader] = formData.authApiKey;
      }

      // Preparar body
      let body = undefined;
      if (formData.method !== 'GET' && formData.body) {
        if (formData.bodyType === 'json') {
          try {
            JSON.parse(formData.body);
            body = formData.body;
          } catch {
            throw new Error(t('panels.sendWebhook.invalidJson'));
          }
        } else {
          body = formData.body;
        }
      }

      // Fazer a requisição
      const response = await fetch(formData.webhookUrl, {
        method: formData.method || 'POST',
        headers,
        body,
        signal: AbortSignal.timeout((formData.timeout || 30) * 1000),
      });

      const executionTime = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        executionTime,
      });
    } catch (error: unknown) {
      setTestError((error as Error).message || t('panels.sendWebhook.errorExecuting'));
    } finally {
      setIsLoading(false);
    }
  };

  const extractJsonPaths = (obj: unknown, path = ''): string[] => {
    const paths: string[] = [];

    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          paths.push(...extractJsonPaths(item, `${path}[${index}]`));
        });
      } else {
        Object.keys(obj).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          paths.push(newPath);
          paths.push(...extractJsonPaths((obj as Record<string, unknown>)[key], newPath));
        });
      }
    } else {
      if (path) paths.push(path);
    }

    return [...new Set(paths)];
  };

  const getValueFromJsonPath = (obj: unknown, path: string): unknown => {
    try {
      return path
        .split(/[.[\]]+/)
        .filter(Boolean)
        .reduce((current, key) => {
          return (current as Record<string, unknown>)?.[key];
        }, obj);
    } catch {
      return undefined;
    }
  };

  const addResponseMapping = () => {
    const newMapping: ResponseMapping = {
      id: Date.now().toString(),
      jsonPath: '',
      variableName: '',
      description: '',
    };
    setResponseMappings(prev => [...prev, newMapping]);
    setHasChanges(true);
  };

  const updateResponseMapping = (id: string, updates: Partial<ResponseMapping>) => {
    setResponseMappings(prev =>
      prev.map(mapping => (mapping.id === id ? { ...mapping, ...updates } : mapping)),
    );
    setHasChanges(true);
  };

  const removeResponseMapping = (id: string) => {
    setResponseMappings(prev => prev.filter(mapping => mapping.id !== id));
    setHasChanges(true);
  };

  const getValidationStatus = () => {
    const issues = [];

    if (!formData.webhookUrl) issues.push(t('panels.sendWebhook.requiredUrl'));

    if (formData.authenticationType === 'bearer' && !formData.authToken) {
      issues.push(t('panels.sendWebhook.requiredToken'));
    }

    if (
      formData.authenticationType === 'basic' &&
      (!formData.authUsername || !formData.authPassword)
    ) {
      issues.push(t('panels.sendWebhook.requiredCredentials'));
    }

    if (
      formData.authenticationType === 'api_key' &&
      (!formData.authApiKey || !formData.authApiKeyHeader)
    ) {
      issues.push(t('panels.sendWebhook.requiredApiKey'));
    }

    return issues;
  };

  const validationIssues = getValidationStatus();
  const isValid = validationIssues.length === 0;

  return (
    <BaseFlowPanel
      title={t('panels.sendWebhook.title')}
      icon={<Send className="w-5 h-5 text-purple-500" />}
      onClose={onClose}
      width="w-[800px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.sendWebhook.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              {validationIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs de configuração */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t('panels.sendWebhook.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger value="headers" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('panels.sendWebhook.tabs.headers')}
              {formData.headers && formData.headers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {formData.headers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="body" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('panels.sendWebhook.tabs.body')}
            </TabsTrigger>
            <TabsTrigger value="auth" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t('panels.sendWebhook.tabs.auth')}
              {formData.authenticationType !== 'none' && (
                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {t('panels.sendWebhook.tabs.test')}
              {testResponse && <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <WebhookBasicConfig
              data={formData}
              onChange={handleFormDataChange}
              journeyId={journeyId}
            />
          </TabsContent>

          <TabsContent value="headers" className="mt-4">
            <WebhookHeadersConfig
              data={formData}
              onChange={handleFormDataChange}
              journeyId={journeyId}
            />
          </TabsContent>

          <TabsContent value="body" className="mt-4">
            <WebhookBodyConfig
              data={formData}
              onChange={handleFormDataChange}
              journeyId={journeyId}
            />
          </TabsContent>

          <TabsContent value="auth" className="mt-4">
            <WebhookAuthConfig
              data={formData}
              onChange={handleFormDataChange}
              journeyId={journeyId}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="space-y-6">
              {/* Botão de teste */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {t('panels.sendWebhook.test.title')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('panels.sendWebhook.test.description')}
                  </p>
                </div>
                <Button
                  onClick={handleTestWebhook}
                  disabled={!formData.webhookUrl || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isLoading
                    ? t('panels.sendWebhook.test.executing')
                    : t('panels.sendWebhook.test.executeTest')}
                </Button>
              </div>

              {/* Mapeamentos salvos (sempre visível) */}
              {responseMappings.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t('panels.sendWebhook.test.savedConfigs', {
                        count: responseMappings.length,
                      })}
                    </h4>
                    {hasChanges && (
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        {t('panels.sendWebhook.test.unsavedChanges')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {responseMappings.map(mapping => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between text-xs p-2 bg-blue-100 dark:bg-blue-900/30 rounded"
                      >
                        <span className="font-mono text-blue-700 dark:text-blue-300">
                          {mapping.jsonPath || t('panels.sendWebhook.test.notConfigured')}
                        </span>
                        <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">
                          {mapping.variableName || t('panels.sendWebhook.test.notConfigured')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {t('panels.sendWebhook.test.mappingsDescription')}
                  </p>
                </div>
              )}

              {/* Erro */}
              {testError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    {t('panels.sendWebhook.test.executionError')}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{testError}</p>
                </div>
              )}

              {/* Resposta */}
              {testResponse && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {t('panels.sendWebhook.test.webhookResponse')}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : testResponse.status >= 400
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {testResponse.status} {testResponse.statusText}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {testResponse.executionTime}ms
                      </span>
                    </div>
                  </div>

                  {/* Headers da resposta */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t('panels.sendWebhook.test.responseHeaders')}
                    </h5>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                      {JSON.stringify(testResponse.headers, null, 2)}
                    </pre>
                  </div>

                  {/* Corpo da resposta */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t('panels.sendWebhook.test.responseBody')}
                    </h5>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-60">
                      {typeof testResponse.data === 'object' && testResponse.data !== null
                        ? JSON.stringify(testResponse.data, null, 2)
                        : String(testResponse.data)}
                    </pre>
                  </div>

                  {/* Mapeamento de resposta para variáveis */}
                  {typeof testResponse.data === 'object' && testResponse.data && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {t('panels.sendWebhook.test.mapToVariables')}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('panels.sendWebhook.test.mapDescription')}
                          </p>
                        </div>
                        <Button onClick={addResponseMapping} size="sm" variant="outline">
                          {t('panels.sendWebhook.test.addMapping')}
                        </Button>
                      </div>

                      {/* Lista de mapeamentos */}
                      <div className="space-y-3">
                        {responseMappings.map(mapping => {
                          const availablePaths = extractJsonPaths(testResponse.data);
                          const currentValue = mapping.jsonPath
                            ? getValueFromJsonPath(testResponse.data, mapping.jsonPath)
                            : null;

                          return (
                            <div key={mapping.id} className="p-3 border rounded-lg space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('panels.sendWebhook.test.responseField')}
                                  </label>
                                  <select
                                    value={mapping.jsonPath}
                                    onChange={e =>
                                      updateResponseMapping(mapping.id, {
                                        jsonPath: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                                  >
                                    <option value="">
                                      {t('panels.sendWebhook.test.selectField')}
                                    </option>
                                    {availablePaths.map(path => (
                                      <option key={path} value={path}>
                                        {path}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">
                                    {t('panels.sendWebhook.test.variableName')}
                                  </Label>
                                  <VariableSelect
                                    value={mapping.variableName || ''}
                                    onValueChange={variableName => {
                                      updateResponseMapping(mapping.id, { variableName });
                                    }}
                                    placeholder={t('panels.sendWebhook.test.selectVariable')}
                                    journeyId={journeyId}
                                    className="w-full"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('panels.sendWebhook.test.description')}
                                </label>
                                <input
                                  type="text"
                                  value={mapping.description}
                                  onChange={e =>
                                    updateResponseMapping(mapping.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder={t('panels.sendWebhook.test.variableDescription')}
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                                />
                              </div>

                              {/* Preview do valor */}
                              {currentValue !== null && currentValue !== undefined && (
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800/30">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                      {t('panels.sendWebhook.test.currentValue')}:
                                    </span>
                                    <code className="text-xs text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                                      {typeof currentValue === 'object' && currentValue !== null
                                        ? JSON.stringify(currentValue)
                                        : String(currentValue)}
                                    </code>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <Button
                                  onClick={() => removeResponseMapping(mapping.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {t('panels.sendWebhook.test.remove')}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid ? t('panels.actions.save') : t('panels.sendWebhook.fixErrors')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
