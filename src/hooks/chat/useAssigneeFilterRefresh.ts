import { useCallback, useEffect, useRef } from 'react';
import type { ConversationFilter } from '@/types/chat/api';

/** Assignment events may change membership outside the loaded page. Ask the
 * server for the current page-one list and totals, coalescing event bursts. */
export function useAssigneeFilterRefresh(
  activeFilters: ConversationFilter[],
  refreshCurrentQuery: () => Promise<void>,
) {
  const latest = useRef({ activeFilters, refreshCurrentQuery });
  latest.current = { activeFilters, refreshCurrentQuery };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(() => {
    const hasAssigneeFilter = () => latest.current.activeFilters.some(
      filter => filter.attribute_key === 'assignee_id' && filter.values.length > 0,
    );
    if (!hasAssigneeFilter()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (hasAssigneeFilter()) void latest.current.refreshCurrentQuery();
    }, 300);
  }, []);
}
