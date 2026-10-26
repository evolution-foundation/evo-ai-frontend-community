import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Segments from './Segments';

// `t` must keep its identity: the list reloads whenever it changes.
const language = vi.hoisted(() => ({ t: (key: string) => key }));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: language.t }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

vi.mock('@/components/segments/SegmentsHeader', () => ({ default: () => null }));
vi.mock('@/components/segments/SegmentsPagination', () => ({ default: () => null }));
vi.mock('@/components/segments/SegmentsTable', () => ({
  default: ({
    segments,
    onViewContactIds,
  }: {
    segments: Array<{ id: string; name: string }>;
    onViewContactIds: (segment: { id: string; name: string }) => void;
  }) => (
    <div>
      {segments.map(segment => (
        <button key={segment.id} onClick={() => onViewContactIds(segment)}>
          {segment.name}
        </button>
      ))}
    </div>
  ),
}));

const CONTACT_COUNT = 1001;

const getSegmentContactIds = vi.hoisted(() => vi.fn());
vi.mock('@/services/segments/segmentsService', () => ({
  segmentsService: {
    getSegments: vi.fn(async () => ({
      data: [
        { id: 'seg-1', name: 'Big segment' },
        { id: 'seg-2', name: 'Small segment' },
      ],
      meta: { pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 } },
    })),
    getSegmentContactIds,
  },
}));

// Answers `limit`/`offset` like evo-flow does: seg-1 holds CONTACT_COUNT contacts, seg-2 one.
const serveContactIds = (delayMs = 0) =>
  getSegmentContactIds.mockImplementation(
    async (id: string, { limit, offset }: { limit: number; offset: number }) => {
      if (id === 'seg-2') return { contactIds: ['small-1'], total: 1, limit, offset };
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return {
        contactIds: Array.from(
          { length: Math.max(0, Math.min(limit, CONTACT_COUNT - offset)) },
          (_, i) => `contact-${offset + i + 1}`,
        ),
        total: CONTACT_COUNT,
        limit,
        offset,
      };
    },
  );

describe('Segments — contact ids of a segment', () => {
  beforeEach(() => {
    getSegmentContactIds.mockReset();
    serveContactIds();
  });

  it('lists the contact ids past the first page', async () => {
    const user = userEvent.setup();
    render(<Segments />);

    await user.click(await screen.findByText('Big segment'));

    await waitFor(() =>
      expect(getSegmentContactIds).toHaveBeenCalledWith('seg-1', { limit: 1000, offset: 1000 }),
    );
    expect(await screen.findByText(/"contact-1001"/)).toBeTruthy();
  });

  it('keeps the ids of the segment opened last when an earlier load finishes after it', async () => {
    serveContactIds(100);
    const user = userEvent.setup();
    render(<Segments />);

    await user.click(await screen.findByText('Big segment'));
    await user.keyboard('{Escape}');
    await user.click(screen.getByText('Small segment'));

    expect(await screen.findByText(/"small-1"/)).toBeTruthy();
    await waitFor(() =>
      expect(getSegmentContactIds).toHaveBeenCalledWith('seg-1', { limit: 1000, offset: 1000 }),
    );
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(screen.queryByText(/"contact-1"/)).toBeNull();
    expect(screen.getByText(/"small-1"/)).toBeTruthy();
  });
});
