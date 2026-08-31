import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import { Agent, ApiKey } from '@/types/agents';
import { Key, MessageSquare, Clock, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@evoapi/design-system';

/** Segmented control: both items share the width, so only the base height is dropped. */
const SEGMENT_CLASS =
  'inline-flex h-auto w-full items-center justify-center gap-2 rounded-[9px] border border-transparent bg-transparent px-4 py-[9px] text-[13.5px] font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none';
import { InactivityAction } from '../InactivityActions';
import { TransferRule } from '../TransferRules';
import { PipelineRule } from '../PipelineRules';
import { ContactEditConfig } from '../ContactEditRules';
import {
  BehaviorPanel,
  InactivityActionsTab,
  MessageHandlingPanel,
  ModelApiPanel,
  TransferRulesModal,
  PipelineRulesModal,
  hasMessageHandlingContent,
} from '@/components/agents/configuration';
import ContactEditModal from '@/components/agents/configuration/ContactEditModal';
import { BehaviorSettings, ExternalConfigData } from '@/components/agents/configuration/types';
import CollapsibleCard from '@/components/ai_agents/CollapsibleCard';
import {
  isA2AAgent,
  isExternalAgent,
  supportsBehaviorSettings,
  supportsInactivityActions,
  supportsModelConfig,
} from '@/utils/agents';

interface ConfigurationSectionProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  a2aConfigData: A2AConfigData | null;
  externalConfigData?: ExternalConfigData | null;
  apiKeys: ApiKey[];
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
  onExternalConfigChange?: (data: ExternalConfigData) => void;
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
  onInactivityActionsChange: (actions: InactivityAction[]) => void;
  onTransferRulesChange: (rules: TransferRule[]) => void;
  onPipelineRulesChange: (rules: PipelineRule[]) => void;
  onContactEditConfigChange: (config: ContactEditConfig) => void;
  onInstructionSync?: (instruction: string) => void;
  onApiKeysReload: () => void;
  // Agent save threaded to the config modals (CRM-213); resolves false on failure.
  onSave?: () => Promise<boolean> | boolean | void;
  isSaving?: boolean;
}

const ConfigurationSection = ({
  agent,
  llmConfigData,
  a2aConfigData,
  externalConfigData,
  apiKeys,
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
  onExternalConfigChange,
  onBehaviorSettingsChange,
  onInactivityActionsChange,
  onTransferRulesChange,
  onPipelineRulesChange,
  onContactEditConfigChange,
  onInstructionSync,
  onApiKeysReload,
  onSave,
  isSaving,
}: ConfigurationSectionProps) => {
  const { t } = useLanguage('aiAgents');

  const [showTransferRulesModal, setShowTransferRulesModal] = useState(false);
  const [showPipelineRulesModal, setShowPipelineRulesModal] = useState(false);
  const [showContactEditModal, setShowContactEditModal] = useState(false);

  // "Model and API" covers whatever provider the type has: key plus model (llm),
  // agent card (a2a), external provider (external).
  const showModelCard =
    (supportsModelConfig(agent.type) && Boolean(llmConfigData)) ||
    (isA2AAgent(agent.type) && Boolean(a2aConfigData)) ||
    (isExternalAgent(agent.type) && Boolean(externalConfigData) && Boolean(onExternalConfigChange));
  const showBehaviorCard = supportsBehaviorSettings(agent.type);
  const showMessageCard = hasMessageHandlingContent(agent, llmConfigData, externalConfigData);

  const cards = (
    <div className="space-y-4">
      {showModelCard && (
        <CollapsibleCard
          title={t('edit.configuration.sections.modelAndApi.title') || 'Modelo e API'}
          subtitle={
            t('edit.configuration.sections.modelAndApi.subtitle') ||
            'Configure o modelo de linguagem e a chave de API'
          }
          icon={<Key className="h-5 w-5" />}
        >
          <ModelApiPanel
            agent={agent}
            llmConfigData={llmConfigData}
            a2aConfigData={a2aConfigData}
            externalConfigData={externalConfigData}
            apiKeys={apiKeys}
            onLLMConfigChange={onLLMConfigChange}
            onA2AConfigChange={onA2AConfigChange}
            onExternalConfigChange={onExternalConfigChange}
            onInstructionSync={onInstructionSync}
            onApiKeysReload={onApiKeysReload}
          />
        </CollapsibleCard>
      )}

      {showBehaviorCard && (
        <CollapsibleCard
          title={t('edit.configuration.sections.behavior.title') || 'Comportamento na Conversa'}
          subtitle={
            t('edit.configuration.sections.behavior.subtitle') ||
            'Configure como o agente interage com os usuários'
          }
          icon={<MessageSquare className="h-5 w-5" />}
        >
          <BehaviorPanel
            behaviorSettings={behaviorSettings}
            onBehaviorSettingsChange={onBehaviorSettingsChange}
            onShowTransferRulesModal={() => setShowTransferRulesModal(true)}
            onShowPipelineRulesModal={() => setShowPipelineRulesModal(true)}
            onShowContactEditModal={() => setShowContactEditModal(true)}
          />
        </CollapsibleCard>
      )}

      {showMessageCard && (
        <CollapsibleCard
          title={
            t('edit.configuration.sections.messageHandling.title') || 'Tratamento de Mensagens'
          }
          subtitle={
            t('edit.configuration.sections.messageHandling.subtitle') ||
            'Configure como as mensagens são processadas e enviadas'
          }
          icon={<Clock className="h-5 w-5" />}
        >
          <MessageHandlingPanel
            agent={agent}
            llmConfigData={llmConfigData}
            externalConfigData={externalConfigData}
            behaviorSettings={behaviorSettings}
            onLLMConfigChange={onLLMConfigChange}
            onExternalConfigChange={onExternalConfigChange}
            onBehaviorSettingsChange={onBehaviorSettingsChange}
          />
        </CollapsibleCard>
      )}
    </div>
  );

  return (
    <>
      {supportsInactivityActions(agent.type) ? (
        <Tabs defaultValue="general">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-2 rounded-[12px] border border-border bg-card p-[6px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <TabsTrigger value="general" className={SEGMENT_CLASS}>
              <Settings className="size-[18px]" />
              {t('edit.configuration.tabs.general') || 'Geral'}
            </TabsTrigger>
            <TabsTrigger value="inactivity" className={SEGMENT_CLASS}>
              <Clock className="size-[18px]" />
              {t('edit.configuration.tabs.inactivityActions') || 'Ações de inatividade'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            {cards}
          </TabsContent>
          <TabsContent value="inactivity" className="mt-0">
            <InactivityActionsTab
              actions={inactivityActions}
              onChange={onInactivityActionsChange}
            />
          </TabsContent>
        </Tabs>
      ) : (
        cards
      )}

      <TransferRulesModal
        open={showTransferRulesModal}
        onOpenChange={setShowTransferRulesModal}
        onSave={onSave}
        isSaving={isSaving}
        rules={transferRules}
        onChange={onTransferRulesChange}
        availableUsers={availableUsers}
        availableTeams={availableTeams}
      />

      <PipelineRulesModal
        open={showPipelineRulesModal}
        onOpenChange={setShowPipelineRulesModal}
        rules={pipelineRules}
        onChange={onPipelineRulesChange}
        availablePipelines={availablePipelines}
        onSave={onSave}
        isSaving={isSaving}
      />

      <ContactEditModal
        open={showContactEditModal}
        onOpenChange={setShowContactEditModal}
        onSave={onSave}
        isSaving={isSaving}
        config={contactEditConfig}
        onChange={onContactEditConfigChange}
      />
    </>
  );
};

export default ConfigurationSection;
