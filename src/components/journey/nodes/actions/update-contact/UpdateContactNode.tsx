import { UserCog, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface UpdateContactNodeData {
  label: string;
  description?: string;
  fieldToUpdate?: 'name' | 'email' | 'phone_number' | 'identifier';
  newValue?: string;
  fieldLabel?: string;
}

export interface UpdateContactNodeType {
  id: string;
  type: 'update-contact-node';
  position: { x: number; y: number };
  data: UpdateContactNodeData;
}

interface UpdateContactNodeProps {
  selected: boolean;
  data: UpdateContactNodeData;
  id: string;
}

export function UpdateContactNode({ selected, data, id }: UpdateContactNodeProps) {
  const { t } = useLanguage('journey');

  const CONTACT_FIELD_LABELS = {
    name: t('panels.updateContact.fields.name'),
    email: t('panels.updateContact.fields.email'),
    phone_number: t('panels.updateContact.fields.phone_number'),
    identifier: t('panels.updateContact.fields.identifier'),
  };

  const getDescription = () => {
    if (!data.fieldToUpdate || !data.newValue) {
      return t('panels.updateContact.configure');
    }

    const fieldLabel = CONTACT_FIELD_LABELS[data.fieldToUpdate] || data.fieldToUpdate;
    return t('panels.updateContact.updates', { field: fieldLabel, value: data.newValue });
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="cyan"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="update-contact-output"
      targetHandleId="update-contact-input"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <UserCog className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {t('panels.updateContact.nodeTitle')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Descrição */}
        <div className="p-2 rounded-md bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/30">
          <p className="text-xs text-cyan-800 dark:text-cyan-200 leading-relaxed">
            {getDescription()}
          </p>
          {data.fieldToUpdate && data.newValue && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-cyan-700 dark:text-cyan-300 font-medium">
                {CONTACT_FIELD_LABELS[data.fieldToUpdate]}
              </span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400">→ {data.newValue}</span>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}
