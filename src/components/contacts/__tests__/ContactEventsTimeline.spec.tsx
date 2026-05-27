import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ContactEvent } from '@/types/contacts';
import { ContactEventsTimeline } from '../ContactEventsTimeline';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// Note: @tanstack/react-virtual is globally mocked in src/test/setup.ts to
// render every item (JSDOM measures 0×0, which would otherwise produce an
// empty virtual list).

function event(id: string): ContactEvent {
  return {
    id,
    eventType: 'track',
    eventName: 'message_created',
    occurredAt: '2026-05-01T00:00:00Z',
    properties: {},
  };
}

describe('ContactEventsTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one article per virtual event', () => {
    const events = Array.from({ length: 12 }, (_, i) => event(`e-${i}`));
    render(
      <ContactEventsTimeline events={events} hasMore={false} isLoadingMore={false} softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  it('shows the soft-cap banner when softCapped=true', () => {
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore={false} isLoadingMore={false} softCapped onLoadMore={vi.fn()} />,
    );
    expect(screen.getByText(/events\.timeline\.softCapped/)).toBeInTheDocument();
  });

  it('feed wrapper carries role + aria-busy reflecting isLoadingMore', () => {
    const { rerender } = render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore={false} softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'false');

    rerender(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'true');
  });

  // Prefetch trigger: with the stub returning every event as visible, the
  // last virtual index always equals events.length - 1, which is within the
  // PREFETCH_OFFSET of the end. So onLoadMore should fire once on mount
  // when hasMore && !isLoadingMore.
  it('fires onLoadMore when the last visible index is within prefetch distance', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline
        events={[event('a'), event('b')]}
        hasMore
        isLoadingMore={false}
        softCapped={false}
        onLoadMore={onLoadMore}
      />,
    );
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('no-ops when hasMore=false', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline
        events={[event('a'), event('b')]}
        hasMore={false}
        isLoadingMore={false}
        softCapped={false}
        onLoadMore={onLoadMore}
      />,
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('no-ops when isLoadingMore=true', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline
        events={[event('a'), event('b')]}
        hasMore
        isLoadingMore
        softCapped={false}
        onLoadMore={onLoadMore}
      />,
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('shows the load-more fallback button when hasMore && !isLoadingMore', () => {
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore={false} softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /events\.timeline\.loadMore/ })).toBeInTheDocument();
  });

  it('hides the fallback button and shows the spinner when isLoadingMore=true', () => {
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /events\.timeline\.loadMore/ })).not.toBeInTheDocument();
    expect(screen.getByText(/events\.timeline\.loadingMore/)).toBeInTheDocument();
  });
});
