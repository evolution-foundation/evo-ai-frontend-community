import { Variable, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface SetVariableNodeData {
  label?: string;
  description?: string;
  variableName?: string;
  operation?: 'set' | 'clear' | 'increase' | 'decrease' | 'now' | 'yesterday' | 'tomorrow' | 'time_of_day' | 'random_id';
  value?: string;
  category?: string; // Para random_id
  displayName?: string;
}

export interface SetVariableNodeType {
  id: string;
  type: 'set-variable-node';
  position: { x: number; y: number };
  data: SetVariableNodeData;
}

interface SetVariableNodeProps {
  selected: boolean;
  data: SetVariableNodeData;
  id: string;
}

export function SetVariableNode({ selected, data, id }: SetVariableNodeProps) {
  const { t } = useLanguage('journey');

  const getOperationLabel = () => {
    switch (data.operation) {
      case 'set': return t('flowEditor.nodes.setVariable.operations.set');
      case 'clear': return t('flowEditor.nodes.setVariable.operations.clear');
      case 'increase': return t('flowEditor.nodes.setVariable.operations.increment');
      case 'decrease': return t('flowEditor.nodes.setVariable.operations.decrement');
      case 'now': return t('flowEditor.nodes.setVariable.operations.now');
      case 'yesterday': return t('flowEditor.nodes.setVariable.operations.yesterday');
      case 'tomorrow': return t('flowEditor.nodes.setVariable.operations.tomorrow');
      case 'time_of_day': return t('flowEditor.nodes.setVariable.operations.timeOfDay');
      case 'random_id': return t('flowEditor.nodes.setVariable.operations.randomId');
      default: return t('flowEditor.nodes.setVariable.operations.set');
    }
  };

  const getOperationColor = () => {
    switch (data.operation) {
      case 'set': return 'text-purple-600';
      case 'clear': return 'text-gray-600';
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      case 'now':
      case 'yesterday':
      case 'tomorrow':
      case 'time_of_day': return 'text-blue-600';
      case 'random_id': return 'text-orange-600';
      default: return 'text-purple-600';
    }
  };

  const getPreviewValue = () => {
    switch (data.operation) {
      case 'set': return data.value ? `"${data.value}"` : t('flowEditor.nodes.setVariable.previewValues.undefined');
      case 'clear': return t('flowEditor.nodes.setVariable.previewValues.clear');
      case 'increase': return data.value ? `+${data.value}` : '+1';
      case 'decrease': return data.value ? `-${data.value}` : '-1';
      case 'now': return t('flowEditor.nodes.setVariable.previewValues.currentDateTime');
      case 'yesterday': return t('flowEditor.nodes.setVariable.previewValues.yesterdayDate');
      case 'tomorrow': return t('flowEditor.nodes.setVariable.previewValues.tomorrowDate');
      case 'time_of_day': return t('flowEditor.nodes.setVariable.previewValues.currentTimeOfDay');
      case 'random_id': return data.category ? `${t('flowEditor.nodes.setVariable.previewValues.randomId')} (${data.category})` : t('flowEditor.nodes.setVariable.previewValues.randomId');
      default: return '';
    }
  };

  const getDisplayText = () => {
    if (!data.variableName || !data.operation) {
      return t('flowEditor.nodes.setVariable.configure');
    }
    return null;
  };

  const displayText = getDisplayText();

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      hasSource={true}
      borderColor="purple"
      isExecuting={false}
      nodeId={id}
      targetHandleId={`${id}-input`}
      sourceHandleId={`${id}-output`}
    >
      {/* Header seguindo nosso padrão */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
          <Variable className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">
            {t('flowEditor.nodes.setVariable.name')}
          </h3>
          {data.variableName && (
            <p className="text-xs text-gray-600 dark:text-muted-foreground mt-1">
              {data.variableName}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <Settings className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      {displayText ? (
        <div className="mt-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-xs text-purple-600 dark:text-purple-300">{displayText}</p>
        </div>
      ) : (
        data.variableName && data.operation && (
          <div className="mt-3">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
              <div className={`text-xs font-medium ${getOperationColor()}`}>
                {getOperationLabel()}
              </div>
              <div className="text-xs text-gray-600 dark:text-muted-foreground mt-1">
                {getPreviewValue()}
              </div>
            </div>
          </div>
        )
      )}
    </BaseFlowNode>
  );
}