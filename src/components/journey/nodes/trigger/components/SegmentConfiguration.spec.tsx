import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentConfiguration } from './SegmentConfiguration';

// `t` must keep its identity: the component refetches the segments whenever it changes.
const language = vi.hoisted(() => ({ t: (key: string) => key }));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: language.t }),
}));

const SEGMENT_COUNT = 101;

const getSegments = vi.hoisted(() => vi.fn());
vi.mock('@/services/segments/segmentsService', () => ({
  segmentsService: { getSegments },
}));

// Answers `page`/`limit` like evo-flow does, out of a base of SEGMENT_COUNT running segments.
getSegments.mockImplementation(async ({ page, limit }: { page: number; limit: number }) => {
  const start = (page - 1) * limit;
  const length = Math.max(0, Math.min(limit, SEGMENT_COUNT - start));
  return {
    data: Array.from({ length }, (_, i) => ({
      id: `seg-${start + i + 1}`,
      name: `Segment ${start + i + 1}`,
      status: 'running',
      contactsCount: 0,
    })),
    meta: { pagination: { total: SEGMENT_COUNT } },
  };
});

describe('SegmentConfiguration — segments past the first page', () => {
  it('lists the running segment past the first page and selects it', async () => {
    const onSegmentIdChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SegmentConfiguration
        segmentId=""
        segmentAction="entered"
        onSegmentIdChange={onSegmentIdChange}
        onSegmentActionChange={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(getSegments).toHaveBeenCalledWith({ page: 2, limit: 100, status: 'running' }),
    );

    const segmentPicker = screen.getAllByRole('combobox')[1];
    await waitFor(() => expect(segmentPicker.hasAttribute('disabled')).toBe(false));
    await user.click(segmentPicker);
    await user.click(await screen.findByText('Segment 101'));

    expect(onSegmentIdChange).toHaveBeenCalledWith('seg-101', 'Segment 101');
  });
});
