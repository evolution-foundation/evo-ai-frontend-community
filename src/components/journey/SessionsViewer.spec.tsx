import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SessionsViewer } from './SessionsViewer';

vi.mock('@/services', () => ({
  journeyService: {
    getJourneySessions: vi.fn(),
    getJourneySessionStats: vi.fn(),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'pt-BR',
    changeLanguage: () => undefined,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { journeyService } from '@/services';

const baseProps = {
  journeyId: 'journey-1',
  journeyName: 'Test Journey',
  onClose: () => undefined,
};

function statCount(testId: string) {
  const card = screen.getByTestId(testId);
  return within(card).getByText(/^\d+$/).textContent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionsViewer — defensive stats handling', () => {
  it('renders the correct counts when the backend returns a fully populated byStatus map', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: {
        total: 12,
        byStatus: { active: 3, waiting: 2, paused: 1, completed: 4, failed: 1, cancelled: 1 },
      },
    } as never);

    render(<SessionsViewer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('sessions-stats-grid')).toBeTruthy();
    });
    expect(statCount('sessions-stat-total')).toBe('12');
    expect(statCount('sessions-stat-active')).toBe('3');
    expect(statCount('sessions-stat-waiting')).toBe('2');
    expect(statCount('sessions-stat-paused')).toBe('1');
    expect(statCount('sessions-stat-completed')).toBe('4');
    expect(statCount('sessions-stat-failed')).toBe('1');
    expect(statCount('sessions-stat-cancelled')).toBe('1');
  });

  it('does NOT crash when stats has no byStatus field and renders zeros instead', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { total: 0 },
    } as never);

    expect(() => render(<SessionsViewer {...baseProps} />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('sessions-stats-grid')).toBeTruthy();
    });
    expect(statCount('sessions-stat-total')).toBe('0');
    expect(statCount('sessions-stat-active')).toBe('0');
    expect(statCount('sessions-stat-cancelled')).toBe('0');
  });

  it('does NOT crash when stats is an empty object and renders zeros', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: {},
    } as never);

    expect(() => render(<SessionsViewer {...baseProps} />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('sessions-stats-grid')).toBeTruthy();
    });
    expect(statCount('sessions-stat-total')).toBe('0');
    expect(statCount('sessions-stat-failed')).toBe('0');
  });

  it('does NOT crash when byStatus is partial (missing some statuses) — missing ones render as 0', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: {
        total: 5,
        byStatus: { active: 5 },
      },
    } as never);

    expect(() => render(<SessionsViewer {...baseProps} />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('sessions-stats-grid')).toBeTruthy();
    });
    expect(statCount('sessions-stat-total')).toBe('5');
    expect(statCount('sessions-stat-active')).toBe('5');
    expect(statCount('sessions-stat-waiting')).toBe('0');
    expect(statCount('sessions-stat-paused')).toBe('0');
    expect(statCount('sessions-stat-completed')).toBe('0');
    expect(statCount('sessions-stat-failed')).toBe('0');
    expect(statCount('sessions-stat-cancelled')).toBe('0');
  });

  it('does NOT crash when the legacy envelope shape leaks through (regression: EVO-1254 root cause)', async () => {
    // Simulates the pre-fix bug: journeyService forgot to unwrap the
    // `{ success: true, data: ... }` envelope from the evo-flow
    // ResponseTransformInterceptor. Even if a future regression undoes the
    // service-side fix, the component MUST not crash — the defensive guards
    // at the JSX level catch the missing `byStatus`.
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { success: true, data: { total: 9, byStatus: { active: 9 } } } as never,
    } as never);

    expect(() => render(<SessionsViewer {...baseProps} />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('sessions-stats-grid')).toBeTruthy();
    });
    // Counts are all 0 because the leaked envelope hides total/byStatus, but
    // critically: no crash.
    expect(statCount('sessions-stat-total')).toBe('0');
    expect(statCount('sessions-stat-active')).toBe('0');
    expect(statCount('sessions-stat-paused')).toBe('0');
  });

  it('does NOT render the stats grid when the stats request fails (stats stays null)', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockRejectedValue(
      new Error('boom'),
    );

    render(<SessionsViewer {...baseProps} />);

    await waitFor(() => {
      expect(screen.queryByTestId('sessions-stats-grid')).toBeNull();
    });
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

function makeSession(id: string) {
  return {
    id,
    journeyId: 'journey-1',
    contactId: 'contact-00000000',
    accountId: 'acc-1',
    status: 'active' as const,
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 0,
    executionLogs: [],
  };
}

// The contact search used to fire getJourneySessions on every keystroke, and
// a slower response for an earlier keystroke could resolve after a faster one
// and clobber the list with stale data. These tests fail against the pre-fix
// implementation (immediate fetch on every change, no isStale guard).
describe('SessionsViewer — search debounce and stale-response guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for a pause in typing before querying, instead of one request per keystroke', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { total: 0 },
    } as never);

    render(<SessionsViewer {...baseProps} />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    vi.mocked(journeyService.getJourneySessions).mockClear();

    const input = screen.getByPlaceholderText('sessions.viewer.filters.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'j' } });
    fireEvent.change(input, { target: { value: 'jo' } });
    fireEvent.change(input, { target: { value: 'joh' } });

    // Still inside the debounce window — nothing fired yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(journeyService.getJourneySessions).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(journeyService.getJourneySessions).toHaveBeenCalledTimes(1);
    expect(journeyService.getJourneySessions).toHaveBeenCalledWith(
      'journey-1',
      expect.objectContaining({ contactId: 'joh' }),
    );
  });

  it('discards a stale response that resolves after a newer one (race guard)', async () => {
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { total: 0 },
    } as never);

    const first = deferred<{ data: { sessions: unknown[]; total: number } }>();
    const second = deferred<{ data: { sessions: unknown[]; total: number } }>();
    vi.mocked(journeyService.getJourneySessions)
      .mockReturnValueOnce(first.promise as never)
      .mockReturnValueOnce(second.promise as never);

    render(<SessionsViewer {...baseProps} />);
    // Initial mount fetch is now in flight (bound to `first`).

    const input = screen.getByPlaceholderText('sessions.viewer.filters.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'ana' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    // Debounced search fetch is now in flight too (bound to `second`).

    // Resolve out of order: the newer (search) request finishes first...
    await act(async () => {
      second.resolve({ data: { sessions: [makeSession('newer-session')], total: 1 } });
    });
    // ...then the older (initial) request finishes late.
    await act(async () => {
      first.resolve({ data: { sessions: [makeSession('older-session')], total: 1 } });
    });

    expect(screen.getByText('newer-se')).toBeTruthy();
    expect(screen.queryByText('older-se')).toBeNull();
  });

  it('does not refetch stats when the search filter changes — only the session list', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { total: 0 },
    } as never);

    render(<SessionsViewer {...baseProps} />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(journeyService.getJourneySessionStats).toHaveBeenCalledTimes(1);
    vi.mocked(journeyService.getJourneySessionStats).mockClear();

    const input = screen.getByPlaceholderText('sessions.viewer.filters.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'maria' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(journeyService.getJourneySessionStats).not.toHaveBeenCalled();
  });
});

describe('SessionsViewer — load effects survive re-render', () => {
  it('does not refetch when the component re-renders with the same props', async () => {
    vi.mocked(journeyService.getJourneySessions).mockResolvedValue({
      data: { sessions: [], total: 0 },
    } as never);
    vi.mocked(journeyService.getJourneySessionStats).mockResolvedValue({
      data: { total: 0 },
    } as never);

    const { rerender } = render(<SessionsViewer {...baseProps} />);
    await waitFor(() => {
      expect(journeyService.getJourneySessions).toHaveBeenCalledTimes(1);
      expect(journeyService.getJourneySessionStats).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      rerender(<SessionsViewer {...baseProps} />);
      rerender(<SessionsViewer {...baseProps} />);
    });

    expect(journeyService.getJourneySessions).toHaveBeenCalledTimes(1);
    expect(journeyService.getJourneySessionStats).toHaveBeenCalledTimes(1);
  });
});
