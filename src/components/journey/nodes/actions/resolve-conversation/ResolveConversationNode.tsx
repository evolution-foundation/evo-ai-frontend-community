import { CheckCircle, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface ResolveConversationNodeData {
  label: string;
  description?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    agents: any[];
    teams: any[];
  };
  // Backend compatibility - no params needed for resolve
  action_params?: never[];
}

export interface ResolveConversationNodeType {
  id: string;
  type: 'resolve-conversation-node';
  position: { x: number; y: number };
  data: ResolveConversationNodeData;
}

interface ResolveConversationNodeProps {
  selected: boolean;
  data: ResolveConversationNodeData;
  id: string;
}

export function ResolveConversationNode({ selected, id }: ResolveConversationNodeProps) {
  const { t } = useLanguage('journey');

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="green"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="resolve-conversation-output"
      targetHandleId="resolve-conversation-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">
            {t('flowEditor.nodes.resolveConversation.name')}
          </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação da ação */}
        <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
          <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
            {t('panels.resolveConversation.actionDescription')}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}