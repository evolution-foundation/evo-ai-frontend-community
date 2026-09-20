import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from '@evoapi/design-system';
import { Settings, Save, Loader2, AlertCircle } from 'lucide-react';
import integrationService from '@/services/agents/integrationService';
import { useLanguage } from '@/hooks/useLanguage';
import { Label } from '@evoapi/design-system';
import {
  VaultCredentialSelect,
  useVaultCredentials,
  useVaultMigrationState,
} from '@/components/ai_agents/shared';
import { ProviderType } from './ProviderSelector';
import {
  FlowiseConfigForm,
  FlowiseConfig,
  N8NConfigForm,
  N8NConfig,
  DifyConfigForm,
  DifyConfig,
  OpenAIConfigForm,
  OpenAIConfig,
  TypebotConfigForm,
  TypebotConfig,
} from './providerConfigs';

type AgentPageMode = 'create' | 'edit' | 'view';

export interface ExternalAgentConfigData {
  provider?: ProviderType;
  // EVO-2250 story 2.3: reference to the integration credential vault. The
  // inline secret fields stay as the fallback until story 2.7 retires them.
  credential_id?: string;
  // Flowise config
  flowise_apiUrl?: string;
  flowise_apiKey?: string;
  // N8N config
  n8n_webhookUrl?: string;
  n8n_basicAuthUser?: string;
  n8n_basicAuthPass?: string;
  // Dify config
  dify_apiUrl?: string;
  dify_apiKey?: string;
  dify_botType?: 'chatBot' | 'textGenerator' | 'agent';
  // OpenAI config
  openai_apiKey?: string;
  openai_botType?: 'assistant' | 'chatCompletion';
  openai_assistantId?: string;
  openai_model?: string;
  openai_maxTokens?: number;
  // Typebot config
  typebot_url?: string;
  typebot_typebot?: string;
  typebot_apiVersion?: 'latest' | string;
}

interface ExternalAgentConfigProps {
  mode: AgentPageMode;
  agentId?: string;
  data: ExternalAgentConfigData;
  onChange: (data: ExternalAgentConfigData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

const ExternalAgentConfig = ({
  mode,
  agentId,
  data,
  onChange,
  onValidationChange,
}: ExternalAgentConfigProps) => {
  const { t } = useLanguage('aiAgents');
  const { t: tVault } = useLanguage('integrationCredentials');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Since story 2.3 the GET is sanitized: a saved key round-trips as blank.
  // A loaded integration therefore satisfies the key requirement — blank means
  // "keep the stored secret", never "there is no secret".
  const [hasSavedIntegration, setHasSavedIntegration] = useState(false);

  // Typebot authenticates with nothing at all (story 2.3 AC6): no credential,
  // no selector, registered as a decision rather than an oversight.
  const providerHasCredential = Boolean(data.provider) && data.provider !== 'typebot';
  const vaultCredentials = useVaultCredentials(providerHasCredential);
  // Story 2.7: once the guard says the external_agents consumer migrated, the
  // inline key input retires and the vault reference is how a secret is
  // registered. Guard failure reads as not retired: nothing is removed from a
  // broken installation.
  const migrationState = useVaultMigrationState(providerHasCredential);
  const inlineKeyRetired =
    providerHasCredential && Boolean(migrationState.retired.external_agents);

  // Load integration config when editing
  useEffect(() => {
    if (mode === 'edit' && agentId && data.provider) {
      loadIntegration();
    }
  }, [agentId, data.provider, mode]);

  const loadIntegration = async () => {
    if (!agentId || !data.provider) return;

    try {
      setIsLoading(true);
      const integration = await integrationService.getIntegration(agentId, data.provider);
      const config = integration.config || {};
      setHasSavedIntegration(Object.keys(config).length > 0);

      // Map config to form data based on provider
      const newData: ExternalAgentConfigData = { ...data };

      newData.credential_id = config.credential_id || '';

      if (data.provider === 'flowise') {
        newData.flowise_apiUrl = config.apiUrl || '';
        newData.flowise_apiKey = config.apiKey || '';
      } else if (data.provider === 'n8n') {
        newData.n8n_webhookUrl = config.webhookUrl || '';
        newData.n8n_basicAuthUser = config.basicAuthUser || '';
        newData.n8n_basicAuthPass = config.basicAuthPass || '';
      } else if (data.provider === 'dify') {
        newData.dify_apiUrl = config.apiUrl || '';
        newData.dify_apiKey = config.apiKey || '';
        newData.dify_botType = config.botType || 'chatBot';
      } else if (data.provider === 'openai') {
        newData.openai_apiKey = config.apiKey || '';
        newData.openai_botType = config.botType || 'assistant';
        newData.openai_assistantId = config.assistantId || '';
        newData.openai_model = config.model || '';
        newData.openai_maxTokens = config.maxTokens || 500;
      } else if (data.provider === 'typebot') {
        newData.typebot_url = config.url || '';
        newData.typebot_typebot = config.typebot || '';
        newData.typebot_apiVersion = config.apiVersion || 'latest';
      }

      onChange(newData);
    } catch (error) {
      console.error('Error loading integration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!data.provider) {
      newErrors.provider = t('edit.configuration.sections.externalIntegration.errors.providerRequired');
      return newErrors;
    }

    // Validate based on provider
    if (data.provider === 'flowise') {
      if (!data.flowise_apiUrl?.trim()) {
        newErrors.flowise_apiUrl = t('edit.configuration.sections.externalIntegration.errors.apiUrlRequired');
      }
    } else if (data.provider === 'n8n') {
      if (!data.n8n_webhookUrl?.trim()) {
        newErrors.n8n_webhookUrl = t('edit.configuration.sections.externalIntegration.errors.webhookUrlRequired');
      }
    } else if (data.provider === 'dify') {
      if (!data.dify_apiUrl?.trim()) {
        newErrors.dify_apiUrl = t('edit.configuration.sections.externalIntegration.errors.apiUrlRequired');
      }
      // A vault reference satisfies the key requirement (the runtime resolves
      // by credential_id, story 2.3), and so does a SAVED integration: since
      // 2.3 the GET is sanitized, so the stored key always round-trips blank.
      if (!data.dify_apiKey?.trim() && !data.credential_id?.trim() && !hasSavedIntegration) {
        newErrors.dify_apiKey = t('edit.configuration.sections.externalIntegration.errors.apiKeyRequired');
      }
    } else if (data.provider === 'openai') {
      if (!data.openai_apiKey?.trim() && !data.credential_id?.trim() && !hasSavedIntegration) {
        newErrors.openai_apiKey = t('edit.configuration.sections.externalIntegration.errors.apiKeyRequired');
      }
      if (data.openai_botType === 'assistant' && !data.openai_assistantId?.trim()) {
        newErrors.openai_assistantId = t('edit.configuration.sections.externalIntegration.errors.assistantIdRequired');
      }
      if (data.openai_botType === 'chatCompletion' && !data.openai_model?.trim()) {
        newErrors.openai_model = t('edit.configuration.sections.externalIntegration.errors.modelRequired');
      }
    } else if (data.provider === 'typebot') {
      if (!data.typebot_url?.trim()) {
        newErrors.typebot_url = t('edit.configuration.sections.externalIntegration.errors.urlRequired');
      }
      if (!data.typebot_typebot?.trim()) {
        newErrors.typebot_typebot = t('edit.configuration.sections.externalIntegration.errors.typebotIdRequired');
      }
    }

    return newErrors;
  }, [data, hasSavedIntegration]);

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    const errorMessages = Object.values(newErrors);

    const timer = setTimeout(() => {
      onValidationChange(isValid, errorMessages);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateForm, onValidationChange]);

  const handleProviderConfigChange = (providerConfig: FlowiseConfig | N8NConfig | DifyConfig | OpenAIConfig | TypebotConfig) => {
    const newData: ExternalAgentConfigData = { ...data };
    
    if (data.provider === 'flowise') {
      const flowiseConfig = providerConfig as FlowiseConfig;
      newData.flowise_apiUrl = flowiseConfig.apiUrl;
      newData.flowise_apiKey = flowiseConfig.apiKey;
    } else if (data.provider === 'n8n') {
      const n8nConfig = providerConfig as N8NConfig;
      newData.n8n_webhookUrl = n8nConfig.webhookUrl;
      newData.n8n_basicAuthUser = n8nConfig.basicAuthUser;
      newData.n8n_basicAuthPass = n8nConfig.basicAuthPass;
    } else if (data.provider === 'dify') {
      const difyConfig = providerConfig as DifyConfig;
      newData.dify_apiUrl = difyConfig.apiUrl;
      newData.dify_apiKey = difyConfig.apiKey;
      newData.dify_botType = difyConfig.botType;
    } else if (data.provider === 'openai') {
      const openaiConfig = providerConfig as OpenAIConfig;
      newData.openai_apiKey = openaiConfig.apiKey;
      newData.openai_botType = openaiConfig.botType;
      newData.openai_assistantId = openaiConfig.assistantId;
      newData.openai_model = openaiConfig.model;
      newData.openai_maxTokens = openaiConfig.maxTokens;
    } else if (data.provider === 'typebot') {
      const typebotConfig = providerConfig as TypebotConfig;
      newData.typebot_url = typebotConfig.url;
      newData.typebot_typebot = typebotConfig.typebot;
      newData.typebot_apiVersion = typebotConfig.apiVersion;
    }
    
    onChange(newData);
  };

  const providerConfig = useMemo((): FlowiseConfig | N8NConfig | DifyConfig | OpenAIConfig | TypebotConfig => {
    if (data.provider === 'flowise') {
      return {
        apiUrl: data.flowise_apiUrl ?? '',
        apiKey: data.flowise_apiKey ?? '',
      };
    } else if (data.provider === 'n8n') {
      return {
        webhookUrl: data.n8n_webhookUrl ?? '',
        basicAuthUser: data.n8n_basicAuthUser ?? '',
        basicAuthPass: data.n8n_basicAuthPass ?? '',
      };
    } else if (data.provider === 'dify') {
      return {
        apiUrl: data.dify_apiUrl ?? '',
        apiKey: data.dify_apiKey ?? '',
        botType: data.dify_botType ?? 'chatBot',
      };
    } else if (data.provider === 'openai') {
      return {
        apiKey: data.openai_apiKey ?? '',
        botType: data.openai_botType ?? 'assistant',
        assistantId: data.openai_assistantId ?? '',
        model: data.openai_model ?? '',
        maxTokens: data.openai_maxTokens ?? 500,
      };
    } else if (data.provider === 'typebot') {
      return {
        url: data.typebot_url ?? '',
        typebot: data.typebot_typebot ?? '',
        apiVersion: data.typebot_apiVersion ?? 'latest',
      };
    }
    return {};
  }, [
    data.provider,
    data.flowise_apiUrl,
    data.flowise_apiKey,
    data.n8n_webhookUrl,
    data.n8n_basicAuthUser,
    data.n8n_basicAuthPass,
    data.dify_apiUrl,
    data.dify_apiKey,
    data.dify_botType,
    data.openai_apiKey,
    data.openai_botType,
    data.openai_assistantId,
    data.openai_model,
    data.openai_maxTokens,
    data.typebot_url,
    data.typebot_typebot,
    data.typebot_apiVersion,
  ]);


  const handleSaveIntegration = async () => {
    if (!agentId || !data.provider) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSaving(true);

      // Build config based on provider.
      //
      // ⚠️ Secret fields are set ONLY when non-empty. The backend replaces the
      // stored config wholesale and its MergePreservedSecrets keeps a secret
      // whose key is ABSENT — but a PRESENT blank wins. Since story 2.3 the
      // GET is sanitized (the key never comes back), so every edit round-trips
      // a blank: sending it present would erase the stored fallback on save.
      const config: Record<string, any> = {};
      const setSecret = (field: string, value?: string) => {
        if (value?.trim()) {
          config[field] = value;
        }
      };

      if (data.provider === 'flowise') {
        config.apiUrl = data.flowise_apiUrl;
        setSecret('apiKey', data.flowise_apiKey);
      } else if (data.provider === 'n8n') {
        config.webhookUrl = data.n8n_webhookUrl;
        setSecret('basicAuthUser', data.n8n_basicAuthUser);
        setSecret('basicAuthPass', data.n8n_basicAuthPass);
      } else if (data.provider === 'dify') {
        config.apiUrl = data.dify_apiUrl;
        setSecret('apiKey', data.dify_apiKey);
        config.botType = data.dify_botType || 'chatBot';
      } else if (data.provider === 'openai') {
        setSecret('apiKey', data.openai_apiKey);
        config.botType = data.openai_botType || 'assistant';
        config.assistantId = data.openai_assistantId;
        config.model = data.openai_model;
        config.maxTokens = data.openai_maxTokens || 500;
      } else if (data.provider === 'typebot') {
        config.url = data.typebot_url;
        config.typebot = data.typebot_typebot;
        config.apiVersion = data.typebot_apiVersion || 'latest';
      }

      // The vault reference travels alongside the inline fields: the runtime
      // prefers it and falls back to inline (story 2.3). Typebot never carries
      // one — it has no credential at all.
      if (providerHasCredential && data.credential_id?.trim()) {
        config.credential_id = data.credential_id;
      }

      await integrationService.upsertIntegration(agentId, {
        provider: data.provider,
        config,
      });
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const providerErrors = useMemo(() => {
    const providerErrs: Record<string, string> = {};
    
    if (data.provider === 'flowise') {
      if (errors.flowise_apiUrl) providerErrs.apiUrl = errors.flowise_apiUrl;
    } else if (data.provider === 'n8n') {
      if (errors.n8n_webhookUrl) providerErrs.webhookUrl = errors.n8n_webhookUrl;
    } else if (data.provider === 'dify') {
      if (errors.dify_apiUrl) providerErrs.apiUrl = errors.dify_apiUrl;
      if (errors.dify_apiKey) providerErrs.apiKey = errors.dify_apiKey;
    } else if (data.provider === 'openai') {
      if (errors.openai_apiKey) providerErrs.apiKey = errors.openai_apiKey;
      if (errors.openai_assistantId) providerErrs.assistantId = errors.openai_assistantId;
      if (errors.openai_model) providerErrs.model = errors.openai_model;
    } else if (data.provider === 'typebot') {
      if (errors.typebot_url) providerErrs.url = errors.typebot_url;
      if (errors.typebot_typebot) providerErrs.typebot = errors.typebot_typebot;
    }
    
    return providerErrs;
  }, [data.provider, errors]);

  const renderProviderForm = () => {
    if (!data.provider) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('edit.configuration.sections.externalIntegration.providerConfig.selectProvider')}
        </div>
      );
    }

    const isReadOnly = mode === 'view';

    const vaultSelector = providerHasCredential && (
      <div className="space-y-2 pb-2">
        <Label htmlFor="external-agent-credential">{tVault('refsEditor.nexusLabel')}</Label>
        <VaultCredentialSelect
          id="external-agent-credential"
          value={data.credential_id?.trim() ? data.credential_id : undefined}
          onChange={credentialId => onChange({ ...data, credential_id: credentialId ?? '' })}
          disabled={isReadOnly}
          credentials={vaultCredentials}
        />
        <p className="text-xs text-muted-foreground">{tVault('externalAgent.hint')}</p>
      </div>
    );

    const providerForm = (() => {
      switch (data.provider) {
        case 'flowise':
          return (
            <FlowiseConfigForm
              config={providerConfig as FlowiseConfig}
              onChange={handleProviderConfigChange}
              errors={providerErrors}
              disabled={isReadOnly}
              secretRetired={inlineKeyRetired}
              secretRetiredHint={tVault('retirement.externalKeyLocked')}
            />
          );
        case 'n8n':
          return (
            <N8NConfigForm
              config={providerConfig as N8NConfig}
              onChange={handleProviderConfigChange}
              errors={providerErrors}
              disabled={isReadOnly}
              secretRetired={inlineKeyRetired}
              secretRetiredHint={tVault('retirement.externalKeyLocked')}
            />
          );
        case 'dify':
          return (
            <DifyConfigForm
              config={providerConfig as DifyConfig}
              onChange={handleProviderConfigChange}
              errors={providerErrors}
              disabled={isReadOnly}
              secretRetired={inlineKeyRetired}
              secretRetiredHint={tVault('retirement.externalKeyLocked')}
            />
          );
        case 'openai':
          return (
            <OpenAIConfigForm
              config={providerConfig as OpenAIConfig}
              onChange={handleProviderConfigChange}
              errors={providerErrors}
              disabled={isReadOnly}
              secretRetired={inlineKeyRetired}
              secretRetiredHint={tVault('retirement.externalKeyLocked')}
            />
          );
        case 'typebot':
          return (
            <TypebotConfigForm
              config={providerConfig as TypebotConfig}
              onChange={handleProviderConfigChange}
              errors={providerErrors}
              disabled={isReadOnly}
            />
          );
        default:
          return null;
      }
    })();

    if (!providerForm) {
      return null;
    }

    return (
      <>
        {vaultSelector}
        {providerForm}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Settings className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>{t('edit.configuration.sections.externalIntegration.providerConfig.title')}</CardTitle>
              <CardDescription>
                {t('edit.configuration.sections.externalIntegration.providerConfig.subtitle')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Alert */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h6 className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                {t('edit.configuration.sections.externalIntegration.securityAlert.title')}
              </h6>
              <p className="text-amber-600 dark:text-amber-400">
                {t('edit.configuration.sections.externalIntegration.securityAlert.description')}
              </p>
            </div>
          </div>

          {renderProviderForm()}

          {mode === 'edit' && agentId && (
            <div className="pt-4">
              <Button
                onClick={handleSaveIntegration}
                disabled={isSaving || Object.keys(errors).length > 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('edit.configuration.sections.externalIntegration.providerConfig.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('edit.configuration.sections.externalIntegration.providerConfig.save')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalAgentConfig;
