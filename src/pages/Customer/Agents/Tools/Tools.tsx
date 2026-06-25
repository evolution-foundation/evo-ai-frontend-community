import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Grid3X3, List, Wrench } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { listTools } from '@/services/agents/toolsService';
import type { Tool, ToolsResponse, ToolsState, ToolsListParams } from '@/types/ai';
import { BaseFilter, AppliedFilter, TOOL_FILTER_TYPES } from '@/types/core';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import { ToolCard } from '@/components/tools';

import ToolsHeader from '@/components/tools/ToolsHeader';
import ToolsTable from '@/components/tools/ToolsTable';
import ToolsPagination from '@/components/tools/ToolsPagination';
import ToolDetails from '@/components/tools/ToolDetails';
import ToolsFilter from '@/components/tools/ToolsFilter';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: ToolsState = {
  tools: [],
  selectedToolIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
      has_next_page: false,
      has_previous_page: false,
    },
  },
  loading: {
    list: false,
  },
  filters: [],
  searchQuery: '',
};

export default function Tools() {
  const { t } = useLanguage('tools');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const [state, setState] = useState<ToolsState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTool, setDetailsTool] = useState<Tool | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const hasLoaded = useRef(false);

  // Load tools
  const loadTools = useCallback(
    async (params?: Partial<ToolsListParams>) => {
      if (!can('ai_tools', 'read')) {
        toast.error(t('errors.permissionDenied'));
        return;
      }
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: ToolsListParams = {
          limit: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const response: ToolsResponse = await listTools({
          category: requestParams.category,
          tags: requestParams.tags,
          search: requestParams.search,
        });

        const currentPage = Math.floor((requestParams.skip || 0) / (requestParams.limit || DEFAULT_PAGE_SIZE)) + 1;
        const pageSize = requestParams.limit || DEFAULT_PAGE_SIZE;
        const total = response.metadata?.total_tools || 0;
        const totalPages = Math.ceil(total / pageSize);

        setState(prev => ({
          ...prev,
          tools: response.tools || [],
          meta: {
            pagination: {
              page: currentPage,
              page_size: pageSize,
              total: total,
              total_pages: totalPages,
              has_next_page: currentPage < totalPages,
              has_previous_page: currentPage > 1,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading tools:', error);
        toast.error(t('errors.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadTools();
    }
  }, [permissionsReady, loadTools]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page: 1 },
      },
    }));

    loadTools({ skip: 0, search: query });
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, TOOL_FILTER_TYPES, t, handleRemoveFilter);

  const handleOpenFilter = () => {
    setFilterModalOpen(true);
  };

  const handleApplyFilters = async (filters: BaseFilter[]) => {
    setActiveFilters(filters);
    setAppliedFilters(convertFiltersToApplied(filters));

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, list: true },
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page: 1 },
      },
    }));

    try {
      await loadTools({ skip: 0 });
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(t('errors.applyFiltersError'));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadTools({ skip: 0 });
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFilters.filter((_, i) => i !== index);
    if (newFilters.length === 0) {
      handleClearFilters();
    } else {
      handleApplyFilters(newFilters);
    }
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page },
      },
    }));

    const skip = (page - 1) * state.meta.pagination.page_size;
    loadTools({ skip });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
    }));

    loadTools({ skip: 0, limit: perPage });
  };

  // Tool actions
  const handleToolClick = (tool: Tool) => {
    setDetailsTool(tool);
    setDetailsModalOpen(true);
  };

  // Handle modal close
  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsTool(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <ToolsHeader
        totalCount={state.meta.pagination.total}
        selectedCount={state.selectedToolIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onFilter={handleOpenFilter}
        onClearSelection={() => setState(prev => ({ ...prev, selectedToolIds: [] }))}
        activeFilters={appliedFilters}
        showFilters={true}
      />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="border-0 rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="border-0 rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.tools')}</div>
          </div>
        ) : state.tools.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={t('emptyState.title')}
            description={t('emptyState.description')}
            className="h-full"
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.tools.map(tool => (
              <ToolCard key={tool.id} tool={tool} onClick={handleToolClick} />
            ))}
          </div>
        ) : (
          <ToolsTable
            tools={state.tools}
            selectedTools={state.tools.filter(tool => state.selectedToolIds.includes(tool.id))}
            loading={state.loading.list}
            onSelectionChange={tools =>
              setState(prev => ({
                ...prev,
                selectedToolIds: tools.map(t => t.id),
              }))
            }
            onToolClick={handleToolClick}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <ToolsPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={state.loading.list}
        />
      )}

      {/* Tool Details Modal */}
      <ToolDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        tool={detailsTool}
      />

      {/* Tools Filter Modal */}
      <ToolsFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={activeFilters}
        onFiltersChange={setActiveFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
