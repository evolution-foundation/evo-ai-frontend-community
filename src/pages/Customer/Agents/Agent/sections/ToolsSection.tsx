import AgentToolsSection from '@/components/ai_agents/AgentToolsSection';
import CustomToolsSection from '@/components/ai_agents/CustomToolsSection';
import { CustomTool } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';
import { Users, Code } from 'lucide-react';
import { Agent } from '@/types';

interface ToolsSectionProps {
  agentTools: string[];
  agentToolsData?: Agent[];
  customTools: {
    http_tools: CustomTool[];
  };
  onAgentToolsChange: (agentTools: string[], agentToolsData?: Agent[]) => void;
  onCustomToolsChange: (customTools: { http_tools: CustomTool[] }) => void;
  editingAgentId?: string;
  folderId?: string;
}

const ToolsSection = ({
  agentTools,
  agentToolsData,
  customTools,
  onAgentToolsChange,
  onCustomToolsChange,
  editingAgentId,
  folderId,
}: ToolsSectionProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    // Same structure as the Sub Agents block so both columns share a baseline.
    // `lg`, not `md`: at 768-1024 each column is too narrow for the empty-state row,
    // and it matches the Integrations/MCP grids on the same tab.
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-blue-500/10">
            <Users className="h-[18px] w-[18px] text-blue-500" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              {t('tools.agentTools.title') || 'Agentes como Ferramentas'}
            </h3>
            <p className="mt-[3px] text-[13px] leading-[1.5] text-muted-foreground">
              {t('tools.agentTools.subtitle') || 'Use outros agentes como ferramentas para expandir as capacidades deste agente'}
            </p>
          </div>
        </div>

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

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-purple-500/10">
            <Code className="h-[18px] w-[18px] text-purple-500" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              {t('tools.customTools.title') || 'Ferramentas Customizadas'}
            </h3>
            <p className="mt-[3px] text-[13px] leading-[1.5] text-muted-foreground">
              {t('tools.customTools.subtitle') || 'Configure ferramentas HTTP personalizadas para integrar com APIs externas'}
            </p>
          </div>
        </div>

        <CustomToolsSection
          customTools={customTools}
          onCustomToolsChange={onCustomToolsChange}
          isReadOnly={false}
        />
      </div>
    </div>
  );
};

export default ToolsSection;

