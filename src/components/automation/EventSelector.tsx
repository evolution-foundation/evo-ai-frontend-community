import { Controller, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { getEventLabel, resolveLegacyEventName } from '@/lib/events-manifest';
import { ALL_PHASE_1_EVENTS, type AutomationRuleFormData } from '@/pages/Customer/Automation/registries';

interface Props {
  control: Control<AutomationRuleFormData>;
  disabled?: boolean;
}

export default function EventSelector({ control, disabled }: Props) {
  const { t, currentLanguage } = useLanguage('automation');

  // Automation triggers are owned by the CRM automation engine, NOT evo-flow
  // (EVO-1263 Open Risk). The snake_case enum stays the authoritative option
  // list + Zod schema; the manifest is consumed only for DISPLAY labels of
  // events that have a canonical evo-flow equivalent. Automation-only triggers
  // (conversation_opened, pipeline_stage_updated, conversation_updated) have no
  // canonical match and keep their existing i18n label.
  const eventLabel = (eventName: string): string => {
    const { selectorValue, customName } = resolveLegacyEventName(eventName);
    if (!customName && selectorValue && selectorValue !== 'custom') {
      return getEventLabel(selectorValue, currentLanguage);
    }
    return t(`form.fields.event.options.${eventName}`);
  };

  return (
    <Controller
      control={control}
      name="event_name"
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.fields.event.label')} *</label>
          <Select
            value={field.value ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('form.fields.event.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {ALL_PHASE_1_EVENTS.map((eventName) => (
                <SelectItem key={eventName} value={eventName}>
                  {eventLabel(eventName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && (
            <p className="text-sm text-red-500">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
