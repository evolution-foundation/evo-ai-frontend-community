import { useCallback, useEffect, useRef, useState } from 'react';
import { pipelinesService } from '@/services/pipelines';
import type { PipelineItem, PipelineItemsParams } from '@/types/analytics';

export const BOARD_PAGE_SIZE = 50;

export interface BoardFilters {
  search: string;
  assignee: string;
  status: string;
  dateFrom: string; // YYYY-MM-DD, operator's local day
  dateTo: string; // YYYY-MM-DD, operator's local day
  label: string;
  priority: string; // board bucket: alta | media | baixa
}

export interface BoardColumn {
  items: PipelineItem[];
  page: number;
  hasMore: boolean;
  total: number;
  loading: boolean;
}

const PRIORITY_BUCKETS: Record<string, string> = {
  alta: 'urgent,high',
  media: 'medium',
  baixa: 'low',
};

const localDay = (value: string, endOfDay: boolean) => {
  const [y, m, d] = value.split('-').map(Number);
  const date = endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
  return date.toISOString();
};

// Board filters (URL state) → pipeline_items query params, so the server filters the
// whole stage instead of the browser filtering the page it happens to hold.
export function boardFilterParams(filters: BoardFilters): PipelineItemsParams {
  const params: PipelineItemsParams = {};
  if (filters.search) params.search = filters.search;
  if (filters.assignee) params.assignee_id = filters.assignee;
  if (filters.status) params.conversation_status = filters.status;
  if (filters.label) params.label = filters.label;
  if (filters.priority && PRIORITY_BUCKETS[filters.priority]) {
    params.priority = PRIORITY_BUCKETS[filters.priority];
  }
  if (filters.dateFrom) params.entered_after = localDay(filters.dateFrom, false);
  if (filters.dateTo) params.entered_before = localDay(filters.dateTo, true);
  return params;
}

const emptyColumn = (): BoardColumn => ({
  items: [],
  page: 0,
  hasMore: false,
  total: 0,
  loading: true,
});

// Cards of each stage, fetched a page at a time. A response that arrives after a newer
// request for the same stage (filter change, reload) is dropped.
export function usePipelineBoardColumns(
  pipelineId: string | undefined,
  stageIds: string[],
  filters: PipelineItemsParams,
  onError?: (error: unknown) => void,
) {
  const [columns, setColumns] = useState<Record<string, BoardColumn>>({});
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const requestSeq = useRef<Record<string, number>>({});
  // Bumped each time a page lands in a column, so a late rollback can tell its snapshot is stale.
  const landed = useRef<Record<string, number>>({});
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const stageKey = stageIds.join(',');
  const filterKey = JSON.stringify(filters);

  const fetchPage = useCallback(
    async (stageId: string, page: number) => {
      if (!pipelineId) return;
      const seq = (requestSeq.current[stageId] ?? 0) + 1;
      requestSeq.current[stageId] = seq;
      setColumns(prev => ({
        ...prev,
        [stageId]: { ...(prev[stageId] ?? emptyColumn()), loading: true },
      }));

      try {
        const response = await pipelinesService.getPipelineItems(pipelineId, {
          ...filtersRef.current,
          stage_id: stageId,
          view: 'card',
          per_page: BOARD_PAGE_SIZE,
          page,
        });
        if (requestSeq.current[stageId] !== seq) return;
        landed.current[stageId] = (landed.current[stageId] ?? 0) + 1;

        const pagination = response.meta?.pagination;
        setColumns(prev => {
          const current = prev[stageId] ?? emptyColumn();
          const known = page > 1 ? new Set(current.items.map(item => item.id)) : new Set<string>();
          const incoming = (response.data ?? []).filter(item => !known.has(item.id));
          return {
            ...prev,
            [stageId]: {
              items: page > 1 ? [...current.items, ...incoming] : incoming,
              page,
              hasMore: Boolean(pagination?.has_next_page),
              total: pagination?.total ?? incoming.length,
              loading: false,
            },
          };
        });
      } catch (error) {
        if (requestSeq.current[stageId] !== seq) return;
        setColumns(prev => ({
          ...prev,
          [stageId]: { ...(prev[stageId] ?? emptyColumn()), loading: false },
        }));
        onErrorRef.current?.(error);
      }
    },
    [pipelineId],
  );

  const reload = useCallback(
    (ids: string[] = stageKey ? stageKey.split(',') : []) =>
      Promise.all(ids.map(id => fetchPage(id, 1))),
    [fetchPage, stageKey],
  );

  useEffect(() => {
    setColumns(prev => {
      const next: Record<string, BoardColumn> = {};
      for (const id of stageKey ? stageKey.split(',') : [])
        next[id] = { ...(prev[id] ?? emptyColumn()), loading: true };
      return next;
    });
    reload();
  }, [reload, stageKey, filterKey]);

  const loadMore = useCallback(
    (stageId: string) => {
      const column = columnsRef.current[stageId];
      if (!column || column.loading || !column.hasMore) return;
      fetchPage(stageId, column.page + 1);
    },
    [fetchPage],
  );

  // Moves the card between columns right away; the returned function undoes it if the
  // server refuses the move. When a page landed in either column since then (filter
  // change, reload, next page), the snapshot is stale, so both columns are refetched.
  const moveItem = useCallback(
    (item: PipelineItem, toStageId: string) => {
      const fromStageId = item.stage_id;
      const snapshot = {
        [fromStageId]: columnsRef.current[fromStageId],
        [toStageId]: columnsRef.current[toStageId],
      };
      const landedAtMove = [fromStageId, toStageId].map(id => landed.current[id] ?? 0);

      setColumns(prev => {
        const from = prev[fromStageId];
        const to = prev[toStageId];
        if (!from || !to) return prev;
        const moved = { ...item, stage_id: toStageId, pipeline_stage_id: toStageId };
        return {
          ...prev,
          [fromStageId]: {
            ...from,
            items: from.items.filter(i => i.id !== item.id),
            total: Math.max(from.total - 1, 0),
          },
          [toStageId]: {
            ...to,
            items: [moved, ...to.items.filter(i => i.id !== item.id)],
            total: to.total + 1,
          },
        };
      });

      return () => {
        const stale = [fromStageId, toStageId].some(
          (id, i) => (landed.current[id] ?? 0) !== landedAtMove[i],
        );
        if (stale) {
          fetchPage(fromStageId, 1);
          fetchPage(toStageId, 1);
          return;
        }
        setColumns(prev => {
          const restored = { ...prev };
          for (const [id, column] of Object.entries(snapshot)) if (column) restored[id] = column;
          return restored;
        });
      };
    },
    [fetchPage],
  );

  return { columns, loadMore, reload, moveItem };
}
