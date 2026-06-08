import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Settings, Hash, Calendar } from 'lucide-react';
import { SetVariableNodeData } from './SetVariableNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { VariableInput, VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface SetVariablePanelProps {
  nodeId: string;
  data: SetVariableNodeData;
  onUpdate: (nodeId: string, newData: SetVariableNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function SetVariablePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: SetVariablePanelProps) {
  const { t } = useLanguage('journey');

  const OPERATIONS = [
    {
      value: 'set',
      label: t('panels.setVariable.operations.set.label'),
      icon: '✏️',
      description: t('panels.setVariable.operations.set.description'),
      needsValue: true,
      category: 'custom',
    },
    {
      value: 'clear',
      label: t('panels.setVariable.operations.clear.label'),
      icon: '🧹',
      description: t('panels.setVariable.operations.clear.description'),
      needsValue: false,
      category: 'custom',
    },
    {
      value: 'increase',
      label: t('panels.setVariable.operations.increment.label'),
      icon: '➕',
      description: t('panels.setVariable.operations.increment.description'),
      needsValue: true,
      category: 'numeric',
    },
    {
      value: 'decrease',
      label: t('panels.setVariable.operations.decrement.label'),
      icon: '➖',
      description: t('panels.setVariable.operations.decrement.description'),
      needsValue: true,
      category: 'numeric',
    },
    {
      value: 'now',
      label: t('panels.setVariable.operations.now.label'),
      icon: '🕐',
      description: t('panels.setVariable.operations.now.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'yesterday',
      label: t('panels.setVariable.operations.yesterday.label'),
      icon: '📅',
      description: t('panels.setVariable.operations.yesterday.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'tomorrow',
      label: t('panels.setVariable.operations.tomorrow.label'),
      icon: '📆',
      description: t('panels.setVariable.operations.tomorrow.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'time_of_day',
      label: t('panels.setVariable.operations.timeOfDay.label'),
      icon: '🌅',
      description: t('panels.setVariable.operations.timeOfDay.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'random_id',
      label: t('panels.setVariable.operations.randomId.label'),
      icon: '🎲',
      description: t('panels.setVariable.operations.randomId.description'),
      needsValue: false,
      category: 'functions',
      needsCategory: true,
    },
  ];

  const ID_CATEGORIES = [
    { value: 'uuid', label: t('panels.setVariable.idCategories.uuid'), description: '' },
    { value: 'numeric', label: t('panels.setVariable.idCategories.numeric'), description: '' },
    { value: 'alphanumeric', label: t('panels.setVariable.idCategories.alphanumeric'), description: '' },
    { value: 'timestamp', label: t('panels.setVariable.idCategories.timestamp'), description: '' },
  ];

  const initialFormData: SetVariableNodeData = {
    variableName: '',
    operation: 'set',
    value: '',
    category: '',
    ...data,
  };
  const [originalData] = useState<SetVariableNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<SetVariableNodeData>(initialFormData);

  useEffect(() => {
    setFormData({
      variableName: '',
      operation: 'set',
      value: '',
      category: '',
      ...data,
    });
  }, [data]);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const selectedOperation = OPERATIONS.find(op => op.value === formData.operation);
  const isValid = Boolean(
    formData.variableName &&
      (!selectedOperation?.needsValue || formData.value) &&
      (!selectedOperation?.needsCategory || formData.category),
  );
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  const renderValueInput = () => {
    if (!selectedOperation?.needsValue) return null;

    switch (formData.operation) {
      case 'increase':
      case 'decrease':
        return (
          <VariableInput
            type="number"
            min="1"
            value={formData.value || '1'}
            onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder={t('panels.setVariable.placeholders.numericAmount')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
            onVariableInsert={variable => {
              console.log('Variable inserted in numeric operation:', variable);
            }}
          />
        );

      default:
        return (
          <VariableInput
            value={formData.value || ''}
            onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder={t('panels.setVariable.placeholders.customValue')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
            onVariableInsert={variable => {
              console.log('Variable inserted in custom value:', variable);
            }}
          />
        );
    }
  };

  const getOperationsByCategory = () => {
    const categories: Record<string, typeof OPERATIONS> = {
      custom: [],
      numeric: [],
      datetime: [],
      functions: [],
    };

    OPERATIONS.forEach(op => {
      if (categories[op.category]) {
        categories[op.category].push(op);
      }
    });

    return categories;
  };

  const categories = getOperationsByCategory();

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.setVariable.title')}
      icon={<Settings className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.setVariable.buttons.save')}
      cancelLabel={t('panels.setVariable.buttons.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.setVariable.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              {!formData.variableName && <li>{t('panels.setVariable.enterVariableName')}</li>}
              {selectedOperation?.needsValue && !formData.value && (
                <li>{t('panels.setVariable.configureValue')}</li>
              )}
              {selectedOperation?.needsCategory && !formData.category && (
                <li>{t('panels.setVariable.selectCategory')}</li>
              )}
            </ul>
          </FlowFeedbackBanner>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.setVariable.variable')}</Label>
          <VariableSelect
            value={formData.variableName || ''}
            onValueChange={value => setFormData(prev => ({ ...prev, variableName: value }))}
            journeyId={journeyId}
            placeholder={t('panels.setVariable.placeholders.variableName')}
            showCreateOption={true}
            showSystemVariables={false}
          />
          {formData.variableName && (
            <p className="text-xs text-muted-foreground">
              {t('panels.setVariable.variable')}: {formData.variableName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.setVariable.operation')}</Label>
          <Select
            value={formData.operation || 'set'}
            onValueChange={value =>
              setFormData(prev => ({
                ...prev,
                operation: value as SetVariableNodeData['operation'],
              }))
            }
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('panels.setVariable.placeholders.selectOperation')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border max-h-[400px]">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  {t('panels.setVariable.operationCategories.custom')}
                </div>
              </div>
              {categories.custom.map(operation => (
                <SelectItem
                  key={operation.value}
                  value={operation.value}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>{operation.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{operation.label}</span>
                      <span className="text-xs text-muted-foreground">{operation.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}

              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  {t('panels.setVariable.operationCategories.numeric')}
                </div>
              </div>
              {categories.numeric.map(operation => (
                <SelectItem
                  key={operation.value}
                  value={operation.value}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>{operation.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{operation.label}</span>
                      <span className="text-xs text-muted-foreground">{operation.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}

              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {t('panels.setVariable.operationCategories.datetime')}
                </div>
              </div>
              {categories.datetime.map(operation => (
                <SelectItem
                  key={operation.value}
                  value={operation.value}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>{operation.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{operation.label}</span>
                      <span className="text-xs text-muted-foreground">{operation.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}

              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  {t('panels.setVariable.operationCategories.functions')}
                </div>
              </div>
              {categories.functions.map(operation => (
                <SelectItem
                  key={operation.value}
                  value={operation.value}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>{operation.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{operation.label}</span>
                      <span className="text-xs text-muted-foreground">{operation.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedOperation && (
            <p className="text-xs text-muted-foreground">{selectedOperation.description}</p>
          )}
        </div>

        {selectedOperation?.needsValue && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {formData.operation === 'increase' || formData.operation === 'decrease'
                ? t('panels.setVariable.amount')
                : t('panels.setVariable.value')}
            </Label>
            {renderValueInput()}
            <p className="text-xs text-muted-foreground">
              {t('panels.setVariable.helperTexts.customValue')}
            </p>
          </div>
        )}

        {selectedOperation?.needsCategory && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('panels.setVariable.idCategory')}</Label>
            <Select
              value={formData.category || ''}
              onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder={t('panels.setVariable.placeholders.selectIdCategory')} />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {ID_CATEGORIES.map(category => (
                  <SelectItem
                    key={category.value}
                    value={category.value}
                    className="text-sidebar-foreground"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{category.label}</span>
                      <span className="text-xs text-sidebar-foreground/60">
                        {category.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isValid && (
          <FlowFeedbackBanner variant="info">
            <p className="mb-2">
              <strong>{t('panels.setVariable.preview.variableConfigured')}:</strong>
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{selectedOperation?.icon}</span>
              <span className="font-medium">
                {formData.variableName?.replace(/[{}]/g, '') || formData.variableName}
              </span>
              <span>←</span>
              <span className="font-medium">
                {selectedOperation?.label}
                {formData.value && ` (${formData.value})`}
                {formData.category &&
                  ` - ${ID_CATEGORIES.find(c => c.value === formData.category)?.label}`}
              </span>
            </div>
            <p className="text-xs">{selectedOperation?.description}</p>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
