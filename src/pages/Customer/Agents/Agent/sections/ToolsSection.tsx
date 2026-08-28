import { useState } from 'react';
import AgentToolsSection from '@/components/ai_agents/AgentToolsSection';
import CustomToolsSection from '@/components/ai_agents/CustomToolsSection';
import AdvancedSettingsSection from '@/components/ai_agents/AdvancedSettingsSection';
import { CustomTool } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';
import { Users, Code } from 'lucide-react';
import { Agent } from '@/types';

interface AdvancedSettingsData {
  load_memory: boolean;
  preload_memory: boolean;
  planner: boolean;
  load_knowledge: boolean;
  knowledge_tags: string[];
}

interface ToolsSectionProps {
  agentTools: string[];
  agentToolsData?: Agent[];
  customTools: {
    http_tools: CustomTool[];
  };
  advancedSettings: AdvancedSettingsData;
  onAgentToolsChange: (agentTools: string[], agentToolsData?: Agent[]) => void;
  onCustomToolsChange: (customTools: { http_tools: CustomTool[] }) => void;
  onAdvancedSettingsChange: (settings: AdvancedSettingsData) => void;
  editingAgentId?: string;
  folderId?: string;
}

const ToolsSection = ({
  agentTools,
  agentToolsData,
  customTools,
  advancedSettings,
  onAgentToolsChange,
  onCustomToolsChange,
  onAdvancedSettingsChange,
  editingAgentId,
  folderId,
}: ToolsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <div className="space-y-8">
      {/* Seção: Agentes como Ferramentas */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {t('tools.agentTools.title') || 'Agentes como Ferramentas'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('tools.agentTools.subtitle') || 'Use outros agentes como ferramentas para expandir as capacidades deste agente'}
            </p>
          </div>
        </div>

        <div className="pl-11">
          <AgentToolsSection
            agentTools={agentTools}
            agentToolsData={agentToolsData}
            onAgentToolsChange={onAgentToolsChange}
            clientId="default"
            folderId={folderId}
            editingAgentId={editingAgentId}
            isReadOnly={false}
          />
        </div>
      </div>

      {/* Seção: Ferramentas Customizadas */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Code className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {t('tools.customTools.title') || 'Ferramentas Customizadas'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('tools.customTools.subtitle') || 'Configure ferramentas HTTP personalizadas para integrar com APIs externas'}
            </p>
          </div>
        </div>

        <div className="pl-11">
          <CustomToolsSection
            customTools={customTools}
            onCustomToolsChange={onCustomToolsChange}
            isReadOnly={false}
          />
        </div>
      </div>

      {/* Configurações Avançadas (memória, planner) */}
      <AdvancedSettingsSection
        data={advancedSettings}
        isOpen={showAdvancedSettings}
        onToggle={() => setShowAdvancedSettings(prev => !prev)}
        onAdvancedSettingsChange={onAdvancedSettingsChange}
        isReadOnly={false}
      />
    </div>
  );
};

export default ToolsSection;

