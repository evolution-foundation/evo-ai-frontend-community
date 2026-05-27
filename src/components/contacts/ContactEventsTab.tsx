import { Button } from '@evoapi/design-system';
import { AlertCircle, AlertTriangle, Inbox } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactEvents } from '@/hooks/useContactEvents';
import { ContactEventsFilters } from './ContactEventsFilters';
import { ContactEventsTimeline } from './ContactEventsTimeline';
import type { ContactEventsQuery } from '@/types/contacts';

interface ContactEventsTabProps {
  contactId: string;
}

function errorMessageKey(errorCode: number | null): string {
  switch (errorCode) {
    case 403:
      return 'events.timeline.error.forbidden';
    case 422:
      return 'events.timeline.error.invalidFilters';
    case 429:
      return 'events.timeline.error.rateLimit';
    default:
      return 'events.timeline.error.generic';
  }
}

function hasActiveFilters(filters: ContactEventsQuery): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

export function ContactEventsTab({ contactId }: ContactEventsTabProps) {
  const { t } = useLanguage('contacts');
  const {
    events,
    isLoading,
    isLoadingMore,
    error,
    errorCode,
    degraded,
    hasMore,
    softCapped,
    filters,
    setFilters,
    loadMore,
    refetch,
  } = useContactEvents(contactId);

  const showInitialSkeleton = isLoading && events.length === 0;
  // 401 is handled silently (interceptor refreshes the token); only surface
  // an error banner for other HTTP failure codes.
  const showErrorBanner = error !== null && errorCode !== 401;
  const showEmpty = !isLoading && !error && !degraded && events.length === 0;

  return (
    <div className="flex flex-col gap-3" data-testid="contact-events-tab">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t('events.timeline.title')}</h3>
        {events.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('events.timeline.showing', { count: events.length })}
          </span>
        )}
      </div>

      <ContactEventsFilters
        value={filters}
        onChange={(next) => {
          void setFilters(next);
        }}
        disabled={isLoading}
      />

      {degraded && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{t('events.timeline.degraded.banner')}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('events.timeline.degraded.retry')}
          </Button>
        </div>
      )}

      {showErrorBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{t(errorMessageKey(errorCode))}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('events.timeline.error.retry')}
          </Button>
        </div>
      )}

      {showInitialSkeleton && (
        <div
          role="status"
          className="flex h-[200px] items-center justify-center text-sm text-muted-foreground"
        >
          {t('events.timeline.loading')}
        </div>
      )}

      {showEmpty && (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center"
        >
          <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters(filters)
              ? t('events.timeline.empty.withFilters')
              : t('events.timeline.empty.default')}
          </p>
          {hasActiveFilters(filters) && (
            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
              {t('events.filters.clear')}
            </Button>
          )}
        </div>
      )}

      {!showInitialSkeleton && !showEmpty && events.length > 0 && (
        <ContactEventsTimeline
          events={events}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          softCapped={softCapped}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}

export default ContactEventsTab;
