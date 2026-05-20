import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import A2AConfigForm, { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import TaskConfigForm, { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';
import {
  Switch,
  Label,
  Input,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { ApiKey, Agent } from '@/types/agents';
import { Key, Brain, FileText, Settings, Zap, Plus, Plug } from 'lucide-react';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import SchemaField from '@/components/ai_agents/SchemaField';
import ModelSelector from '@/components/ai_agents/ModelSelector';
import ExternalAgentConfig from '@/components/agents/ExternalAgentConfig';
import { ExternalAgentConfigData } from '@/components/agents/ExternalAgentConfig';
import {
  supportsModelConfig,
  supportsCapabilities,
  supportsOutputFormat,
  isExternalAgent,
} from '@/utils/agents';

const sanitizeAgentName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

interface AdvancedSettingsData {
  planner: boolean;
  load_memory: boolean;
  preload_memory: boolean;
}

interface GeneralTabProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  a2aConfigData: A2AConfigData | null;
  taskConfigData: TaskConfigData | null;
  externalConfigData?: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  } | null;
  apiKeys: ApiKey[];
  outputSchema: Record<string, { type?: string; description?: string }>;
  advancedSettings: AdvancedSettingsData;
  onLLMConfigChange: (data: LLMConfigData) => void;
  onA2AConfigChange: (data: A2AConfigData) => void;
  onTaskConfigChange: (data: TaskConfigData) => void;
  onExternalConfigChange?: (data: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  }) => void;
  onOutputSchemaChange: (schema: Record<string, { type?: string; description?: string }>) => void;
  onAdvancedSettingsChange: (settings: AdvancedSettingsData) => void;
  onInstructionSync?: (instruction: string) => void;
  onApiKeysReload: () => void;
}

export const GeneralTab = ({
  agent,
  llmConfigData,
  a2aConfigData,
  taskConfigData,
  externalConfigData,
  apiKeys,
  outputSchema,
  advancedSettings,
  onLLMConfigChange,
  onA2AConfigChange,
  onTaskConfigChange,
  onExternalConfigChange,
  onOutputSchemaChange,
  onAdvancedSettingsChange,
  onInstructionSync,
  onApiKeysReload,
}: GeneralTabProps) => {
  const { t } = useLanguage('aiAgents');
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);

  // Handler para mudanças no LLM config
  const handleLLMConfigChange = useCallback(
    (data: LLMConfigData) => {
      onLLMConfigChange(data);
      if (onInstructionSync) {
        onInstructionSync(data.instruction);
      }
    },
    [onLLMConfigChange, onInstructionSync]
  );

  // Handler para mudanças nas configurações avançadas
  const handleAdvancedSettingsChange = useCallback(
    (field: keyof AdvancedSettingsData, value: boolean) => {
      const updatedSettings = {
        ...advancedSettings,
        [field]: value,
      };
      onAdvancedSettingsChange(updatedSettings);
    },
    [advancedSettings, onAdvancedSettingsChange]
  );

  // Handler para schema
  const handleSchemaFieldUpdate = useCallback(
    (originalKey: string, newKey: string, field: { type?: string; description?: string }) => {
      const newSchema = { ...outputSchema };
      if (originalKey !== newKey) {
        delete newSchema[originalKey];
      }
      newSchema[newKey] = field;
      onOutputSchemaChange(newSchema);
    },
    [outputSchema, onOutputSchemaChange]
  );

  const handleSchemaFieldRemove = useCallback(
    (fieldKey: string) => {
      const newSchema = { ...outputSchema };
      delete newSchema[fieldKey];
      onOutputSchemaChange(newSchema);
    },
    [outputSchema, onOutputSchemaChange]
  );

  const handleAddSchemaField = useCallback(() => {
    const newSchema = { ...outputSchema };
    let fieldName = 'new_field';
    let counter = 1;
    while (newSchema[fieldName]) {
      fieldName = `new_field_${counter}`;
      counter++;
    }
    newSchema[fieldName] = {
      type: 'string',
      description: '',
    };
    onOutputSchemaChange(newSchema);
  }, [outputSchema, onOutputSchemaChange]);

  // Renderizar formulário baseado no tipo do agente (apenas para A2A e Task)
  const renderTypeSpecificForm = () => {
    if (agent.type === 'a2a' && a2aConfigData) {
      return (
        <A2AConfigForm
          mode="edit"
          data={a2aConfigData}
          onChange={onA2AConfigChange}
          onValidationChange={() => {}}
        />
      );
    }

    if (agent.type === 'task' && taskConfigData) {
      return (
        <TaskConfigForm
          mode="edit"
          data={taskConfigData}
          onChange={onTaskConfigChange}
          onValidationChange={() => {}}
          editingAgentId={agent.id}
          folderId={undefined}
        />
      );
    }

    return null;
  };

  return (
    <>
      <div className="space-y-8">
        {/* Seção 1: Modelo e API (apenas para LLM) */}
        {supportsModelConfig(agent.type) && llmConfigData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.configuration.sections.modelAndApi.title') || 'Modelo e API'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.configuration.sections.modelAndApi.subtitle') ||
                    'Configure o modelo de linguagem e a chave de API'}
                </p>
              </div>
            </div>

            <div className="space-y-6 pl-11">
              {/* Chave API */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apiKey" className="text-sm font-medium">
                    {t('llmConfig.apiKey')} <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKeysModal(true)}
                    className="h-8 px-3"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('llmConfig.manageApiKeys')}
                  </Button>
                </div>
                <Select
                  value={llmConfigData.api_key_id || ''}
                  onValueChange={value =>
                    handleLLMConfigChange({
                      ...llmConfigData,
                      api_key_id: value,
                    })
                  }
                >
                  <SelectTrigger id="apiKey" className="w-80">
                    <SelectValue placeholder={t('llmConfig.selectApiKey')} />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys
                      .filter(key => key.is_active)
                      .map(apiKey => (
                        <SelectItem key={apiKey.id} value={apiKey.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{apiKey.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {apiKey.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('llmConfig.apiKeyDescription')}</p>
              </div>

              {/* Modelo */}
              <ModelSelector
                value={llmConfigData.model || ''}
                onChange={model =>
                  handleLLMConfigChange({
                    ...llmConfigData,
                    model,
                  })
                }
                apiKeys={apiKeys}
                apiKeyId={llmConfigData.api_key_id}
                required
              />
            </div>
          </div>
        )}

        {/* Para A2A e Task: Formulário específico */}
        {(agent.type === 'a2a' || agent.type === 'task') && renderTypeSpecificForm()}

        {/* Seção: Integração Externa (apenas para External) */}
        {isExternalAgent(agent.type) && externalConfigData && onExternalConfigChange && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Plug className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.configuration.sections.externalIntegration.title') || 'Integração Externa'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.configuration.sections.externalIntegration.subtitle') ||
                    'Configure a integração com o provider externo'}
                </p>
              </div>
            </div>

            <div className="pl-11">
              <ExternalAgentConfig
                mode="edit"
                agentId={agent.id}
                data={
                  {
                    provider: externalConfigData.provider as any,
                  } as ExternalAgentConfigData
                }
                onChange={data => {
                  onExternalConfigChange({
                    ...externalConfigData,
                    provider: data.provider,
                  });
                }}
                onValidationChange={() => {}}
              />
            </div>
          </div>
        )}

        {/* Seção: Capacidades do Agente (apenas para LLM) */}
        {supportsCapabilities(agent.type) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Brain className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.configuration.sections.capabilities.title') || 'Capacidades do Agente'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.configuration.sections.capabilities.subtitle') ||
                    'Recursos avançados de memória e planejamento'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pl-11">
              {/* Planner */}
              <div className="flex items-start justify-between py-3">
                <div className="flex items-start gap-3 flex-1">
                  <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="planner" className="font-medium cursor-pointer">
                        {t('planner.title')}
                      </Label>
                      <Badge
                        variant={advancedSettings.planner ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {advancedSettings.planner
                          ? t('advancedBot.active')
                          : t('advancedBot.inactive')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('planner.description')}</p>
                  </div>
                </div>
                <Switch
                  id="planner"
                  checked={advancedSettings.planner}
                  onCheckedChange={checked => handleAdvancedSettingsChange('planner', checked)}
                />
              </div>

              {/* Memória */}
              <div className="flex items-start justify-between py-3 border-t">
                <div className="flex items-start gap-3 flex-1">
                  <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="load-memory" className="font-medium cursor-pointer">
                        {t('memory.loadMemory') || 'Memória'}
                      </Label>
                      <Badge
                        variant={advancedSettings.load_memory ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {advancedSettings.load_memory
                          ? t('advancedBot.active') || 'Ativo'
                          : t('advancedBot.inactive') || 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('memory.loadMemoryDescription') || 'Permite que o agente acesse o histórico de conversas passadas para manter o contexto do cliente.'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="load-memory"
                  checked={advancedSettings.load_memory}
                  onCheckedChange={checked => {
                    onAdvancedSettingsChange({
                      ...advancedSettings,
                      load_memory: checked,
                      preload_memory: checked ? advancedSettings.preload_memory || true : false,
                    });
                  }}
                />
              </div>

              {/* Preload Memory */}
              {advancedSettings.load_memory && (
                <div className="flex items-start justify-between py-3 border-t pl-8">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor="preload-memory" className="font-medium cursor-pointer">
                          {t('memory.preloadMemory') || 'Pré-carregar Memória'}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {t('advancedBot.optimization') || 'Otimização'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('memory.preloadMemoryDescription') || 'Carrega previamente as memórias do contato no início da conversa para otimizar o tempo de resposta.'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="preload-memory"
                    checked={advancedSettings.preload_memory}
                    onCheckedChange={checked => handleAdvancedSettingsChange('preload_memory', checked)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seção: Formato de Saída */}
        {supportsOutputFormat(agent.type) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <FileText className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.configuration.sections.outputFormat.title') || 'Formato de Saída'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.configuration.sections.outputFormat.subtitle') ||
                    'Configure a estrutura e identificador das respostas'}
                </p>
              </div>
            </div>

            <div className="space-y-6 pl-11">
              {/* Output Key */}
              {(agent.type === 'llm' || agent.type === 'a2a') && (
                <div className="space-y-2">
                  <Label htmlFor="output-key" className="text-sm font-medium">
                    {t('llmConfig.outputKey')}
                  </Label>
                  <Input
                    id="output-key"
                    value={
                      agent.type === 'llm' && llmConfigData
                        ? llmConfigData.output_key || ''
                        : agent.type === 'a2a' && a2aConfigData
                        ? a2aConfigData.output_key || ''
                        : ''
                    }
                    onChange={e => {
                      const sanitized = sanitizeAgentName(e.target.value);
                      if (agent.type === 'llm' && llmConfigData) {
                        handleLLMConfigChange({ ...llmConfigData, output_key: sanitized });
                      } else if (agent.type === 'a2a' && a2aConfigData) {
                        onA2AConfigChange({ ...a2aConfigData, output_key: sanitized });
                      }
                    }}
                    placeholder={t('llmConfig.outputKeyPlaceholder')}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('llmConfig.outputKeyDescription')}
                  </p>
                </div>
              )}

              {/* Output Schema */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('outputSchema.title')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOutputSchema(!showOutputSchema)}
                    className="gap-2"
                  >
                    {showOutputSchema ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>

                {showOutputSchema && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                            {t('outputSchema.structuredSchema')}
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {t('outputSchema.structuredDescription')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {Object.keys(outputSchema).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(outputSchema).map(([fieldKey, field]) => (
                          <SchemaField
                            key={fieldKey}
                            fieldKey={fieldKey}
                            field={field}
                            onUpdate={(newKey, newField) =>
                              handleSchemaFieldUpdate(fieldKey, newKey, newField)
                            }
                            onRemove={handleSchemaFieldRemove}
                            isReadOnly={false}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddSchemaField}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t('outputSchema.addField')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed">
                        <div>
                          <p className="font-medium">{t('outputSchema.noSchema')}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('outputSchema.addFieldsToStructure')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddSchemaField}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t('outputSchema.firstField')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Gerenciamento de Chaves API */}
      {supportsModelConfig(agent.type) && (
        <ApiKeysModal
          open={showApiKeysModal}
          onOpenChange={setShowApiKeysModal}
          onApiKeysChange={onApiKeysReload}
        />
      )}
    </>
  );
};
