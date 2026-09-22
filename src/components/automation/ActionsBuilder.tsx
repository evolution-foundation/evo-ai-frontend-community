import { useFieldArray, useWatch, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import { AlertTriangle, Plus } from 'lucide-react';
import {
  type AutomationRuleFormData,
  actionRegistry,
  actionsSkippedWithoutConversation,
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

  const eventName = useWatch({ control, name: 'event_name' });
  const actions = useWatch({ control, name: 'actions' });
  const skippedWithoutConversation = actionsSkippedWithoutConversation(eventName, actions);

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
      {skippedWithoutConversation.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t('form.fields.actions.noConversationNotice', {
              actions: skippedWithoutConversation
                .map((name) => t(actionRegistry[name].i18nKey))
                .join(', '),
            })}
          </p>
        </div>
      )}
    </div>
  );
}
