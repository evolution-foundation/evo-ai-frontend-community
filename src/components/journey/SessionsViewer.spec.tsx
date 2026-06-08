import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
