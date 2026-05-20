import { VolumeX, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface MuteConversationNodeData {
  label: string;
  description?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    agents: any[];
    teams: any[];
  };
  // Backend compatibility - no params needed for mute
  action_params?: never[];
}

export interface MuteConversationNodeType {
  id: string;
  type: 'mute-conversation-node';
  position: { x: number; y: number };
  data: MuteConversationNodeData;
}

interface MuteConversationNodeProps {
  selected: boolean;
  data: MuteConversationNodeData;
  id: string;
}

export function MuteConversationNode({ selected, id }: MuteConversationNodeProps) {
  const { t } = useLanguage('journey');

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="orange"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="mute-conversation-output"
      targetHandleId="mute-conversation-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <VolumeX className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {t('flowEditor.nodes.muteConversation.name')}
          </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Informação da ação */}
        <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
          <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
            {t('flowEditor.nodes.muteConversation.description')}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}