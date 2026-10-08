import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { startOfDay } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import type { ContactEventsQuery, ContactEventType } from '@/types/contacts';

interface ContactEventsFiltersProps {
  value: ContactEventsQuery;
  onChange: (next: ContactEventsQuery) => void;
  disabled?: boolean;
}

const EVENT_TYPES: ContactEventType[] = ['identify', 'track', 'page', 'screen', 'segment'];

const ALL_VALUE = '__all__';

// Period presets computed client-side into `occurred_after` (start of the local
// day, as an ISO instant: a bare YYYY-MM-DD is read as UTC midnight). This
// replaces the old free-form "De/Até" date inputs + channel/campaign filters —
// the panel now only exposes Tipo + Período (channel/campaign stay supported
// by the ContactEventsQuery type/backend, just not surfaced in this filter UI).
type PeriodPreset = 'today' | '7d' | '30d' | 'all';

function presetToOccurredAfter(preset: PeriodPreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === 'today' ? 0 : preset === '7d' ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return startOfDay(date).toISOString();
}

function isFilterActive(filters: ContactEventsQuery): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

export function ContactEventsFilters({ value, onChange, disabled }: ContactEventsFiltersProps) {
  const { t } = useLanguage('contacts');
  const baseId = useId();
  // Tracked locally because `occurred_after` alone can't distinguish which
  // preset produced it (today/7d/30d all just set a date). Reset to "all"
  // whenever an external clear removes occurred_after (e.g. "Limpar filtros").
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    value.occurred_after ? '30d' : 'all',
  );

  const update = <K extends keyof ContactEventsQuery>(key: K, next: ContactEventsQuery[K]) => {
    const merged: ContactEventsQuery = { ...value };
    if (next === undefined || next === '') {
      delete merged[key];
    } else {
      merged[key] = next;
    }
    onChange(merged);
  };

  const handleClear = () => {
    setPeriodPreset('all');
    onChange({});
  };

  const eventTypeId = `${baseId}-event-type`;
  const periodId = `${baseId}-period`;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex min-w-[140px] flex-col gap-1">
        <Label htmlFor={eventTypeId}>{t('events.filters.eventType')}</Label>
        <Select
          value={value.event_type ?? ALL_VALUE}
          onValueChange={(v) =>
            update('event_type', v === ALL_VALUE ? undefined : (v as ContactEventType))
          }
          disabled={disabled}
        >
          <SelectTrigger id={eventTypeId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('events.types.all')}</SelectItem>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`events.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[180px] flex-col gap-1">
        <Label htmlFor={periodId}>{t('events.filters.period')}</Label>
        <Select
          value={periodPreset}
          onValueChange={(v) => {
            const preset = v as PeriodPreset;
            setPeriodPreset(preset);
            update('occurred_after', presetToOccurredAfter(preset));
          }}
          disabled={disabled}
        >
          <SelectTrigger id={periodId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('events.filters.periodPresets.today')}</SelectItem>
            <SelectItem value="7d">{t('events.filters.periodPresets.7d')}</SelectItem>
            <SelectItem value="30d">{t('events.filters.periodPresets.30d')}</SelectItem>
            <SelectItem value="all">{t('events.filters.periodPresets.all')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isFilterActive(value) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" />
          {t('events.filters.clear')}
        </Button>
      )}
    </div>
  );
}

export default ContactEventsFilters;
