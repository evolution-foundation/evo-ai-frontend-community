import { LogOut } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface ExitJourneyNodeData {
  label: string;
  description?: string;
}

export interface ExitJourneyNodeType {
  id: string;
  type: 'exit-journey-node';
  position: { x: number; y: number };
  data: ExitJourneyNodeData;
}

interface ExitJourneyNodeProps {
  selected: boolean;
  data: ExitJourneyNodeData;
  id: string;
}

export function ExitJourneyNode({ selected, id }: ExitJourneyNodeProps) {
  const { t } = useLanguage('journey');

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="red"
      isExecuting={false}
      hasSource={false} // Node final, não tem saída
      nodeId={id}
      targetHandleId="exit-journey-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <LogOut className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('panels.exitJourney.title')}
            </h3>
          </div>
        </div>

        {/* Descrição */}
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-center">
          <LogOut className="h-6 w-6 text-red-400 mx-auto mb-2" />
          <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed font-medium">
            {t('panels.exitJourney.description')}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {t('panels.exitJourney.finalStepMessage')}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
