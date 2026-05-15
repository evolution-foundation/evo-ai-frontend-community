import { Controller, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { ALL_PHASE_1_EVENTS, type AutomationRuleFormData } from '@/pages/Customer/Automation/registries';

interface Props {
  control: Control<AutomationRuleFormData>;
  disabled?: boolean;
}

export default function EventSelector({ control, disabled }: Props) {
  const { t } = useLanguage('automation');

  return (
    <Controller
      control={control}
      name="event_name"
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('form.fields.event.label')}</label>
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
                  {t(`form.fields.event.options.${eventName}`)}
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
