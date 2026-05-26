import { Clock, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface ScheduledActionNodeData {
  label: string;
  description?: string;
  delayDuration?: number;
  delayUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  actionType?: string;
  actionConfig?: Record<string, any>;
  retryPolicy?: {
    maxRetries?: number;
    backoffMultiplier?: number;
  };
  createScheduledAction?: boolean;
  notifyUserId?: string;
}

export interface ScheduledActionNodeType {
  id: string;
  type: 'scheduled-action-node';
  position: { x: number; y: number };
  data: ScheduledActionNodeData;
}

interface ScheduledActionNodeProps {
  selected: boolean;
  data: ScheduledActionNodeData;
  id: string;
}

export function ScheduledActionNode({ selected, data, id }: ScheduledActionNodeProps) {
  const { t } = useLanguage('journey');

  const getDescription = () => {
    if (!data.delayDuration || !data.delayUnit) {
      return t('flowEditor.nodes.scheduledAction.configure');
    }

    const unitKey = data.delayDuration === 1
      ? `units.${data.delayUnit}.singular`
      : `units.${data.delayUnit}.plural`;

    const unitLabel = t(unitKey);
    const actionLabel = data.actionType
      ? t(`flowEditor.nodes.scheduledAction.actions.${data.actionType}`)
      : '';

    return t('flowEditor.nodes.scheduledAction.description', {
      duration: data.delayDuration,
      unit: unitLabel,
      action: actionLabel,
    });
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="orange"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="scheduled-action-output"
      targetHandleId="scheduled-action-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.scheduledAction.title')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Description */}
        <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
          <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
            {getDescription()}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
