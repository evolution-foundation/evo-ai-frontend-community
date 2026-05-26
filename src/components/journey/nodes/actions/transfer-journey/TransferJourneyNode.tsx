import { ArrowRight, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface TransferJourneyNodeData {
  targetJourneyId?: string;
  targetJourneyName?: string;
  label?: string;
  description?: string;
}

export interface TransferJourneyNodeType {
  id: string;
  type: 'transfer-journey-node';
  position: { x: number; y: number };
  data: TransferJourneyNodeData;
}

interface TransferJourneyNodeProps {
  selected: boolean;
  data: TransferJourneyNodeData;
  id: string;
}

export function TransferJourneyNode({ selected, data, id }: TransferJourneyNodeProps) {
  const { t } = useLanguage('journey');

  const getDescription = () => {
    if (!data.targetJourneyId || !data.targetJourneyName) {
      return t('panels.transferJourney.configure');
    }

    return `${t('panels.transferJourney.transferTo')}: ${data.targetJourneyName}`;
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="orange"
      isExecuting={false}
      hasSource={false} // Node final, não tem saída pois transfere para outra jornada
      nodeId={id}
      sourceHandleId="transfer-journey-output"
      targetHandleId="transfer-journey-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.transferJourney.nodeTitle')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Descrição */}
        <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
          <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
            {getDescription()}
          </p>
          {data.targetJourneyName && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {t('panels.transferJourney.finalActionMessage')}
            </p>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}