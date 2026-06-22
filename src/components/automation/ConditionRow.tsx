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
  getOperatorsForAttributeInEvent,
} from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';

interface Props {
  control: Control<AutomationRuleFormData>;
  index: number;
  formData: AutomationFormData;
  onRemove: () => void;
}

// customAttributes is a value-editor data source (actions side), never a
// condition option-loader target — exclude it so formData[optionsKey] stays a
// union of {id,name} option lists.
const optionLoaderToData: Record<string, Exclude<keyof AutomationFormData, 'customAttributes'>> = {
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
  const isAttributeChanged = operator === 'attribute_changed';

  // Reset values when the values-shape requirement changes:
  // - valueless operators must hold an empty array
  // - attribute_changed must hold { from: [], to: [] }
  // - other operators must hold an array
  useEffect(() => {
    if (!formCtx) return;
    if (valueless) {
      if (!Array.isArray(currentValues) || currentValues.length > 0) {
        formCtx.setValue(`conditions.${index}.values`, [], { shouldDirty: true });
      }
      return;
    }
    if (isAttributeChanged) {
      const isFromToShape =
        currentValues != null &&
        typeof currentValues === 'object' &&
        !Array.isArray(currentValues) &&
        'from' in (currentValues as object) &&
        'to' in (currentValues as object);
      if (!isFromToShape) {
        formCtx.setValue(`conditions.${index}.values`, { from: [], to: [] }, { shouldDirty: true });
      }
      return;
    }
    if (!Array.isArray(currentValues)) {
      formCtx.setValue(`conditions.${index}.values`, [], { shouldDirty: true });
    }
  }, [valueless, isAttributeChanged, currentValues, index, formCtx]);

  const availableAttributes = eventName
    ? getAttributesForEvent(eventName)
    : Object.values(conditionAttributeRegistry);

  const descriptor = getAttributeDescriptor(attributeKey);

  const availableOperators = attributeKey
    ? getOperatorsForAttributeInEvent(attributeKey, eventName)
    : (descriptor?.operators ?? []);

  // When the event_name (or attribute) changes and the current operator is no
  // longer in the allowed list, clear it. Without this, a user that switches
  // from `conversation_updated` to `conversation_created` after picking
  // `attribute_changed` would save a rule whose operator can never match.
  useEffect(() => {
    if (!formCtx) return;
    if (!operator) return;
    if (availableOperators.includes(operator as (typeof availableOperators)[number])) return;
    formCtx.setValue(`conditions.${index}.filter_operator`, '', { shouldDirty: true });
    formCtx.setValue(`conditions.${index}.values`, [], { shouldDirty: true });
  }, [availableOperators, operator, index, formCtx]);

  const optionsKey = descriptor?.optionLoaderKey
    ? optionLoaderToData[descriptor.optionLoaderKey]
    : undefined;
  const options = optionsKey ? formData[optionsKey] : [];

  const renderSingleValuePicker = (
    currentValue: unknown,
    onChange: (next: (string | number)[]) => void,
    placeholderKey: string,
  ) => {
    if (descriptor?.dataType === 'boolean') {
      return (
        <Select
          value={currentValue != null ? String(currentValue) : ''}
          onValueChange={(v) => onChange([v])}
        >
          <SelectTrigger>
            <SelectValue placeholder={t(placeholderKey)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t('form.fields.boolean.true')}</SelectItem>
            <SelectItem value="false">{t('form.fields.boolean.false')}</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (options.length === 0) {
      return (
        <Input
          type={descriptor?.dataType === 'number' ? 'number' : 'text'}
          value={currentValue != null ? String(currentValue) : ''}
          onChange={(e) => onChange([e.target.value])}
          placeholder={t(placeholderKey)}
        />
      );
    }
    return (
      <Select
        value={currentValue != null ? String(currentValue) : ''}
        onValueChange={(v) => onChange([v])}
      >
        <SelectTrigger>
          <SelectValue placeholder={t(placeholderKey)} />
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
  };

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
                {availableOperators.map((op) => {
                  const specificKey = `form.fields.operators.${attributeKey}.${op}`;
                  const genericKey = `form.fields.operators.${op}`;
                  const specific = t(specificKey);
                  const label = specific === specificKey ? t(genericKey) : specific;
                  return (
                    <SelectItem key={op} value={op}>
                      {label}
                    </SelectItem>
                  );
                })}
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
            if (isAttributeChanged) {
              const fromTo =
                field.value && typeof field.value === 'object' && !Array.isArray(field.value)
                  ? (field.value as { from?: (string | number)[]; to?: (string | number)[] })
                  : { from: [], to: [] };
              return (
                <div className="grid grid-cols-2 gap-2 col-span-1">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {t('form.fields.conditionRow.from')}
                    </label>
                    {renderSingleValuePicker(
                      fromTo.from?.[0],
                      (next) => field.onChange({ from: next, to: fromTo.to ?? [] }),
                      'form.fields.conditionRow.from',
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {t('form.fields.conditionRow.to')}
                    </label>
                    {renderSingleValuePicker(
                      fromTo.to?.[0],
                      (next) => field.onChange({ from: fromTo.from ?? [], to: next }),
                      'form.fields.conditionRow.to',
                    )}
                  </div>
                </div>
              );
            }
            return renderSingleValuePicker(
              Array.isArray(field.value) ? field.value[0] : undefined,
              (next) => field.onChange(next),
              'form.fields.conditionRow.value',
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
