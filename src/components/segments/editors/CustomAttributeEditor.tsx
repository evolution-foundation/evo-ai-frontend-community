import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from '@evoapi/design-system';
import { CustomAttributeNode } from '@/types/analytics';
import { CustomAttributeDefinition } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface CustomAttributeEditorProps {
  condition: CustomAttributeNode;
  availableCustomAttributes: CustomAttributeDefinition[];
  loadingCustomAttributes: boolean;
  customAttributeName: string;
  customAttributeOperatorType: string;
  customAttributeValue: string;
  onAttributeNameChange: (name: string) => void;
  onOperatorTypeChange: (type: string) => void;
  onValueChange: (value: string) => void;
  onUpdate: (condition: CustomAttributeNode) => void;
  onLoadCustomAttributes: () => void;
}

const getOperators = (t: (key: string) => string) => [
  { value: 'Equals', label: t('operators.equals') },
  { value: 'NotEquals', label: t('operators.notEquals') },
  { value: 'Contains', label: t('operators.contains') },
  { value: 'NotContains', label: t('operators.notContains') },
  { value: 'Exists', label: t('operators.exists') },
  { value: 'NotExists', label: t('operators.notExists') },
];

export default function CustomAttributeEditor({
  condition,
  availableCustomAttributes,
  loadingCustomAttributes,
  customAttributeName,
  customAttributeOperatorType,
  customAttributeValue,
  onAttributeNameChange,
  onOperatorTypeChange,
  onValueChange,
  onUpdate,
  onLoadCustomAttributes,
}: CustomAttributeEditorProps) {
  const { t } = useLanguage('segments');
  const operators = getOperators(t);
  const handleAttributeNameChange = (name: string) => {
    onAttributeNameChange(name);
    const updatedCondition = {
      ...condition,
      attributeName: name,
    };
    onUpdate(updatedCondition);
  };

  const handleOperatorTypeChange = (type: string) => {
    onOperatorTypeChange(type);
    const updatedCondition = {
      ...condition,
      operator: {
        type,
        value: customAttributeValue,
      },
    };
    onUpdate(updatedCondition);
  };

  const handleValueChange = (value: string) => {
    onValueChange(value);
    const updatedCondition = {
      ...condition,
      operator: {
        type: customAttributeOperatorType,
        value,
      },
    };
    onUpdate(updatedCondition);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('customAttributeEditor.attribute')}</Label>
        <Select
          value={customAttributeName}
          onValueChange={handleAttributeNameChange}
          onOpenChange={(open) => {
            if (open && availableCustomAttributes.length === 0) {
              onLoadCustomAttributes();
            }
          }}
        >
          <SelectTrigger>
            <SelectValue 
              placeholder={loadingCustomAttributes ? t('customAttributeEditor.loading') : t('customAttributeEditor.selectAttribute')}
            />
          </SelectTrigger>
          <SelectContent>
            {availableCustomAttributes.length === 0 && !loadingCustomAttributes && (
              <div className="p-2 text-sm text-gray-500">
                {t('customAttributeEditor.noAttributes')}
              </div>
            )}
            {availableCustomAttributes.map((attr) => (
              <SelectItem key={attr.attribute_key} value={attr.attribute_key}>
                {attr.attribute_display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t('customAttributeEditor.operator')}</Label>
        <Select value={customAttributeOperatorType} onValueChange={handleOperatorTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {customAttributeOperatorType !== 'Exists' && customAttributeOperatorType !== 'NotExists' && (
        <div>
          <Label>{t('customAttributeEditor.value')}</Label>
          <Input
            value={customAttributeValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={t('customAttributeEditor.valuePlaceholder')}
          />
        </div>
      )}
    </div>
  );
}