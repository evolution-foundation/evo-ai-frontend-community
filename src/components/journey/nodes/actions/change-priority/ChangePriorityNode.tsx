import { AlertTriangle, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface ChangePriorityNodeData {
  label: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    priorities: any[];
  };
  // Backend compatibility - priority as params array
  action_params?: string[];
}

export interface ChangePriorityNodeType {
  id: string;
  type: 'change-priority-node';
  position: { x: number; y: number };
  data: ChangePriorityNodeData;
}

interface ChangePriorityNodeProps {
  selected: boolean;
  data: ChangePriorityNodeData;
  id: string;
}

export function ChangePriorityNode({ selected, data, id }: ChangePriorityNodeProps) {
  const { t } = useLanguage('journey');
  const hasPriority = !!data.priority;

  const getPriorityConfig = () => {
    if (!data.priority) return { color: 'gray', label: t('panels.changePriority.notConfigured'), icon: '❓' };
    
    const configs = {
      low: { color: 'blue', label: t('panels.changePriority.priorities.low'), icon: '🔵' },
      medium: { color: 'yellow', label: t('panels.changePriority.priorities.medium'), icon: '🟡' },
      high: { color: 'orange', label: t('panels.changePriority.priorities.high'), icon: '🟠' },
      urgent: { color: 'red', label: t('panels.changePriority.priorities.urgent'), icon: '🔴' },
    };
    
    return configs[data.priority] || { color: 'gray', label: t('panels.changePriority.notConfigured'), icon: '❓' };
  };

  const config = getPriorityConfig();

  const getDisplayText = () => {
    if (!hasPriority) {
      return t('panels.changePriority.noPriorityConfigured');
    }

    return t('panels.changePriority.changeToLower', { priority: config.label.toLowerCase() });
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="indigo"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="change-priority-output"
      targetHandleId="change-priority-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('panels.changePriority.alterPriority')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Informação da prioridade */}
        <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
          <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            {getDisplayText()}
          </p>
          
          {/* Preview da prioridade se configurada */}
          {hasPriority && (
            <div className="mt-1 pt-1 border-t border-indigo-200/50 dark:border-indigo-700/50">
              <div className="flex items-center gap-2">
                <span className="text-base">{config.icon}</span>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                  {t('panels.changePriority.priority')}: {config.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}