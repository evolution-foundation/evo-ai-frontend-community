import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@evoapi/design-system';
import { Users, Wrench, Plug, Server } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import SubAgentsForm, { SubAgentsData } from '@/components/ai_agents/Forms/SubAgentsForm';
import ToolsSection from '../sections/ToolsSection';
import IntegrationsSection from '../sections/IntegrationsSection';
import MCPServersSection from '../sections/MCPServersSection';
import { CustomTool, MCPServerConfig } from '@/types/ai';
import { Agent } from '@/types';
import { supportsSubAgents, supportsToolBlocks } from './agentTabs';

interface AgentToolsAccordionProps {
  agentId: string;
  agentType?: string;

  subAgentsData: SubAgentsData;
  onSubAgentsChange: (data: SubAgentsData) => void;

  agentTools: string[];
  agentToolsData: Agent[];
  customTools: { http_tools: CustomTool[] };
  onAgentToolsChange: (agentTools: string[], agentToolsData?: Agent[]) => void;
  onCustomToolsChange: (customTools: { http_tools: CustomTool[] }) => void;

  integrations: Record<string, unknown>;
  onIntegrationsChange: (integrations: Record<string, unknown>) => void;

  mcpServers: MCPServerConfig[];
  customMCPServerIds: string[];
  onMCPServersChange: (mcpServers: MCPServerConfig[]) => void;
  onCustomMCPServersChange: (serverIds: string[]) => void;
}

const AgentToolsAccordion = ({
  agentId,
  agentType,
  subAgentsData,
  onSubAgentsChange,
  agentTools,
  agentToolsData,
  customTools,
  onAgentToolsChange,
  onCustomToolsChange,
  integrations,
  onIntegrationsChange,
  mcpServers,
  customMCPServerIds,
  onMCPServersChange,
  onCustomMCPServersChange,
}: AgentToolsAccordionProps) => {
  const { t } = useLanguage('aiAgents');

  const showSubAgents = supportsSubAgents(agentType);
  const showToolBlocks = supportsToolBlocks(agentType);

  // Border on the trigger and the content, not the item: on the item it draws a seam.
  const itemClass = 'mb-[14px] border-0';
  const triggerClass =
    'items-center gap-3 rounded-[14px] border border-border bg-card px-[17px] py-[15px] text-[14.5px] font-bold text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:no-underline data-[state=open]:rounded-b-none data-[state=open]:border-b-0 [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:text-muted-foreground';
  // `pt-5` because no border separates the header from the body anymore.
  const contentClass =
    'rounded-b-[14px] border border-t-0 border-border bg-card px-5 pb-5 pt-5';
  const iconClass = 'mr-3 h-[18px] w-[18px] text-primary';

  return (
    <Accordion type="multiple" defaultValue={showSubAgents ? ['subAgents'] : ['tools']}>
      {showSubAgents && (
        <AccordionItem value="subAgents" className={itemClass}>
          <AccordionTrigger className={triggerClass}>
            <span className="flex flex-1 items-center">
              <Users className={iconClass} />
              {t('edit.menu.subAgents') || 'Sub Agentes'}
            </span>
          </AccordionTrigger>
          <AccordionContent className={contentClass}>
            <SubAgentsForm
              mode="edit"
              embedded
              data={subAgentsData}
              onChange={onSubAgentsChange}
              onValidationChange={() => {}}
              editingAgentId={agentId}
              folderId={undefined}
            />
          </AccordionContent>
        </AccordionItem>
      )}

      {showToolBlocks && (
        <>
          <AccordionItem value="tools" className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <span className="flex flex-1 items-center">
                <Wrench className={iconClass} />
                {t('edit.menu.tools') || 'Ferramentas'}
              </span>
            </AccordionTrigger>
            <AccordionContent className={contentClass}>
              <ToolsSection
                agentTools={agentTools}
                agentToolsData={agentToolsData}
                customTools={customTools}
                onAgentToolsChange={onAgentToolsChange}
                onCustomToolsChange={onCustomToolsChange}
                editingAgentId={agentId}
                folderId={undefined}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="integrations" className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <span className="flex flex-1 items-center">
                <Plug className={iconClass} />
                {t('edit.menu.integrations') || 'Integrações'}
              </span>
            </AccordionTrigger>
            <AccordionContent className={contentClass}>
              <IntegrationsSection
                integrations={integrations}
                agentId={agentId}
                onIntegrationsChange={onIntegrationsChange}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mcpServers" className={itemClass}>
            <AccordionTrigger className={triggerClass}>
              <span className="flex flex-1 items-center">
                <Server className={iconClass} />
                {t('edit.menu.mcpServers') || 'Servidores MCP'}
              </span>
            </AccordionTrigger>
            <AccordionContent className={contentClass}>
              <MCPServersSection
                mcpServers={mcpServers}
                customMCPServerIds={customMCPServerIds}
                onMCPServersChange={onMCPServersChange}
                onCustomMCPServersChange={onCustomMCPServersChange}
                agentId={agentId}
              />
            </AccordionContent>
          </AccordionItem>
        </>
      )}
    </Accordion>
  );
};

export default AgentToolsAccordion;
