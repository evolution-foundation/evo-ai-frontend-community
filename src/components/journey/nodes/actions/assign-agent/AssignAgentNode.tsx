import { User, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface AssignAgentNodeData {
  label: string;
  description?: string;
  agent_id?: string;
  agent_name?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    agents: any[];
  };
}

export interface AssignAgentNodeType {
  id: string;
  type: 'assign-agent-node';
  position: { x: number; y: number };
  data: AssignAgentNodeData;
}

interface AssignAgentNodeProps {
  selected: boolean;
  data: AssignAgentNodeData;
  id: string;
}

export function AssignAgentNode({ selected, data, id }: AssignAgentNodeProps) {
  const { t } = useLanguage('journey');

  // Encontrar o agente selecionado
  const getAgentName = () => {
    if (data.agent_name) return data.agent_name;

    if (data.agent_id && data.formDataOptions?.agents) {
      const agent = data.formDataOptions.agents.find((a: any) =>
        a.id.toString() === data.agent_id?.toString()
      );
      return agent?.name || t('flowEditor.nodes.assignAgent.agentNumber', { agentId: data.agent_id });
    }

    return t('flowEditor.nodes.assignAgent.selectAgent');
  };

  const agentName = getAgentName();
  const hasAgentSelected = !!data.agent_id;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="blue"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="assign-agent-output"
      targetHandleId="assign-agent-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.assignAgent.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação do agente selecionado */}
        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {hasAgentSelected ? (
              <>{t('flowEditor.nodes.assignAgent.assignTo')} <strong>{agentName}</strong></>
            ) : (
              t('flowEditor.nodes.assignAgent.noAgentSelected')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
