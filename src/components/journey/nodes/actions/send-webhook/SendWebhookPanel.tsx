import { useEffect, useMemo, useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { Send, Play, ArrowRight } from 'lucide-react';
import { SendWebhookNodeData, WebhookResponseMapping } from './SendWebhookNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { isExpressionFieldValid } from '@/utils/templateVariables';
import {
  getEffectiveBodyMode,
  isValidJsonBody,
  validateFields,
} from './components/webhookBody';
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
  const initialFormData: SendWebhookNodeData = {
    ...data,
    method: data.method || 'POST',
    timeout: data.timeout || 30,
    retryAttempts: data.retryAttempts || 0,
    bodyType: data.bodyType || 'json',
    authenticationType: data.authenticationType || 'none',
    headers: data.headers || [],
  };
  const [originalData] = useState<SendWebhookNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<SendWebhookNodeData>(initialFormData);

  const [testResponse, setTestResponse] = useState<WebhookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [responseMappings, setResponseMappings] = useState<ResponseMapping[]>([]);
  const [hasMappingChanges, setHasMappingChanges] = useState(false);

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

    if (data.responseMappings) {
      setResponseMappings(data.responseMappings.map(mapping => ({ ...mapping })));
    } else {
      setResponseMappings([]);
    }

    setHasMappingChanges(false);
  }, [data]);

  const handleSave = () => {
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
    if (!formData.webhookUrl) return;

    setIsLoading(true);
    setTestError(null);
    setTestResponse(null);

    const startTime = Date.now();

    try {
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

      if (formData.headers) {
        formData.headers.forEach(header => {
          if (header.key && header.value) {
            headers[header.key] = header.value;
          }
        });
      }

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
    setHasMappingChanges(true);
  };

  const updateResponseMapping = (id: string, updates: Partial<ResponseMapping>) => {
    setResponseMappings(prev =>
      prev.map(mapping => (mapping.id === id ? { ...mapping, ...updates } : mapping)),
    );
    setHasMappingChanges(true);
  };

  const removeResponseMapping = (id: string) => {
    setResponseMappings(prev => prev.filter(mapping => mapping.id !== id));
    setHasMappingChanges(true);
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

    // Body validation — caught in the editor, not at runtime (EVO-1742).
    const bodyApplies = ['POST', 'PUT', 'PATCH'].includes(formData.method || 'POST');
    if (bodyApplies) {
      const bodyMode = getEffectiveBodyMode(formData);
      if (bodyMode === 'structured') {
        const result = validateFields(formData.bodyStructured || []);
        if (!result.ok) {
          issues.push(t(`panels.sendWebhook.body.validation.${result.error}`));
        }
        // EVO-1872: an unbalanced {{ }} expression in any structured value blocks Save.
        if ((formData.bodyStructured || []).some(field => !isExpressionFieldValid(field.value))) {
          issues.push(t('environmentManager.invalidExpression'));
        }
      } else {
        if (formData.bodyType === 'json' && !isValidJsonBody(formData.body || '')) {
          issues.push(t('panels.sendWebhook.invalidJson'));
        }
        // EVO-1872: an unbalanced {{ }} expression in the raw body blocks Save.
        if (!isExpressionFieldValid(formData.body || '')) {
          issues.push(t('environmentManager.invalidExpression'));
        }
      }
    }

    return issues;
  };

  const validationIssues = getValidationStatus();
  const isValid = validationIssues.length === 0;
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData) || hasMappingChanges,
    [formData, originalData, hasMappingChanges],
  );

  const validationBanner =
    !isValid && (
      <FlowFeedbackBanner variant="warn">
        <p className="font-medium">{t('panels.sendWebhook.incompleteConfig')}:</p>
        <ul className="text-xs mt-1 list-disc list-inside">
          {validationIssues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
      </FlowFeedbackBanner>
    );

  const basicTab = (
    <div className="space-y-4">
      {validationBanner}
      <WebhookBasicConfig
        data={formData}
        onChange={handleFormDataChange}
        journeyId={journeyId}
      />
    </div>
  );

  const headersTab = (
    <div className="space-y-4">
      {validationBanner}
      <WebhookHeadersConfig
        data={formData}
        onChange={handleFormDataChange}
        journeyId={journeyId}
      />
    </div>
  );

  const bodyTab = (
    <div className="space-y-4">
      {validationBanner}
      <WebhookBodyConfig data={formData} onChange={handleFormDataChange} journeyId={journeyId} />
    </div>
  );

  const authTab = (
    <div className="space-y-4">
      {validationBanner}
      <WebhookAuthConfig data={formData} onChange={handleFormDataChange} journeyId={journeyId} />
    </div>
  );

  const testTab = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('panels.sendWebhook.test.title')}</h3>
          <p className="text-sm text-muted-foreground">
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

      {responseMappings.length > 0 && (
        <FlowFeedbackBanner variant="info">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {t('panels.sendWebhook.test.savedConfigs', { count: responseMappings.length })}
            </h4>
            {hasMappingChanges && (
              <span className="text-xs text-flow-feedback-warn-fg">
                {t('panels.sendWebhook.test.unsavedChanges')}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {responseMappings.map(mapping => (
              <div
                key={mapping.id}
                className="flex items-center justify-between text-xs p-2 bg-flow-feedback-info-bg/60 rounded"
              >
                <span className="font-mono">
                  {mapping.jsonPath || t('panels.sendWebhook.test.notConfigured')}
                </span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-medium">
                  {mapping.variableName || t('panels.sendWebhook.test.notConfigured')}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2">{t('panels.sendWebhook.test.mappingsDescription')}</p>
        </FlowFeedbackBanner>
      )}

      {testError && (
        <FlowFeedbackBanner variant="error">
          <h4 className="text-sm font-medium mb-1">{t('panels.sendWebhook.test.executionError')}</h4>
          <p className="text-sm">{testError}</p>
        </FlowFeedbackBanner>
      )}

      {testResponse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium">{t('panels.sendWebhook.test.webhookResponse')}</h4>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  testResponse.status >= 200 && testResponse.status < 300
                    ? 'bg-flow-feedback-success-bg text-flow-feedback-success-fg'
                    : testResponse.status >= 400
                    ? 'bg-flow-feedback-error-bg text-flow-feedback-error-fg'
                    : 'bg-flow-feedback-warn-bg text-flow-feedback-warn-fg'
                }`}
              >
                {testResponse.status} {testResponse.statusText}
              </span>
              <span className="text-xs text-muted-foreground">{testResponse.executionTime}ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <h5 className="text-sm font-medium mb-2">
              {t('panels.sendWebhook.test.responseHeaders')}
            </h5>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(testResponse.headers, null, 2)}
            </pre>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <h5 className="text-sm font-medium mb-2">
              {t('panels.sendWebhook.test.responseBody')}
            </h5>
            <pre className="text-xs overflow-x-auto max-h-60">
              {typeof testResponse.data === 'object' && testResponse.data !== null
                ? JSON.stringify(testResponse.data, null, 2)
                : String(testResponse.data)}
            </pre>
          </div>

          {typeof testResponse.data === 'object' && testResponse.data && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium">
                    {t('panels.sendWebhook.test.mapToVariables')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('panels.sendWebhook.test.mapDescription')}
                  </p>
                </div>
                <Button onClick={addResponseMapping} size="sm" variant="outline">
                  {t('panels.sendWebhook.test.addMapping')}
                </Button>
              </div>

              <div className="space-y-3">
                {responseMappings.map(mapping => {
                  const availablePaths = extractJsonPaths(testResponse.data);
                  const currentValue = mapping.jsonPath
                    ? getValueFromJsonPath(testResponse.data, mapping.jsonPath)
                    : null;

                  return (
                    <div key={mapping.id} className="p-3 border border-border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {t('panels.sendWebhook.test.responseField')}
                          </label>
                          <select
                            value={mapping.jsonPath}
                            onChange={e =>
                              updateResponseMapping(mapping.id, { jsonPath: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                          >
                            <option value="">{t('panels.sendWebhook.test.selectField')}</option>
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
                        <label className="block text-sm font-medium mb-1">
                          {t('panels.sendWebhook.test.description')}
                        </label>
                        <input
                          type="text"
                          value={mapping.description}
                          onChange={e =>
                            updateResponseMapping(mapping.id, { description: e.target.value })
                          }
                          placeholder={t('panels.sendWebhook.test.variableDescription')}
                          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                        />
                      </div>

                      {currentValue !== null && currentValue !== undefined && (
                        <FlowFeedbackBanner variant="info">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {t('panels.sendWebhook.test.currentValue')}:
                            </span>
                            <code className="text-xs bg-flow-feedback-info-bg/60 px-1 py-0.5 rounded">
                              {typeof currentValue === 'object' && currentValue !== null
                                ? JSON.stringify(currentValue)
                                : String(currentValue)}
                            </code>
                          </div>
                        </FlowFeedbackBanner>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => removeResponseMapping(mapping.id)}
                          size="sm"
                          variant="ghost"
                          className="text-flow-feedback-error-fg hover:text-flow-feedback-error-fg"
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
  );

  return (
    <NodeConfigModal
      open
      variant="tabs"
      title={t('panels.sendWebhook.title')}
      icon={<Send className="h-5 w-5 text-flow-node-action-webhook-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
      contentClassName="max-w-4xl"
      defaultTab="basic"
      tabs={[
        {
          value: 'basic',
          label: t('panels.sendWebhook.tabs.basic'),
          content: basicTab,
        },
        {
          value: 'headers',
          label: `${t('panels.sendWebhook.tabs.headers')}${
            formData.headers && formData.headers.length > 0 ? ` (${formData.headers.length})` : ''
          }`,
          content: headersTab,
        },
        {
          value: 'body',
          label: t('panels.sendWebhook.tabs.body'),
          content: bodyTab,
        },
        {
          value: 'auth',
          label: `${t('panels.sendWebhook.tabs.auth')}${
            formData.authenticationType !== 'none' ? ' ✓' : ''
          }`,
          content: authTab,
        },
        {
          value: 'test',
          label: `${t('panels.sendWebhook.tabs.test')}${testResponse ? ' ✓' : ''}`,
          content: testTab,
        },
      ]}
    />
  );
}
