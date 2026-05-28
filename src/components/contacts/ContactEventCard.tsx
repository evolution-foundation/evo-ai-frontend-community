import { memo, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent } from '@evoapi/design-system';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Eye,
  Fingerprint,
  Layers,
  MousePointerClick,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useRelativeTime } from '@/lib/useRelativeTime';
import { formatRelativeTime } from '@/lib/relativeTime';
import { redactReplacer } from '@/lib/redactKeys';
import { slugifyEventName } from '@/lib/slugifyEventName';
import type { ContactEvent, ContactEventType } from '@/types/contacts';

interface ContactEventCardProps {
  event: ContactEvent;
}

const ICON_BY_TYPE: Record<ContactEventType, React.ComponentType<{ className?: string }>> = {
  identify: Fingerprint,
  track: MousePointerClick,
  page: Eye,
  screen: Smartphone,
  segment: Layers,
};

function ContactEventCardImpl({ event }: ContactEventCardProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const [expanded, setExpanded] = useState(false);

  // useRelativeTime checks `date` by reference and snaps `now` during render
  // when it changes — passing a fresh Date each render would loop forever.
  const occurredDate = useMemo(() => {
    const d = new Date(event.occurredAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [event.occurredAt]);
  const now = useRelativeTime(occurredDate);
  const relativeLabel = occurredDate
    ? formatRelativeTime(occurredDate, now, {
        locale: currentLanguage,
        justNowLabel: t('events.card.justNow'),
      })
    : event.occurredAt;

  const Icon = ICON_BY_TYPE[event.eventType] ?? Activity;
  const title = t(`events.names.${slugifyEventName(event.eventName)}`, {
    defaultValue: event.eventName,
  });
  const propertiesId = `event-card-${event.id}-props`;

  const enriched = event.enriched;

  return (
    <Card className="border border-border bg-card transition-colors hover:bg-accent/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h4 className="text-sm font-medium leading-tight">{title}</h4>
              <time
                className="text-xs text-muted-foreground"
                dateTime={event.occurredAt}
                title={event.occurredAt}
              >
                {relativeLabel}
              </time>
            </div>

            {enriched && (enriched.campaign_name || enriched.channel_label || enriched.agent_name) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {enriched.channel_label && (
                  <Badge variant="secondary">
                    {t('events.card.enriched.channel', { label: enriched.channel_label })}
                  </Badge>
                )}
                {enriched.campaign_name && (
                  <Badge variant="secondary">
                    {t('events.card.enriched.campaign', { name: enriched.campaign_name })}
                  </Badge>
                )}
                {enriched.agent_name && (
                  <Badge variant="secondary">
                    {t('events.card.enriched.agent', { name: enriched.agent_name })}
                  </Badge>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 gap-1 px-2 text-xs"
              aria-expanded={expanded}
              aria-controls={propertiesId}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? t('events.card.collapse') : t('events.card.expand')}
            </Button>

            {expanded && (
              <pre
                id={propertiesId}
                className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs"
              >
                {JSON.stringify(event.properties, redactReplacer, 2)}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ContactEventCard = memo(ContactEventCardImpl);
ContactEventCard.displayName = 'ContactEventCard';

export default ContactEventCard;
