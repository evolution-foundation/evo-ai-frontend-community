import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { X } from 'lucide-react';
import { useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { CONTACT_EVENT_CHANNEL_OPTIONS } from '@/constants/contactEventsChannels';
import type { ContactEventsQuery, ContactEventType } from '@/types/contacts';

interface ContactEventsFiltersProps {
  value: ContactEventsQuery;
  onChange: (next: ContactEventsQuery) => void;
  disabled?: boolean;
}

const EVENT_TYPES: ContactEventType[] = ['identify', 'track', 'page', 'screen', 'segment'];

// Canonical event_name slugs surfaced in the dropdown. Mirror the backend
// list in EVENT_NAMES (lib/events/evo_flow_event_names.rb). Unmapped events
// still render in the timeline via defaultValue, but the filter dropdown
// stays bounded to a curated list — text-typing free-form event names is
// out of scope per the spec.
//
// MAINTENANCE: when the backend adds a new event_name, append the slug here
// AND add the matching translation under `events.names.*` in every locale
// (contacts-parity.spec.ts will fail until all six are present).
const EVENT_NAME_SLUGS = [
  'contact_created',
  'contact_updated',
  'contact_label_added',
  'contact_label_removed',
  'contact_custom_attribute_changed',
  'conversation_created',
  'conversation_updated',
  'conversation_resolved',
  'conversation_activity',
  'conversation_first_reply',
  'message_created',
  'pipeline_conversation_created',
  'pipeline_conversation_updated',
  'pipeline_stage_changed',
] as const;

const ALL_VALUE = '__all__';

function isFilterActive(filters: ContactEventsQuery): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

export function ContactEventsFilters({ value, onChange, disabled }: ContactEventsFiltersProps) {
  const { t } = useLanguage('contacts');
  const baseId = useId();

  const update = <K extends keyof ContactEventsQuery>(key: K, next: ContactEventsQuery[K]) => {
    const merged: ContactEventsQuery = { ...value };
    if (next === undefined || next === '') {
      delete merged[key];
    } else {
      merged[key] = next;
    }
    onChange(merged);
  };

  const eventTypeId = `${baseId}-event-type`;
  const eventNameId = `${baseId}-event-name`;
  const channelId = `${baseId}-channel`;
  const campaignId = `${baseId}-campaign`;
  const afterId = `${baseId}-after`;
  const beforeId = `${baseId}-before`;

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
        <Label htmlFor={eventNameId}>{t('events.filters.eventName')}</Label>
        <Select
          value={value.event_name ?? ALL_VALUE}
          onValueChange={(v) => update('event_name', v === ALL_VALUE ? undefined : v)}
          disabled={disabled}
        >
          <SelectTrigger id={eventNameId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('events.filters.allEventNames')}</SelectItem>
            {EVENT_NAME_SLUGS.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {t(`events.names.${slug}`, { defaultValue: slug })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[200px] flex-col gap-1">
        <Label htmlFor={channelId}>{t('events.filters.channel')}</Label>
        <Select
          value={value.channel ?? ALL_VALUE}
          onValueChange={(v) => update('channel', v === ALL_VALUE ? undefined : v)}
          disabled={disabled}
        >
          <SelectTrigger id={channelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('events.channels.all')}</SelectItem>
            {CONTACT_EVENT_CHANNEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.i18nKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[200px] flex-col gap-1">
        <Label htmlFor={campaignId}>{t('events.filters.campaign')}</Label>
        <Input
          id={campaignId}
          type="text"
          placeholder={t('events.filters.campaignPlaceholder')}
          value={value.campaign_id ?? ''}
          onChange={(e) => update('campaign_id', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="flex min-w-[150px] flex-col gap-1">
        <Label htmlFor={afterId}>{t('events.filters.occurredAfter')}</Label>
        <Input
          id={afterId}
          type="date"
          value={value.occurred_after ?? ''}
          onChange={(e) => update('occurred_after', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="flex min-w-[150px] flex-col gap-1">
        <Label htmlFor={beforeId}>{t('events.filters.occurredBefore')}</Label>
        <Input
          id={beforeId}
          type="date"
          value={value.occurred_before ?? ''}
          onChange={(e) => update('occurred_before', e.target.value)}
          disabled={disabled}
        />
      </div>

      {isFilterActive(value) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
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
