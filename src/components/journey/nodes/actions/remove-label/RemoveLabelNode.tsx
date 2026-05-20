import { Tag, Settings, X } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface RemoveLabelNodeData {
  label: string;
  description?: string;
  labelId?: string;
  labelName?: string;
  labelColor?: string;
}

export interface RemoveLabelNodeType {
  id: string;
  type: 'remove-label-node';
  position: { x: number; y: number };
  data: RemoveLabelNodeData;
}

interface RemoveLabelNodeProps {
  selected: boolean;
  data: RemoveLabelNodeData;
  id: string;
}

export function RemoveLabelNode({ selected, data, id }: RemoveLabelNodeProps) {
  const { t } = useLanguage('journey');

  const getDescription = () => {
    if (!data.labelId || !data.labelName) {
      return t('flowEditor.nodes.removeLabel.configure');
    }

    return t('flowEditor.nodes.removeLabel.configured', { labelName: data.labelName });
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="red"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="remove-label-output"
      targetHandleId="remove-label-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <div className="relative">
              <Tag className="w-4 h-4 text-white" />
              <X className="w-2 h-2 text-white absolute -top-1 -right-1" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('flowEditor.nodes.removeLabel.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Descrição */}
        <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
          <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
            {getDescription()}
          </p>
          {data.labelColor && (
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: data.labelColor }}
              />
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}