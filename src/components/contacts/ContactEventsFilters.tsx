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
import { getEventLabel, resolveLegacyEventName, type EvoFlowEventName } from '@/lib/events-manifest';
import type { ContactEventsQuery, ContactEventType } from '@/types/contacts';
import { CampaignFilterAutocomplete } from './CampaignFilterAutocomplete';

interface ContactEventsFiltersProps {
  value: ContactEventsQuery;
  onChange: (next: ContactEventsQuery) => void;
  disabled?: boolean;
}

const EVENT_TYPES: ContactEventType[] = ['identify', 'track', 'page', 'screen', 'segment'];

// Curated subset of canonical events surfaced in the Contact History filter
// (the screen's local -> canonical mapping, per EVO-1263). Values are the
// canonical dot-notation names from the events manifest — the SAME format the
// backend stores in ClickHouse `contact_events.event_name` (the CRM emits via
// EvoFlow::PayloadBuilder with EvoFlow::EVENT_NAMES). The previous snake_case
// slugs (`contact_created`, …) never matched the stored dot-notation values,
// so the filter is now sent in canonical form. Labels come from the manifest
// via getEventLabel — there is no per-screen label map.
//
// Non-backend events that used to be offered (conversation_updated,
// pipeline_*) are intentionally dropped: they have no entry in the canonical
// catalog (EvoFlow::EVENT_NAMES), so filtering by them returned nothing.
//
// MAINTENANCE: when the backend adds a new canonical event relevant to the
// contact timeline, append its canonical name here. Labels are sourced from
// the manifest automatically — no `events.names.*` translation needed.
const CONTACT_EVENT_NAMES: EvoFlowEventName[] = [
  'contact.created',
  'contact.updated',
  'contact.label.added',
  'contact.label.removed',
  'contact.custom_attribute.changed',
  'conversation.created',
  'conversation.resolved',
  'conversation.activity',
  'conversation.first_reply',
  'message.created',
];

const ALL_VALUE = '__all__';

function isFilterActive(filters: ContactEventsQuery): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

export function ContactEventsFilters({ value, onChange, disabled }: ContactEventsFiltersProps) {
  const { t, currentLanguage } = useLanguage('contacts');
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
          // Resolve a stray legacy snake_case value (e.g. from a bookmarked URL)
          // to its canonical option so the right item stays highlighted; the
          // dropdown itself only ever writes canonical dot-notation values.
          value={value.event_name ? resolveLegacyEventName(value.event_name).selectorValue || ALL_VALUE : ALL_VALUE}
          onValueChange={(v) => update('event_name', v === ALL_VALUE ? undefined : v)}
          disabled={disabled}
        >
          <SelectTrigger id={eventNameId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('events.filters.allEventNames')}</SelectItem>
            {CONTACT_EVENT_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {getEventLabel(name, currentLanguage)}
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
        <CampaignFilterAutocomplete
          id={campaignId}
          value={value.campaign_id}
          onChange={(next) => update('campaign_id', next)}
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
