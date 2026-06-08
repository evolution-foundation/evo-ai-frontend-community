import { Clock, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface DeferConversationNodeData {
  label: string;
  description?: string;
  snooze_until?: string; // ISO date string
  snooze_duration?: number; // hours
  snooze_type?: 'duration' | 'until_date';
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    agents: any[];
    teams: any[];
  };
  // Backend compatibility - no params needed for snooze
  action_params?: never[];
}

export interface DeferConversationNodeType {
  id: string;
  type: 'defer-conversation-node';
  position: { x: number; y: number };
  data: DeferConversationNodeData;
}

interface DeferConversationNodeProps {
  selected: boolean;
  data: DeferConversationNodeData;
  id: string;
}

export function DeferConversationNode({ selected, data, id }: DeferConversationNodeProps) {
  const { t } = useLanguage('journey');
  const hasSnoozeConfig = !!(data.snooze_type && (data.snooze_until || data.snooze_duration));

  const getDisplayText = () => {
    if (!hasSnoozeConfig) {
      return t('panels.deferConversation.node.noConfig');
    }

    if (data.snooze_type === 'duration' && data.snooze_duration) {
      const duration = data.snooze_duration;
      if (duration < 24) {
        return t('panels.deferConversation.node.durationHours', {
          duration,
          durationPlural: duration === 1 ? '' : 's'
        });
      } else {
        const days = Math.floor(duration / 24);
        const hours = duration % 24;
        if (hours === 0) {
          return t('panels.deferConversation.node.durationDays', {
            days,
            daysPlural: days === 1 ? '' : 's'
          });
        }
        return t('panels.deferConversation.node.durationMixed', { days, hours });
      }
    }

    if (data.snooze_type === 'until_date' && data.snooze_until) {
      try {
        const date = new Date(data.snooze_until);
        return t('panels.deferConversation.node.untilDate', {
          date: date.toLocaleDateString('pt-BR'),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      } catch (error) {
        return t('panels.deferConversation.node.invalidDate');
      }
    }

    return t('panels.deferConversation.node.incompleteConfig');
  };

  const getConfigPreview = () => {
    if (!hasSnoozeConfig) return null;

    if (data.snooze_type === 'duration' && data.snooze_duration) {
      return t('panels.deferConversation.node.configPreview.duration', {
        duration: data.snooze_duration
      });
    }

    if (data.snooze_type === 'until_date' && data.snooze_until) {
      try {
        const date = new Date(data.snooze_until);
        return t('panels.deferConversation.node.configPreview.untilDate', {
          date: date.toLocaleDateString('pt-BR'),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      } catch (error) {
        return t('panels.deferConversation.node.configPreview.invalidDate');
      }
    }

    return null;
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="yellow"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="defer-conversation-output"
      targetHandleId="defer-conversation-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.deferConversation.node.title')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação da configuração */}
        <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
            {getDisplayText()}
          </p>
          
          {/* Preview da configuração */}
          {hasSnoozeConfig && (
            <div className="mt-1 pt-1 border-t border-yellow-200/50 dark:border-yellow-700/50">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                ⏰ {getConfigPreview()}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}