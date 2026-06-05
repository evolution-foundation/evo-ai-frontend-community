import { useFieldArray, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import { Plus } from 'lucide-react';
import type { AutomationRuleFormData } from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';
import ConditionRow from './ConditionRow';

interface Props {
  control: Control<AutomationRuleFormData>;
  formData: AutomationFormData;
}

export default function ConditionsBuilder({ control, formData }: Props) {
  const { t } = useLanguage('automation');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'conditions',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {t('form.fields.conditions.label')}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            ({t('form.fields.conditions.optional')})
          </span>
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('form.fields.conditions.addRow')}
          onClick={() =>
            append({
              attribute_key: '',
              filter_operator: 'equal_to',
              query_operator: 'AND',
              values: [],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('form.fields.conditions.addRow')}
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('form.fields.conditions.empty')}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <ConditionRow
              key={field.id}
              control={control}
              index={index}
              formData={formData}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
