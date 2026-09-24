import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineItem, PipelineItemsParams } from '@/types/analytics';
import {
  BOARD_PAGE_SIZE,
  boardFilterParams,
  usePipelineBoardColumns,
} from './usePipelineBoardColumns';

const getPipelineItems = vi.fn();

vi.mock('@/services/pipelines', () => ({
  pipelinesService: { getPipelineItems: (...args: unknown[]) => getPipelineItems(...args) },
}));

const card = (id: string, stageId: string) => ({ id, stage_id: stageId }) as PipelineItem;

const page = (items: PipelineItem[], { total = items.length, hasNext = false } = {}) => ({
  success: true,
  data: items,
  meta: {
    pagination: {
      page: 1,
      page_size: BOARD_PAGE_SIZE,
      total,
      total_pages: 1,
      has_next_page: hasNext,
    },
  },
});

const noFilters = {
  search: '',
  assignee: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  label: '',
  priority: '',
};

describe('boardFilterParams', () => {
  it('sends nothing when no filter is active', () => {
    expect(boardFilterParams(noFilters)).toEqual({});
  });

  it('maps the board filters to the API params', () => {
    expect(
      boardFilterParams({
        ...noFilters,
        search: 'maria',
        assignee: '7',
        status: 'open',
        label: 'vip',
      }),
    ).toEqual({ search: 'maria', assignee_id: '7', conversation_status: 'open', label: 'vip' });
  });

  it('expands the priority bucket into conversation priorities', () => {
    expect(boardFilterParams({ ...noFilters, priority: 'alta' }).priority).toBe('urgent,high');
    expect(boardFilterParams({ ...noFilters, priority: 'media' }).priority).toBe('medium');
    expect(boardFilterParams({ ...noFilters, priority: 'baixa' }).priority).toBe('low');
  });

  it('turns the date range into the whole local days', () => {
    const params = boardFilterParams({
      ...noFilters,
      dateFrom: '2026-05-04',
      dateTo: '2026-05-06',
    });

    expect(params.entered_after).toBe(new Date(2026, 4, 4).toISOString());
    expect(params.entered_before).toBe(new Date(2026, 4, 6, 23, 59, 59, 999).toISOString());
  });
});

describe('usePipelineBoardColumns', () => {
  beforeEach(() => {
    getPipelineItems.mockReset();
  });

  const render = (filters: PipelineItemsParams = {}) =>
    renderHook(({ f }) => usePipelineBoardColumns('p1', ['s1', 's2'], f), {
      initialProps: { f: filters },
    });

  it('loads the first page of every stage as cards, with the filters', async () => {
    getPipelineItems.mockImplementation((_id: string, params: PipelineItemsParams) =>
      Promise.resolve(page([card(`${params.stage_id}-a`, params.stage_id!)], { total: 7 })),
    );

    const { result } = render({ search: 'maria' });

    await waitFor(() => expect(result.current.columns.s2?.loading).toBe(false));
    expect(getPipelineItems).toHaveBeenCalledWith('p1', {
      search: 'maria',
      stage_id: 's1',
      view: 'card',
      per_page: BOARD_PAGE_SIZE,
      page: 1,
    });
    expect(result.current.columns.s1).toMatchObject({ total: 7, page: 1, hasMore: false });
    expect(result.current.columns.s1.items.map(i => i.id)).toEqual(['s1-a']);
  });

  it('appends the next page without repeating a card', async () => {
    getPipelineItems.mockImplementation((_id: string, params: PipelineItemsParams) =>
      Promise.resolve(
        params.page === 1
          ? page([card('a', 's1'), card('b', 's1')], { total: 3, hasNext: true })
          : page([card('b', 's1'), card('c', 's1')], { total: 3 }),
      ),
    );

    const { result } = render();
    await waitFor(() => expect(result.current.columns.s1?.loading).toBe(false));

    act(() => result.current.loadMore('s1'));

    await waitFor(() => expect(result.current.columns.s1.page).toBe(2));
    expect(result.current.columns.s1.items.map(i => i.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.columns.s1.hasMore).toBe(false);
  });

  it('drops a response that arrives after a newer filter', async () => {
    let resolveStale: (value: unknown) => void = () => {};
    getPipelineItems.mockImplementation((_id: string, params: PipelineItemsParams) => {
      if (params.stage_id === 's1' && !params.search) {
        return new Promise(resolve => {
          resolveStale = resolve;
        });
      }
      return Promise.resolve(
        page([card(`${params.stage_id}-${params.search ?? 'all'}`, params.stage_id!)]),
      );
    });

    const { result, rerender } = render();
    rerender({ f: { search: 'maria' } });
    await waitFor(() => expect(result.current.columns.s1?.items[0]?.id).toBe('s1-maria'));

    await act(async () => resolveStale(page([card('stale', 's1')])));

    expect(result.current.columns.s1.items.map(i => i.id)).toEqual(['s1-maria']);
  });

  it('moves a card between columns and puts it back on rollback', async () => {
    getPipelineItems.mockImplementation((_id: string, params: PipelineItemsParams) =>
      Promise.resolve(
        params.stage_id === 's1'
          ? page([card('a', 's1'), card('b', 's1')])
          : page([card('c', 's2')]),
      ),
    );

    const { result } = render();
    await waitFor(() => expect(result.current.columns.s2?.loading).toBe(false));

    let rollback: () => void = () => {};
    act(() => {
      rollback = result.current.moveItem(result.current.columns.s1.items[0], 's2');
    });

    expect(result.current.columns.s1).toMatchObject({ total: 1 });
    expect(result.current.columns.s1.items.map(i => i.id)).toEqual(['b']);
    expect(result.current.columns.s2.items.map(i => [i.id, i.stage_id])).toEqual([
      ['a', 's2'],
      ['c', 's2'],
    ]);
    expect(result.current.columns.s2.total).toBe(2);

    act(() => rollback());

    expect(result.current.columns.s1.items.map(i => i.id)).toEqual(['a', 'b']);
    expect(result.current.columns.s2.items.map(i => i.id)).toEqual(['c']);
  });
});
