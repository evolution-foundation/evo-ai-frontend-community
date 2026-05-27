import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ContactEvent } from '@/types/contacts';
import { ContactEventsTimeline } from '../ContactEventsTimeline';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

function event(id: string): ContactEvent {
  return {
    id,
    eventType: 'track',
    eventName: 'message_created',
    occurredAt: '2026-05-01T00:00:00Z',
    properties: {},
  };
}

type IOTrigger = (idx: number, entries: Array<{ isIntersecting: boolean }>) => void;
const triggerIO: IOTrigger = (globalThis as unknown as { triggerIO: IOTrigger }).triggerIO;

function resetObservers() {
  (globalThis as unknown as { __intersectionObservers?: unknown[] }).__intersectionObservers = [];
}

describe('ContactEventsTimeline', () => {
  beforeEach(() => {
    resetObservers();
  });

  it('renders one article per event (no virtualization)', () => {
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
    const feed = screen.getByRole('feed');
    expect(feed).toHaveAttribute('aria-busy', 'false');

    rerender(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'true');
  });

  it('fires onLoadMore once when sentinel intersects (hasMore && !isLoadingMore)', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore={false} softCapped={false} onLoadMore={onLoadMore} />,
    );
    act(() => {
      triggerIO(0, [{ isIntersecting: true }]);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('no-ops when sentinel intersects but hasMore=false', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline
        events={[event('a')]}
        hasMore={false}
        isLoadingMore={false}
        softCapped={false}
        onLoadMore={onLoadMore}
      />,
    );
    act(() => {
      triggerIO(0, [{ isIntersecting: true }]);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('no-ops when sentinel intersects while isLoadingMore=true', () => {
    const onLoadMore = vi.fn();
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore softCapped={false} onLoadMore={onLoadMore} />,
    );
    act(() => {
      triggerIO(0, [{ isIntersecting: true }]);
      triggerIO(0, [{ isIntersecting: true }]);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('shows the load-more fallback button when hasMore && !isLoadingMore', () => {
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore={false} softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /events\.timeline\.loadMore/ })).toBeInTheDocument();
  });

  it('hides the fallback button when isLoadingMore=true', () => {
    render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore softCapped={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /events\.timeline\.loadMore/ })).not.toBeInTheDocument();
    expect(screen.getByText(/events\.timeline\.loadingMore/)).toBeInTheDocument();
  });

  it('disconnects its IntersectionObserver on unmount (AC: T13 case 7)', () => {
    const { unmount } = render(
      <ContactEventsTimeline events={[event('a')]} hasMore isLoadingMore={false} softCapped={false} onLoadMore={vi.fn()} />,
    );
    const observers = (globalThis as unknown as {
      __intersectionObservers?: Array<{ disconnect: () => void }>;
    }).__intersectionObservers;
    expect(observers && observers.length).toBeGreaterThan(0);
    const observer = observers![observers!.length - 1];
    const disconnectSpy = vi.spyOn(observer, 'disconnect');
    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
