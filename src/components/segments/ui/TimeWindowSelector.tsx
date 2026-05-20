import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TimeWindowSelectorProps {
  show: boolean;
  onToggleShow: (show: boolean) => void;
  value: number;
  unit: string;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
}

// const convertToSeconds = (value: number, unit: string): number => {
//   switch (unit) {
//     case 'minutes': return value * 60;
//     case 'hours': return value * 3600;
//     case 'days': return value * 86400;
//     case 'weeks': return value * 604800;
//     case 'months': return value * 2592000; // 30 days
//     default: return value * 86400;
//   }
// };

export default function TimeWindowSelector({
  show,
  onToggleShow,
  value,
  unit,
  onValueChange,
  onUnitChange,
}: TimeWindowSelectorProps) {
  const { t } = useLanguage('segments');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('timeWindow.title')}
        </Label>
        <button
          type="button"
          onClick={() => onToggleShow(!show)}
          className={`w-4 h-4 rounded border ${
            show ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
          }`}
        />
      </div>

      {show && (
        <div className="flex gap-2">
          <Input
            type="number"
            value={value}
            onChange={e => {
              const newValue = parseInt(e.target.value);
              onValueChange(newValue);
            }}
            className="w-24"
          />
          <Select
            value={unit}
            onValueChange={onUnitChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">{t('timeWindow.units.minutes')}</SelectItem>
              <SelectItem value="hours">{t('timeWindow.units.hours')}</SelectItem>
              <SelectItem value="days">{t('timeWindow.units.days')}</SelectItem>
              <SelectItem value="weeks">{t('timeWindow.units.weeks')}</SelectItem>
              <SelectItem value="months">{t('timeWindow.units.months')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
