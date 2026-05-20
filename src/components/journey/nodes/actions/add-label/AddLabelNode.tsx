import { Tag, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface AddLabelNodeData {
  label: string;
  description?: string;
  labelId?: string;
  labelName?: string;
  labelColor?: string;
}

export interface AddLabelNodeType {
  id: string;
  type: 'add-label-node';
  position: { x: number; y: number };
  data: AddLabelNodeData;
}

interface AddLabelNodeProps {
  selected: boolean;
  data: AddLabelNodeData;
  id: string;
}

export function AddLabelNode({ selected, data, id }: AddLabelNodeProps) {
  const { t } = useLanguage('journey');

  const getDescription = () => {
    if (!data.labelId || !data.labelName) {
      return t('flowEditor.nodes.addLabel.description');
    }

    return t('flowEditor.nodes.addLabel.configured', { labelName: data.labelName });
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="green"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="add-label-output"
      targetHandleId="add-label-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              Adicionar Etiqueta
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Descrição */}
        <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
          <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
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