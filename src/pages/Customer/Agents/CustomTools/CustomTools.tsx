import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { AgentsCustomToolsTour } from '@/tours';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button } from '@evoapi/design-system';
import { Grid3X3, List, Wand } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { CustomTool, CustomToolsState, CustomToolFormData, CustomToolsListParams, CustomToolTestResponse } from '@/types/ai';
import { BaseFilter, AppliedFilter, CUSTOM_TOOL_FILTER_TYPES } from '@/types/core';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import {
  CustomToolCard,
  CustomToolsHeader,
  CustomToolsTable,
  CustomToolsPagination,
  CustomToolWizardModal,
  CustomToolTestResultDialog,
  CustomToolDetails,
  CustomToolsFilter,
} from '@/components/customTools';
import {
  listCustomTools,
  getCustomTool,
  createCustomTool,
  updateCustomTool,
  deleteCustomTool,
  testCustomTool,
  initialCustomToolsState,
  getErrorMessage,
} from '@/services/agents/customToolsService';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: CustomToolsState = initialCustomToolsState;

export default function CustomTools() {
  const { can, isReady: permissionsReady } = useUserPermissions();
  const { t } = useLanguage('customTools');
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editToolId } = useParams<{ id: string }>();
  const isWizardCreate = location.pathname === '/agents/custom-tools/new';
  const isWizardEdit = !!editToolId && location.pathname.endsWith('/edit');
  const isWizardOpen = isWizardCreate || isWizardEdit;
  const [state, setState] = useState<CustomToolsState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<CustomTool | null>(null);

  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTool, setDetailsTool] = useState<CustomTool | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  // EVO-1953: ref synced to activeFilters so the applied-chip "x" removes against
  // the current list, not the stale snapshot captured when the chips were built.
  const activeFiltersRef = useRef<BaseFilter[]>([]);
  activeFiltersRef.current = activeFilters;
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [testResultOpen, setTestResultOpen] = useState(false);
  const [testResultTool, setTestResultTool] = useState<CustomTool | null>(null);
  const [testResultData, setTestResultData] =
    useState<CustomToolTestResponse['test_result'] | null>(null);
  const hasLoaded = useRef(false);
  // EVO-1953: debounce the server-side search so typing fires one request after
  // it settles, not one per keystroke.
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    [],
  );

  // Load tools
  const loadTools = useCallback(
    async (params?: Partial<CustomToolsListParams>, filtersOverride?: BaseFilter[]) => {
      if (!can('ai_custom_tools', 'read')) {
        toast.error(t('permissions.viewDenied'));
        return;
      }
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const searchParams: CustomToolsListParams = {
          page: params?.skip ? Math.floor(params.skip / (params.limit || DEFAULT_PAGE_SIZE)) + 1 : 1,
          pageSize: params?.limit || DEFAULT_PAGE_SIZE,
          skip: params?.skip,
          limit: params?.limit,
          search: params?.search,
          tags: params?.tags,
        };

        const effectiveFilters = filtersOverride ?? activeFilters;
        const filterParams = effectiveFilters.reduce((acc, filter, index) => {
          const prefix = `filters[${index}]`;
          acc[`${prefix}[attribute_key]`] = filter.attributeKey;
          acc[`${prefix}[filter_operator]`] = filter.filterOperator;
          acc[`${prefix}[values]`] = Array.isArray(filter.values)
            ? filter.values.join(',')
            : String(filter.values);
          if (index > 0) {
            acc[`${prefix}[query_operator]`] = filter.queryOperator;
          }
          return acc;
        }, {} as Record<string, string>);

        const tools = await listCustomTools(searchParams, filterParams);

        setState(prev => ({
          ...prev,
          tools: tools || [],
          meta: {
            pagination: {
              page: searchParams.skip ? Math.floor(searchParams.skip / (searchParams.limit || DEFAULT_PAGE_SIZE)) + 1 : 1,
              page_size: searchParams.limit || DEFAULT_PAGE_SIZE,
              total: tools.length,
              total_pages: Math.ceil(tools.length / (searchParams.limit || DEFAULT_PAGE_SIZE)),
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading custom tools:', error);
        toast.error(getErrorMessage(error as Error, t('errors.loadError')));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t, activeFilters],
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
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      loadTools({ skip: 0, search: query });
    }, 500);
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, CUSTOM_TOOL_FILTER_TYPES, t, handleRemoveFilter);

  const handleOpenFilter = () => {
    setFilterModalOpen(true);
  };

  const handleApplyFilters = async (filters: BaseFilter[]) => {
    setActiveFilters(filters);
    setAppliedFilters(convertFiltersToApplied(filters));

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, list: true },
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    try {
      await loadTools({ skip: 0, search: state.searchQuery }, filters);
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(getErrorMessage(error as Error, t('errors.applyFiltersError')));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadTools({ skip: 0, search: state.searchQuery }, []);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFiltersRef.current.filter((_, i) => i !== index);
    if (newFilters.length === 0) {
      handleClearFilters();
    } else {
      handleApplyFilters(newFilters);
    }
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));

    const skip = (page - 1) * state.meta.pagination.page_size;
    loadTools({ skip });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));

    loadTools({ skip: 0, limit: perPage });
  };

  // Tool actions
  const handleToolClick = (tool: CustomTool) => {
    setDetailsTool(tool);
    setDetailsModalOpen(true);
  };

  const handleCreateTool = () => {
    if (!can('ai_custom_tools', 'create')) {
      toast.error(t('permissions.createDenied'));
      return;
    }
    setEditingTool(null);
    navigate('/agents/custom-tools/new');
  };

  const handleEditTool = (tool: CustomTool) => {
    if (!can('ai_custom_tools', 'update')) {
      toast.error(t('permissions.editDenied'));
      return;
    }
    setEditingTool(tool);
    navigate(`/agents/custom-tools/${tool.id}/edit`);
  };

  useEffect(() => {
    if (!isWizardEdit || !editToolId) return;
    if (editingTool?.id === editToolId) return;
    const cached = state.tools.find(tool => tool.id === editToolId);
    if (cached) {
      setEditingTool(cached);
      return;
    }
    let cancelled = false;
    getCustomTool(editToolId)
      .then(fetched => {
        if (!cancelled && fetched) setEditingTool(fetched);
      })
      .catch(err => {
        console.error('Failed to load tool for edit:', err);
        toast.error(t('errors.loadError'));
        navigate('/agents/custom-tools');
      });
    return () => {
      cancelled = true;
    };
  }, [isWizardEdit, editToolId, state.tools, editingTool?.id, navigate, t]);

  const handleDeleteTool = (tool: CustomTool) => {
    if (!can('ai_custom_tools', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    setToolToDelete(tool);
    setDeleteDialogOpen(true);
  };

  const handleTestTool = async (tool: CustomTool) => {
    setTestingTool(tool.id);
    setState(prev => ({ ...prev, loading: { ...prev.loading, test: true } }));

    try {
      const result = await testCustomTool(tool.id);
      setTestResultTool(tool);
      setTestResultData(result.test_result);
      setTestResultOpen(true);
    } catch (error) {
      console.error('Error testing custom tool:', error);
      toast.error(getErrorMessage(error as Error, t('errors.testError')));
    } finally {
      setTestingTool(null);
      setState(prev => ({ ...prev, loading: { ...prev.loading, test: false } }));
    }
  };



  // Confirm delete single tool
  const confirmDeleteTool = async () => {
    if (!toolToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await deleteCustomTool(toolToDelete.id);
      toast.success(t('success.deleteSuccess'));

      // Refresh the list
      loadTools();

      setDeleteDialogOpen(false);
      setToolToDelete(null);
    } catch (error) {
      console.error('Error deleting custom tool:', error);
      toast.error(t('errors.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };



  // Handle tool form submission
  const handleToolFormSubmit = async (data: CustomToolFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingTool ? 'update' : 'create']: true },
    }));

    try {
      if (editingTool) {
        // Update existing tool
        const response = await updateCustomTool(editingTool.id, data);
        toast.success(t('success.updateSuccess'));

        // Update the specific tool in the list with the latest data
        setState(prev => ({
          ...prev,
          tools: prev.tools.map(tool =>
            tool.id === editingTool.id
              ? { ...tool, ...response }
              : tool
          )
        }));
      } else {
        // Create new tool
        await createCustomTool(data);
        toast.success(t('success.createSuccess'));

        // Refresh the entire list for new tools
        loadTools();
      }

      // Clear editing state; the wizard page navigates back below.
      setEditingTool(null);
      if (isWizardCreate || isWizardEdit) {
        navigate('/agents/custom-tools');
      }
    } catch (error) {
      console.error('Error saving custom tool:', error);
      toast.error(editingTool ? t('errors.updateError') : t('errors.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };


  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsTool(null);
    }
  };

  if (isWizardOpen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 animate-slideInFromRight">
          <CustomToolWizardModal
            embedded
            open={isWizardOpen}
            loading={state.loading.create || state.loading.update}
            tool={isWizardEdit ? editingTool || undefined : undefined}
            onOpenChange={(open) => {
              if (!open) navigate('/agents/custom-tools');
            }}
            onSubmit={handleToolFormSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4" data-tour="agents-custom-tools-page">
      <AgentsCustomToolsTour />
      <div data-tour="agents-custom-tools-header">
        <CustomToolsHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedToolIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewTool={handleCreateTool}
          onFilter={handleOpenFilter}

          onClearSelection={() => setState(prev => ({ ...prev, selectedToolIds: [] }))}
          activeFilters={appliedFilters}
          showFilters={true}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-3" data-tour="agents-custom-tools-view-toggle">
        <div className="flex items-center border rounded-lg">
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
      <div className="flex-1 overflow-auto" data-tour="agents-custom-tools-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.tools')}</div>
          </div>
        ) : state.tools.length === 0 ? (
          <EmptyState
            icon={Wand}
            title={t('table.empty.title')}
            description={t('table.empty.description')}
            action={{
              label: t('table.actions.create'),
              onClick: handleCreateTool
            }}
            className="h-full"
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.tools.map(tool => (
              <CustomToolCard
                key={tool.id}
                tool={tool}
                onEdit={handleEditTool}
                onDelete={handleDeleteTool}
                onTest={handleTestTool}
                onClick={handleToolClick}
                isTestLoading={testingTool === tool.id}
              />
            ))}
          </div>
        ) : (
          <CustomToolsTable
            tools={state.tools}
            selectedTools={state.tools.filter(tool =>
              state.selectedToolIds.includes(tool.id),
            )}
            loading={state.loading.list}
            onSelectionChange={(tools: CustomTool[]) =>
              setState(prev => ({
                ...prev,
                selectedToolIds: tools.map((t: CustomTool) => t.id),
              }))
            }
            onToolClick={handleToolClick}
            onEditTool={handleEditTool}
            onDeleteTool={handleDeleteTool}
            onTestTool={handleTestTool}
            onCreateTool={handleCreateTool}
            testingToolId={testingTool}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <CustomToolsPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={state.loading.list}
        />
      )}

      {/* Delete Tool Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: toolToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={state.loading.delete}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTool}
              disabled={state.loading.delete}
            >
              {state.loading.delete ? t('loading.deleting') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool Details Modal */}
      <CustomToolDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        tool={detailsTool}
        onEdit={(tool: CustomTool) => {
          setDetailsModalOpen(false);
          handleEditTool(tool);
        }}
        onTest={handleTestTool}
        isTestLoading={testingTool === detailsTool?.id}
      />

      {/* Tools Filter Modal */}
      <CustomToolsFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={activeFilters}
        onFiltersChange={setActiveFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Test Result Dialog */}
      <CustomToolTestResultDialog
        open={testResultOpen}
        onOpenChange={open => {
          setTestResultOpen(open);
          if (!open) {
            setTestResultTool(null);
            setTestResultData(null);
          }
        }}
        tool={testResultTool}
        result={testResultData}
      />
    </div>
  );
}
