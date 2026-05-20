import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from '@evoapi/design-system';
import { UserPropertyNode } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface UserPropertyEditorProps {
  condition: UserPropertyNode;
  operatorType: string;
  operatorValue: string;
  onOperatorTypeChange: (type: string) => void;
  onOperatorValueChange: (value: string) => void;
  onUpdate: (condition: UserPropertyNode) => void;
}

const getUserProperties = (t: (key: string) => string) => [
  { value: 'contact.name', label: t('userPropertyEditor.properties.name') },
  { value: 'contact.email', label: t('userPropertyEditor.properties.email') },
  { value: 'contact.phone_number', label: t('userPropertyEditor.properties.phone') },
  { value: 'contact.inbox', label: t('userPropertyEditor.properties.inbox') },
  { value: 'contact.last_name', label: t('userPropertyEditor.properties.lastName') },
  { value: 'contact.location', label: t('userPropertyEditor.properties.location') },
  { value: 'contact.country_code', label: t('userPropertyEditor.properties.countryCode') },
  { value: 'contact.identifier', label: t('userPropertyEditor.properties.identifier') },
  { value: 'contact.contact_type', label: t('userPropertyEditor.properties.contactType') },
  { value: 'contact.blocked', label: t('userPropertyEditor.properties.blocked') },
  { value: 'contact.last_activity_at', label: t('userPropertyEditor.properties.lastActivity') },
  { value: 'contact.created_at', label: t('userPropertyEditor.properties.created') },
  { value: 'contact.updated_at', label: t('userPropertyEditor.properties.updated') },
];

const getOperators = (t: (key: string) => string) => [
  { value: 'Equals', label: t('operators.equals') },
  { value: 'NotEquals', label: t('operators.notEquals') },
  { value: 'Contains', label: t('operators.contains') },
  { value: 'NotContains', label: t('operators.notContains') },
  { value: 'Exists', label: t('operators.exists') },
  { value: 'NotExists', label: t('operators.notExists') },
];

export default function UserPropertyEditor({
  condition,
  operatorType,
  operatorValue,
  onOperatorTypeChange,
  onOperatorValueChange,
  onUpdate,
}: UserPropertyEditorProps) {
  const { t } = useLanguage('segments');
  const userProperties = getUserProperties(t);
  const operators = getOperators(t);
  const handlePropertyPathChange = (newPath: string) => {
    const updatedCondition = {
      ...condition,
      path: newPath,
    };
    onUpdate(updatedCondition);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('userPropertyEditor.propertyPath')}</Label>
        <Select
          value={condition.path || ''}
          onValueChange={handlePropertyPathChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('userPropertyEditor.selectProperty')} />
          </SelectTrigger>
          <SelectContent>
            <div className="font-medium p-2 text-sm text-gray-500 border-b">
              {t('userPropertyEditor.categories.basicInfo')}
            </div>
            {userProperties.slice(0, 6).map((prop) => (
              <SelectItem key={prop.value} value={prop.value}>
                {prop.label}
              </SelectItem>
            ))}
            
            <div className="font-medium p-2 text-sm text-gray-500 border-b">
              {t('userPropertyEditor.categories.metadata')}
            </div>
            {userProperties.slice(6).map((prop) => (
              <SelectItem key={prop.value} value={prop.value}>
                {prop.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t('userPropertyEditor.operator')}</Label>
        <Select value={operatorType} onValueChange={onOperatorTypeChange}>
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

      {operatorType !== 'Exists' && operatorType !== 'NotExists' && (
        <div>
          <Label>{t('userPropertyEditor.value')}</Label>
          <Input
            value={operatorValue}
            onChange={(e) => onOperatorValueChange(e.target.value)}
            placeholder={t('userPropertyEditor.valuePlaceholder')}
          />
        </div>
      )}
    </div>
  );
}