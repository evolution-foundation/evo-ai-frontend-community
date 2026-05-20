import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@evoapi/design-system';
import { Agent, ApiKey } from '@/types/agents';
import { Settings, MessageSquare, Timer } from 'lucide-react';
import { InactivityAction } from '../InactivityActions';
import { TransferRule } from '../TransferRules';
import { PipelineRule } from '../PipelineRules';
import { ContactEditConfig } from '../ContactEditRules';
import {
  GeneralTab,
  SystemTab,
  InactivityActionsTab,
  TransferRulesModal,
  PipelineRulesModal,
} from '@/components/agents/configuration';
import ContactEditModal from '@/components/agents/configuration/ContactEditModal';
import { BehaviorSettings } from '@/components/agents/configuration/SystemTab';
import {
  getAvailableTabs,
  supportsInactivityActions,
} from '@/utils/agents';

interface AdvancedSettingsData {
  planner: boolean;
  load_memory: boolean;
  preload_memory: boolean;
}

interface ConfigurationSectionProps {
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
  behaviorSettings: BehaviorSettings;
  inactivityActions: InactivityAction[];
  transferRules: TransferRule[];
  pipelineRules: PipelineRule[];
  contactEditConfig: ContactEditConfig;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
  availableUsers?: Array<{ id: string; name: string }>;
  availableTeams?: Array<{ id: string; name: string }>;
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
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
  onInactivityActionsChange: (actions: InactivityAction[]) => void;
  onTransferRulesChange: (rules: TransferRule[]) => void;
  onPipelineRulesChange: (rules: PipelineRule[]) => void;
  onContactEditConfigChange: (config: ContactEditConfig) => void;
  onInstructionSync?: (instruction: string) => void;
  onApiKeysReload: () => void;
}

const ConfigurationSection = ({
  agent,
  llmConfigData,
  a2aConfigData,
  taskConfigData,
  externalConfigData,
  apiKeys,
  outputSchema,
  advancedSettings,
  behaviorSettings,
  inactivityActions,
  transferRules,
  pipelineRules,
  contactEditConfig,
  availablePipelines = [],
  availableUsers = [],
  availableTeams = [],
  onLLMConfigChange,
  onA2AConfigChange,
  onTaskConfigChange,
  onExternalConfigChange,
  onOutputSchemaChange,
  onAdvancedSettingsChange,
  onBehaviorSettingsChange,
  onInactivityActionsChange,
  onTransferRulesChange,
  onPipelineRulesChange,
  onContactEditConfigChange,
  onInstructionSync,
  onApiKeysReload,
}: ConfigurationSectionProps) => {
  const { t } = useLanguage('aiAgents');

  // Estados para modais
  const [showTransferRulesModal, setShowTransferRulesModal] = useState(false);
  const [showPipelineRulesModal, setShowPipelineRulesModal] = useState(false);
  const [showContactEditModal, setShowContactEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Get available tabs based on agent type
  const availableTabs = getAvailableTabs(agent.type);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {/* Aba Geral */}
          {availableTabs.includes('general') && (
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>{t('edit.configuration.tabs.general') || 'Geral'}</span>
            </TabsTrigger>
          )}

          {/* Aba Sistema */}
          {availableTabs.includes('system') && (
            <TabsTrigger value="system" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>{t('edit.configuration.tabs.system') || 'Sistema'}</span>
            </TabsTrigger>
          )}

          {/* Aba Ações de Inatividade */}
          {availableTabs.includes('inactivity') && supportsInactivityActions(agent.type) && (
            <TabsTrigger value="inactivity" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>{t('edit.configuration.tabs.inactivityActions') || 'Ações de inatividade'}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Conteúdo da Aba Geral */}
        {availableTabs.includes('general') && (
          <TabsContent value="general" className="mt-0">
            <GeneralTab
              agent={agent}
              llmConfigData={llmConfigData}
              a2aConfigData={a2aConfigData}
              taskConfigData={taskConfigData}
              externalConfigData={externalConfigData}
              apiKeys={apiKeys}
              outputSchema={outputSchema}
              advancedSettings={advancedSettings}
              onLLMConfigChange={onLLMConfigChange}
              onA2AConfigChange={onA2AConfigChange}
              onTaskConfigChange={onTaskConfigChange}
              onExternalConfigChange={onExternalConfigChange}
              onOutputSchemaChange={onOutputSchemaChange}
              onAdvancedSettingsChange={onAdvancedSettingsChange}
              onInstructionSync={onInstructionSync}
              onApiKeysReload={onApiKeysReload}
            />
          </TabsContent>
        )}

        {/* Conteúdo da Aba Sistema */}
        {availableTabs.includes('system') && (
          <TabsContent value="system" className="mt-0">
            <SystemTab
              agent={agent}
              llmConfigData={llmConfigData}
              externalConfigData={externalConfigData}
              behaviorSettings={behaviorSettings}
              onLLMConfigChange={onLLMConfigChange}
              onExternalConfigChange={onExternalConfigChange}
              onBehaviorSettingsChange={onBehaviorSettingsChange}
              onShowTransferRulesModal={() => setShowTransferRulesModal(true)}
              onShowPipelineRulesModal={() => setShowPipelineRulesModal(true)}
              onShowContactEditModal={() => setShowContactEditModal(true)}
            />
          </TabsContent>
        )}

        {/* Conteúdo da Aba Ações de Inatividade */}
        {availableTabs.includes('inactivity') && supportsInactivityActions(agent.type) && (
          <TabsContent value="inactivity" className="mt-0">
            <InactivityActionsTab
              actions={inactivityActions}
              onChange={onInactivityActionsChange}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Modal de Regras de Transferência */}
      <TransferRulesModal
        open={showTransferRulesModal}
        onOpenChange={setShowTransferRulesModal}
        rules={transferRules}
        onChange={onTransferRulesChange}
        availableUsers={availableUsers}
        availableTeams={availableTeams}
      />

      {/* Modal de Regras de Pipeline */}
      <PipelineRulesModal
        open={showPipelineRulesModal}
        onOpenChange={setShowPipelineRulesModal}
        rules={pipelineRules}
        onChange={onPipelineRulesChange}
        availablePipelines={availablePipelines}
      />

      {/* Modal de Edição de Contatos */}
      <ContactEditModal
        open={showContactEditModal}
        onOpenChange={setShowContactEditModal}
        config={contactEditConfig}
        onChange={onContactEditConfigChange}
      />
    </>
  );
};

export default ConfigurationSection;
