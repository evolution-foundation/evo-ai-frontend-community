import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { WaitNodeData } from '../WaitNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitTimeConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitTimeConfig({ data, onChange, journeyId }: WaitTimeConfigProps) {
  const { t } = useLanguage('journey');

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];
  const handleDurationChange = (value: string) => {
    const duration = parseInt(value) || 1;
    onChange({ duration });
  };

  const handleTimeUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ timeUnit: value });
  };

  const getTimeUnitLabel = (unit: string, duration: number) => {
    if (duration === 1) {
      switch (unit) {
        case 'minutes':
          return t('panels.waitComponents.shared.timeUnitsSingular.minute');
        case 'hours':
          return t('panels.waitComponents.shared.timeUnitsSingular.hour');
        case 'days':
          return t('panels.waitComponents.shared.timeUnitsSingular.day');
        default:
          return unit;
      }
    } else {
      switch (unit) {
        case 'minutes':
          return t('panels.waitComponents.shared.timeUnits.minutes');
        case 'hours':
          return t('panels.waitComponents.shared.timeUnits.hours');
        case 'days':
          return t('panels.waitComponents.shared.timeUnits.days');
        default:
          return unit;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Duração */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t('panels.waitComponents.time.durationLabel')}
        </Label>
        <VariableInput
          type="number"
          min="1"
          value={data.duration?.toString() || '1'}
          onChange={e => handleDurationChange(e.target.value)}
          placeholder={t('panels.waitComponents.time.durationPlaceholder')}
          className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
          journeyId={journeyId}
          onVariableInsert={variable => {
            console.log('Variable inserted in wait duration:', variable);
          }}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('panels.waitComponents.time.variableHint')}
        </p>
      </div>

      {/* Unidade de Tempo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t('panels.waitComponents.time.timeUnitLabel')}
        </Label>
        <Select value={data.timeUnit || 'minutes'} onValueChange={handleTimeUnitChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder={t('panels.waitComponents.time.timeUnitPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {TIME_UNIT_OPTIONS.map(option => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-sidebar-foreground"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>{t('panels.waitComponents.time.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.time.summaryText', {
            duration: data.duration || 1,
            timeUnit: getTimeUnitLabel(data.timeUnit || 'minutes', data.duration || 1),
          })}
        </p>
      </div>
    </div>
  );
}
