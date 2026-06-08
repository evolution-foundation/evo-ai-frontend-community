import { useFieldArray, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import { Plus } from 'lucide-react';
import {
  type AutomationRuleFormData,
  getDefaultActionForName,
} from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';
import type { AutomationActionType } from '@/types/automation';
import ActionRow from './ActionRow';

interface Props {
  control: Control<AutomationRuleFormData>;
  formData: AutomationFormData;
}

export default function ActionsBuilder({ control, formData }: Props) {
  const { t } = useLanguage('automation');
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'actions',
  });

  const handleActionChange = (index: number, actionName: AutomationActionType) => {
    update(index, getDefaultActionForName(actionName));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t('form.fields.actions.label')} *</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('form.fields.actions.addRow')}
          onClick={() => append(getDefaultActionForName('send_message'))}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('form.fields.actions.addRow')}
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-red-500">{t('form.fields.actions.empty')}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <ActionRow
              key={field.id}
              control={control}
              index={index}
              formData={formData}
              onRemove={() => remove(index)}
              onActionChange={handleActionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
