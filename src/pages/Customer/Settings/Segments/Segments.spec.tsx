import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
      data: [{ id: 'seg-1', name: 'Big segment' }],
      meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
    })),
    getSegmentContactIds,
  },
}));

// Answers `limit`/`offset` like evo-flow does, out of a segment with CONTACT_COUNT contacts.
getSegmentContactIds.mockImplementation(
  async (_id: string, { limit, offset }: { limit: number; offset: number }) => ({
    contactIds: Array.from(
      { length: Math.max(0, Math.min(limit, CONTACT_COUNT - offset)) },
      (_, i) => `contact-${offset + i + 1}`,
    ),
    total: CONTACT_COUNT,
    limit,
    offset,
  }),
);

describe('Segments — contact ids of a segment', () => {
  it('lists the contact ids past the first page', async () => {
    const user = userEvent.setup();
    render(<Segments />);

    await user.click(await screen.findByText('Big segment'));

    await waitFor(() =>
      expect(getSegmentContactIds).toHaveBeenCalledWith('seg-1', { limit: 1000, offset: 1000 }),
    );
    expect(await screen.findByText(/"contact-1001"/)).toBeTruthy();
  });
});
