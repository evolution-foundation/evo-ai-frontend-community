import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import A2AConfigForm, { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import {
  Label,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { ApiKey, Agent } from '@/types/agents';
import { Settings, Plug } from 'lucide-react';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import ModelSelector from '@/components/ai_agents/ModelSelector';
import ExternalAgentConfig, {
  ExternalAgentConfigData,
} from '@/components/agents/ExternalAgentConfig';
import { supportsModelConfig, isA2AAgent, isExternalAgent } from '@/utils/agents';
import { ExternalConfigData } from './types';

interface ModelApiPanelProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  a2aConfigData: A2AConfigData | null;
  externalConfigData?: ExternalConfigData | null;
  apiKeys: ApiKey[];
  onLLMConfigChange: (data: LLMConfigData) => void;
  onA2AConfigChange: (data: A2AConfigData) => void;
  onExternalConfigChange?: (data: ExternalConfigData) => void;
  onInstructionSync?: (instruction: string) => void;
  onApiKeysReload: () => void;
}

export const ModelApiPanel = ({
  agent,
  llmConfigData,
  a2aConfigData,
  externalConfigData,
  apiKeys,
  onLLMConfigChange,
  onA2AConfigChange,
  onExternalConfigChange,
  onInstructionSync,
  onApiKeysReload,
}: ModelApiPanelProps) => {
  const { t } = useLanguage('aiAgents');
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);

  const handleLLMConfigChange = useCallback(
    (data: LLMConfigData) => {
      onLLMConfigChange(data);
      if (onInstructionSync) {
        onInstructionSync(data.instruction);
      }
    },
    [onLLMConfigChange, onInstructionSync]
  );

  return (
    <>
      <div className="space-y-6">
        {supportsModelConfig(agent.type) && llmConfigData && (
          <>
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
                <SelectTrigger id="apiKey" className="w-full max-w-80">
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
          </>
        )}

        {isA2AAgent(agent.type) && a2aConfigData && (
          <A2AConfigForm
            mode="edit"
            data={a2aConfigData}
            onChange={onA2AConfigChange}
            onValidationChange={() => {}}
          />
        )}

        {isExternalAgent(agent.type) && externalConfigData && onExternalConfigChange && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Plug className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.configuration.sections.externalIntegration.title') ||
                    'Integração Externa'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.configuration.sections.externalIntegration.subtitle') ||
                    'Configure a integração com o provider externo'}
                </p>
              </div>
            </div>

            <ExternalAgentConfig
              mode="edit"
              agentId={agent.id}
              data={
                {
                  provider: externalConfigData.provider as ExternalAgentConfigData['provider'],
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
        )}
      </div>

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
