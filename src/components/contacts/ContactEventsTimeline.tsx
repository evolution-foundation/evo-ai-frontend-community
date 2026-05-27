import { useEffect, useRef } from 'react';
import { Button } from '@evoapi/design-system';
import { Loader2 } from 'lucide-react';
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

export function ContactEventsTimeline({
  events,
  hasMore,
  isLoadingMore,
  softCapped,
  onLoadMore,
}: ContactEventsTimelineProps) {
  const { t } = useLanguage('contacts');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Latest callback in a ref so the IO effect doesn't re-bind on every render.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        // Guard against double-fire: IO can re-trigger while a fetch is in
        // flight, especially when the sentinel stays inside the viewport
        // after a small batch is appended. The store also no-ops in this
        // case but stopping it here saves a render.
        if (isLoadingMoreRef.current || !hasMoreRef.current) return;
        onLoadMoreRef.current();
      },
      { rootMargin: '0px 0px 200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
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

      <div className="flex flex-col gap-2 p-3">
        {events.map((event) => (
          <div key={event.id} role="article">
            <ContactEventCard event={event} />
          </div>
        ))}

        {hasMore && !isLoadingMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
              {t('events.timeline.loadMore')}
            </Button>
          </div>
        )}

        {isLoadingMore && (
          <div role="status" className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('events.timeline.loadingMore')}
          </div>
        )}

        <div ref={sentinelRef} aria-hidden="true" data-testid="load-more-sentinel" className="h-1" />
      </div>
    </div>
  );
}

export default ContactEventsTimeline;
