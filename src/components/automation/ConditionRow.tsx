import { useEffect } from 'react';
import { Controller, type Control, useWatch, useFormContext } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
} from '@evoapi/design-system';
import { Trash2 } from 'lucide-react';
import {
  type AutomationRuleFormData,
  conditionAttributeRegistry,
  getAttributeDescriptor,
  getAttributesForEvent,
} from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';

interface Props {
  control: Control<AutomationRuleFormData>;
  index: number;
  formData: AutomationFormData;
  onRemove: () => void;
}

const optionLoaderToData: Record<string, keyof AutomationFormData> = {
  pipelines: 'pipelines',
  pipeline_stages: 'pipelineStages',
  agents: 'agents',
  teams: 'teams',
  inboxes: 'inboxes',
  labels: 'labels',
  priorities: 'priorities',
  statuses: 'statuses',
  message_types: 'messageTypes',
};

export default function ConditionRow({ control, index, formData, onRemove }: Props) {
  const { t } = useLanguage('automation');
  const formCtx = useFormContext<AutomationRuleFormData>();

  const eventName = useWatch({ control, name: 'event_name' });
  const attributeKey = useWatch({ control, name: `conditions.${index}.attribute_key` });
  const operator = useWatch({ control, name: `conditions.${index}.filter_operator` });
  const currentValues = useWatch({ control, name: `conditions.${index}.values` });
  const valueless = operator === 'is_present' || operator === 'is_not_present';

  // Clear values when the operator goes valueless (avoids stale values being sent to the backend).
  useEffect(() => {
    if (valueless && Array.isArray(currentValues) && currentValues.length > 0) {
      formCtx?.setValue(`conditions.${index}.values`, [], { shouldDirty: true });
    }
  }, [valueless, currentValues, index, formCtx]);

  const availableAttributes = eventName
    ? getAttributesForEvent(eventName)
    : Object.values(conditionAttributeRegistry);

  const descriptor = getAttributeDescriptor(attributeKey);

  const optionsKey = descriptor?.optionLoaderKey
    ? optionLoaderToData[descriptor.optionLoaderKey]
    : undefined;
  const options = optionsKey ? formData[optionsKey] : [];

  return (
    <div className="flex items-start gap-2 p-3 border rounded-md">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <Controller
          control={control}
          name={`conditions.${index}.attribute_key`}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('form.fields.conditionRow.attribute')} />
              </SelectTrigger>
              <SelectContent>
                {availableAttributes.map((attr) => (
                  <SelectItem key={attr.attributeKey} value={attr.attributeKey}>
                    {t(attr.i18nKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        <Controller
          control={control}
          name={`conditions.${index}.filter_operator`}
          render={({ field }) => (
            <Select
              value={field.value ?? ''}
              onValueChange={field.onChange}
              disabled={!descriptor}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.fields.conditionRow.operator')} />
              </SelectTrigger>
              <SelectContent>
                {descriptor?.operators.map((op) => (
                  <SelectItem key={op} value={op}>
                    {t(`form.fields.operators.${op}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        <Controller
          control={control}
          name={`conditions.${index}.values`}
          render={({ field }) => {
            if (valueless) {
              return (
                <div className="flex items-center text-xs text-muted-foreground italic">
                  {t('form.fields.conditionRow.noValueNeeded')}
                </div>
              );
            }
            if (!descriptor || options.length === 0) {
              return (
                <Input
                  type={descriptor?.dataType === 'number' ? 'number' : 'text'}
                  value={Array.isArray(field.value) ? String(field.value[0] ?? '') : ''}
                  onChange={(e) => field.onChange([e.target.value])}
                  placeholder={t('form.fields.conditionRow.value')}
                />
              );
            }
            return (
              <Select
                value={Array.isArray(field.value) ? String(field.value[0] ?? '') : ''}
                onValueChange={(v) => field.onChange([v])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.fields.conditionRow.value')} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={String(opt.id)} value={String(opt.id)}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={t('form.fields.conditionRow.remove')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
