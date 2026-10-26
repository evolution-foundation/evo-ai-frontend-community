import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Step2_Audience from './Step2_Audience';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/services/contacts', () => ({
  contactsService: {
    getContacts: vi.fn(async () => ({ data: [], meta: { pagination: { total: 0 } } })),
  },
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn(async () => ({ data: [] })) },
}));

const mockGetSegments = vi.fn();
vi.mock('@/services/segments/segmentsService', () => ({
  segmentsService: { getSegments: (...args: unknown[]) => mockGetSegments(...args) },
}));

const SEGMENT_COUNT = 1001;

// Answers `page`/`limit` like evo-flow does, out of a base of SEGMENT_COUNT segments.
const serveSegments = () =>
  mockGetSegments.mockImplementation(async ({ page, limit }: { page: number; limit: number }) => {
    const start = (page - 1) * limit;
    const length = Math.max(0, Math.min(limit, SEGMENT_COUNT - start));
    return {
      data: Array.from({ length }, (_, i) => ({
        id: `seg-${start + i + 1}`,
        name: `Segment ${start + i + 1}`,
        contactsCount: 0,
      })),
      meta: { pagination: { total: SEGMENT_COUNT } },
    };
  });

const renderStep = (data: Parameters<typeof Step2_Audience>[0]['data'], onChange = vi.fn()) => {
  render(<Step2_Audience data={data} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
  return onChange;
};

describe('Step2_Audience — segments past the first page', () => {
  beforeEach(() => {
    mockGetSegments.mockReset();
    serveSegments();
  });

  it('lists the segment past the first page and adds it as a filter', async () => {
    const onChange = renderStep({ contact_selection: '' });
    const user = userEvent.setup();

    await waitFor(() => expect(mockGetSegments).toHaveBeenCalledWith({ page: 2, limit: 1000 }));

    const valuePicker = screen.getAllByRole('combobox')[2];
    await user.click(valuePicker);
    await user.click(await screen.findByRole('option', { name: 'Segment 1001 (0)' }));

    const addButton = screen.getAllByRole('button').find((button) => !button.textContent);
    await user.click(addButton!);

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contact_selection: 'segments', segment_ids: ['seg-1001'] }),
    );
  });

  it('shows the name of a saved segment that sits past the first page', async () => {
    renderStep({ contact_selection: 'segments', segment_ids: ['seg-1001'] });

    expect(await screen.findByText('Segment 1001')).toBeTruthy();
  });
});
