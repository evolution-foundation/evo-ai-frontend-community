import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContactEvent, ContactEventsQuery } from '@/types/contacts';
import type { UseContactEventsReturn } from '@/hooks/useContactEvents';

const hookState: { current: UseContactEventsReturn } = {
  current: {} as UseContactEventsReturn,
};

vi.mock('@/hooks/useContactEvents', () => ({
  useContactEvents: () => hookState.current,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}|${opts.count}`;
      return key;
    },
    currentLanguage: 'en',
  }),
}));

import { ContactEventsTab } from '../ContactEventsTab';

function makeEvent(id: string): ContactEvent {
  return { id, eventType: 'track', eventName: 'message_created', occurredAt: '2026-05-01T00:00:00Z', properties: {} };
}

function defaultHook(overrides: Partial<UseContactEventsReturn> = {}): UseContactEventsReturn {
  return {
    events: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    errorCode: null,
    degraded: false,
    hasMore: false,
    softCapped: false,
    filters: {} as ContactEventsQuery,
    setFilters: vi.fn(),
    loadMore: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('ContactEventsTab', () => {
  beforeEach(() => {
    hookState.current = defaultHook();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading message when isLoading and events are empty', () => {
    hookState.current = defaultHook({ isLoading: true });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByText('events.timeline.loading')).toBeInTheDocument();
  });

  it('shows the default empty state when there are no events and no filters', () => {
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByText('events.timeline.empty.default')).toBeInTheDocument();
    expect(screen.queryByText('events.timeline.empty.withFilters')).not.toBeInTheDocument();
  });

  it('shows the with-filters empty state plus the Clear filters CTA', async () => {
    const setFilters = vi.fn();
    hookState.current = defaultHook({ filters: { event_type: 'track' }, setFilters });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByText('events.timeline.empty.withFilters')).toBeInTheDocument();

    // The empty-state CTA "Clear filters" appears; there are 2 buttons with
    // the same label (one in the filters bar, one in the empty state) — the
    // second one (inside the empty state) is what we assert.
    const buttons = screen.getAllByRole('button', { name: /events\.filters\.clear/i });
    expect(buttons.length).toBeGreaterThan(0);
    await userEvent.click(buttons[buttons.length - 1]);
    expect(setFilters).toHaveBeenCalledWith({});
  });

  it('renders the degraded banner with a retry that preserves filters', async () => {
    const refetch = vi.fn();
    hookState.current = defaultHook({ degraded: true, filters: { event_type: 'track' }, refetch });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByText('events.timeline.degraded.banner')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /events\.timeline\.degraded\.retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the 403 forbidden message', () => {
    hookState.current = defaultHook({ error: new Error('e'), errorCode: 403 });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('events.timeline.error.forbidden');
  });

  it('shows the 422 invalid filters message', () => {
    hookState.current = defaultHook({ error: new Error('e'), errorCode: 422 });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('events.timeline.error.invalidFilters');
  });

  it('shows the 429 rate limit message', () => {
    hookState.current = defaultHook({ error: new Error('e'), errorCode: 429 });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('events.timeline.error.rateLimit');
  });

  it('falls back to the generic message for unknown 5xx', () => {
    hookState.current = defaultHook({ error: new Error('e'), errorCode: 500 });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('events.timeline.error.generic');
  });

  it('silences a 401 error (interceptor handles refresh)', () => {
    // error is set null by the hook in this case; emulate that here.
    hookState.current = defaultHook({ error: null, errorCode: 401 });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the timeline once events arrive', () => {
    hookState.current = defaultHook({
      events: [makeEvent('e1'), makeEvent('e2')],
    });
    render(<ContactEventsTab contactId="c-1" />);
    expect(screen.getByRole('feed')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
});
