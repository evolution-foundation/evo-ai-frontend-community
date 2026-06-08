import { useEffect, useRef } from 'react';
import { Button } from '@evoapi/design-system';
import { Loader2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLanguage } from '@/hooks/useLanguage';
import { ContactEventCard } from './ContactEventCard';
import type { ContactEvent } from '@/types/contacts';

interface ContactEventsTimelineProps {
  events: ContactEvent[];
  hasMore: boolean;
  isLoadingMore: boolean;
  softCapped: boolean;
  onLoadMore: () => void;
}

// Trigger fetch a few rows before the end so the request is already in flight
// by the time the user scrolls to the bottom.
const PREFETCH_OFFSET = 5;

export function ContactEventsTimeline({
  events,
  hasMore,
  isLoadingMore,
  softCapped,
  onLoadMore,
}: ContactEventsTimelineProps) {
  const { t } = useLanguage('contacts');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Latest callback in a ref so the virtualizer subscription doesn't re-bind
  // every render.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollRef.current,
    // Cards typically render around ~96px (icon row + meta + 1-2 lines of
    // properties). measureElement refines this per-row after first paint, so
    // the estimate just needs to be in the right ballpark.
    estimateSize: () => 96,
    overscan: 8,
    getItemKey: (index) => events[index]?.id ?? index,
  });

  // Prefetch trigger: whenever the visible window reaches within
  // PREFETCH_OFFSET of the last loaded event, ask for the next page. This
  // replaces the previous IntersectionObserver sentinel, which couldn't live
  // inside the virtualized list without participating in layout.
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;
    const lastVisibleIndex = items[items.length - 1].index;
    if (
      hasMoreRef.current &&
      !isLoadingMoreRef.current &&
      lastVisibleIndex >= events.length - 1 - PREFETCH_OFFSET
    ) {
      onLoadMoreRef.current();
    }
  }, [virtualizer, events.length, hasMore, isLoadingMore]);

  return (
    <div
      ref={scrollRef}
      role="feed"
      aria-busy={isLoadingMore}
      aria-label={t('events.timeline.ariaLabel')}
      className="min-h-[400px] max-h-[60vh] overflow-y-auto rounded-lg border border-border"
      data-testid="contact-events-timeline"
    >
      {softCapped && (
        <div
          role="status"
          className="sticky top-0 z-10 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {t('events.timeline.softCapped', { cap: 2000 })}
        </div>
      )}

      <div
        className="relative p-3"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const event = events[item.index];
          if (!event) return null;
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              role="article"
              className="absolute left-0 right-0 px-3 pb-2"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <ContactEventCard event={event} />
            </div>
          );
        })}
      </div>

      {hasMore && !isLoadingMore && (
        <div className="flex justify-center px-3 pb-3 pt-1">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
            {t('events.timeline.loadMore')}
          </Button>
        </div>
      )}

      {isLoadingMore && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 px-3 pb-3 pt-1 text-xs text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('events.timeline.loadingMore')}
        </div>
      )}
    </div>
  );
}

export default ContactEventsTimeline;
