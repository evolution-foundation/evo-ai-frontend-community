import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface ConditionTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const getConditionTypes = (t: (key: string) => string) => [
  // Dados do Usuário
  { value: 'UserProperty', label: t('conditionTypes.userProperty'), category: 'userData' },
  { value: 'Label', label: t('conditionTypes.label'), category: 'userData' },
  { value: 'CustomAttribute', label: t('conditionTypes.customAttribute'), category: 'userData' },
  { value: 'Performed', label: t('conditionTypes.performed'), category: 'userData' },
  { value: 'LastPerformed', label: t('conditionTypes.lastPerformed'), category: 'userData' },
  { value: 'RandomBucket', label: t('conditionTypes.randomBucket'), category: 'userData' },

  // Mensagens
  { value: 'Email', label: t('conditionTypes.email'), category: 'messages' },
  { value: 'WhatsApp', label: t('conditionTypes.whatsapp'), category: 'messages' },
  { value: 'Web', label: t('conditionTypes.web'), category: 'messages' },
  { value: 'SMS', label: t('conditionTypes.sms'), category: 'messages' },

  // Manual
  { value: 'Manual', label: t('conditionTypes.manual'), category: 'manual' },
];

const getCategories = (t: (key: string) => string) => [
  { key: 'userData', label: t('categories.userData') },
  { key: 'messages', label: t('categories.messages') },
  { key: 'manual', label: t('categories.manual') },
];

export default function ConditionTypeSelector({
  value,
  onChange,
}: ConditionTypeSelectorProps) {
  const { t } = useLanguage('segments');
  const conditionTypes = getConditionTypes(t);
  const categories = getCategories(t);

  return (
    <div>
      <Label className="text-sm font-medium">
        {t('conditionTypeSelector.groupCondition')}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('conditionTypeSelector.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <div key={category.key}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                {category.label}
              </div>
              {conditionTypes
                .filter((type) => type.category === category.key)
                .map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}