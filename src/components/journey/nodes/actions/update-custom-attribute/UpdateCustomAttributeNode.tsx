import { Settings as SettingsIcon, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface UpdateCustomAttributeNodeData {
  label: string;
  description?: string;
  attributeId?: string;
  // attributeName carries the attribute_key (slug) used as the CRM api key.
  attributeName?: string;
  // attributeDisplayName is the human-readable label, for UI only (EVO-1850).
  attributeDisplayName?: string;
  attributeDisplayType?: string;
  newValue?: string;
}

export interface UpdateCustomAttributeNodeType {
  id: string;
  type: 'update-custom-attribute-node';
  position: { x: number; y: number };
  data: UpdateCustomAttributeNodeData;
}

interface UpdateCustomAttributeNodeProps {
  selected: boolean;
  data: UpdateCustomAttributeNodeData;
  id: string;
}

const ATTRIBUTE_TYPE_ICONS: Record<string, string> = {
  text: '📝',
  number: '🔢',
  currency: '💰',
  percent: '📊',
  link: '🔗',
  date: '📅',
  list: '📋',
  checkbox: '☑️',
};

export function UpdateCustomAttributeNode({ selected, data, id }: UpdateCustomAttributeNodeProps) {
  const { t } = useLanguage('journey');

  const getDescription = () => {
    if (!data.attributeId || !data.attributeName || !data.newValue) {
      return t('panels.updateCustomAttribute.configure');
    }

    return t('panels.updateCustomAttribute.updates', {
      attribute: data.attributeDisplayName || data.attributeName,
      value: data.newValue,
    });
  };

  const getTypeIcon = () => {
    return data.attributeDisplayType
      ? ATTRIBUTE_TYPE_ICONS[data.attributeDisplayType] || '⚙️'
      : '⚙️';
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="pink"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="update-custom-attribute-output"
      targetHandleId="update-custom-attribute-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.updateCustomAttribute.nodeTitle')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Descrição */}
        <div className="p-2 rounded-md bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/30">
          <p className="text-xs text-pink-800 dark:text-pink-200 leading-relaxed">
            {getDescription()}
          </p>
          {data.attributeName && data.newValue && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs">{getTypeIcon()}</span>
              <span className="text-xs text-pink-700 dark:text-pink-300 font-medium">
                {data.attributeDisplayName || data.attributeName}
              </span>
              <span className="text-xs text-pink-600 dark:text-pink-400">→ {data.newValue}</span>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}
