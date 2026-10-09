import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { useLanguage } from '@/hooks/useLanguage';
import { AgentsCustomToolsTour } from '@/tours';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button } from '@evoapi/design-system';
import { Wand } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { CustomTool, CustomToolsState, CustomToolFormData, CustomToolsListParams, CustomToolTestResponse } from '@/types/ai';
import { BaseFilter, AppliedFilter } from '@/types/core';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import { AgentsTabsLayout } from '@/components/agents';
import {
  buildCustomToolFilterTypes,
  mergeTagOptions,
} from '@/components/customTools/customToolFilterTypes';
import {
  CustomToolsHeader,
  CustomToolsTable,
  CustomToolsPagination,
  CustomToolWizardModal,
  CustomToolTestResultDialog,
  CustomToolDetails,
  CustomToolsFilter,
} from '@/components/customTools';
import {
  listCustomToolsPage,
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
  const { can } = usePermissions();
  const { t } = useLanguage('customTools');
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editToolId } = useParams<{ id: string }>();
  const isWizardCreate = location.pathname === '/agents/custom-tools/new';
  const isWizardEdit = !!editToolId && location.pathname.endsWith('/edit');
  const isWizardOpen = isWizardCreate || isWizardEdit;
  const [state, setState] = useState<CustomToolsState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<CustomTool | null>(null);
  // Snapshot taken when the dialog opens: a background refetch (e.g. the debounced search)
  // clears the live selection, and the dialog must keep naming what the user confirmed.
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

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

  // Only the latest list request may commit: an older search answering last would
  // otherwise bring back rows a bulk delete just removed.
  const latestLoadRef = useRef(0);

  // Load tools
  const loadTools = useCallback(
    async (params?: Partial<CustomToolsListParams>, filtersOverride?: BaseFilter[]) => {
      // No toast: `AgentsTabsLayout` is already redirecting whoever lacks `read`.
      if (!can('ai_custom_tools', 'read')) {
        return;
      }
      const loadId = ++latestLoadRef.current;
      // Cleared up front, not on success: a pending or failed refetch must not leave a
      // selection a bulk delete could act on over rows that may no longer be listed.
      setState(prev => ({
        ...prev,
        selectedToolIds: [],
        loading: { ...prev.loading, list: true },
      }));

      try {
        const pageSize = params?.limit || DEFAULT_PAGE_SIZE;
        const skip = params?.skip || 0;
        const page = Math.floor(skip / pageSize) + 1;
        const searchParams: CustomToolsListParams = {
          page,
          pageSize,
          skip,
          limit: pageSize,
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

        const { tools, total } = await listCustomToolsPage(searchParams, filterParams);
        if (loadId !== latestLoadRef.current) return;
        setTagOptions(known => mergeTagOptions(known, tools));

        setState(prev => ({
          ...prev,
          tools,
          meta: {
            pagination: {
              page,
              page_size: pageSize,
              total,
              total_pages: Math.ceil(total / pageSize),
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        if (loadId !== latestLoadRef.current) return;
        console.error('Error loading custom tools:', error);
        toast.error(getErrorMessage(error as Error, t('messages.loadError')));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t, activeFilters],
  );

  usePermissionGatedLoad({
    resource: 'ai_custom_tools',
    load: loadTools,
  });

  // The size every load asks for. The pager fires `onPageChange(1)` right after a size
  // change, before the new size reaches state, so state cannot be the source.
  const pageSizeRef = useRef(INITIAL_STATE.meta.pagination.page_size);
  // With no load pending, back to the size on screen: a failed size change must not make
  // the next request ask for a size the footer never showed.
  useEffect(() => {
    if (!state.loading.list) pageSizeRef.current = state.meta.pagination.page_size;
  }, [state.loading.list, state.meta.pagination.page_size]);

  // Keeps the page size and the search on screen, which a bare `loadTools()` drops.
  const reloadPage = (page = state.meta.pagination.page) => {
    const pageSize = pageSizeRef.current;
    return loadTools({ skip: (page - 1) * pageSize, limit: pageSize, search: state.searchQuery });
  };

  // A delete that empties the last page reloads the one before it, or it would render empty.
  const pageAfterDelete = (deleted: number) => {
    const { page, total_pages } = state.meta.pagination;
    return page > 1 && page === total_pages && deleted >= state.tools.length ? page - 1 : page;
  };

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
      loadTools({ skip: 0, limit: pageSizeRef.current, search: query });
    }, 500);
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, buildCustomToolFilterTypes(tagOptions), t, handleRemoveFilter);

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
      await loadTools(
        { skip: 0, limit: pageSizeRef.current, search: state.searchQuery },
        filters,
      );
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(getErrorMessage(error as Error, t('messages.applyFiltersError')));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadTools({ skip: 0, limit: pageSizeRef.current, search: state.searchQuery }, []);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFiltersRef.current.filter((_, i) => i !== index);
    if (newFilters.length === 0) {
      handleClearFilters();
    } else {
      handleApplyFilters(newFilters);
    }
  };

  // Page and size reach state only with the rows `loadTools` commits, so a failed request
  // leaves the footer describing the rows still on screen.
  const handlePageChange = (page: number) => {
    reloadPage(page);
  };

  const handlePerPageChange = (perPage: number) => {
    pageSizeRef.current = perPage;
    loadTools({ skip: 0, limit: perPage, search: state.searchQuery });
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
        toast.error(t('messages.loadError'));
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
      toast.error(getErrorMessage(error as Error, t('messages.testError')));
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
      toast.success(t('messages.deleteSuccess'));

      reloadPage(pageAfterDelete(1));

      setDeleteDialogOpen(false);
      setToolToDelete(null);
    } catch (error) {
      console.error('Error deleting custom tool:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  const handleBulkDelete = () => {
    if (!can('ai_custom_tools', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    if (state.selectedToolIds.length === 0) {
      return;
    }
    setBulkDeleteIds(state.selectedToolIds);
  };

  const confirmBulkDelete = async () => {
    const selectedIds = bulkDeleteIds ?? [];
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(selectedIds.map(id => deleteCustomTool(id)));
      const rejected = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      const failed = rejected.length;

      if (failed > 0) {
        // The toast only carries a count; the reasons would otherwise be lost.
        console.error(
          'Error bulk deleting custom tools:',
          rejected.map(result => result.reason),
        );
        toast.error(t('bulkDeleteDialog.partialError', { failed, total: selectedIds.length }));
      } else {
        toast.success(t('bulkDeleteDialog.success', { count: selectedIds.length }));
      }

      setBulkDeleteIds(null);
      // Refetch instead of local math: after a partial failure the local list is a guess.
      await reloadPage(pageAfterDelete(selectedIds.length - failed));
    } finally {
      setIsBulkDeleting(false);
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
        toast.success(t('messages.updateSuccess'));

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
        toast.success(t('messages.createSuccess'));

        reloadPage();
      }

      // Clear editing state; the wizard page navigates back below.
      setEditingTool(null);
      if (isWizardCreate || isWizardEdit) {
        navigate('/agents/custom-tools');
      }
    } catch (error) {
      console.error('Error saving custom tool:', error);
      toast.error(editingTool ? t('messages.updateError') : t('messages.createError'));
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

  const isNarrowed = state.searchQuery.trim().length > 0 || activeFilters.length > 0;

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
    <AgentsTabsLayout tab="customTools">
    <div className="flex h-full flex-col px-[34px] pb-5" data-tour="agents-custom-tools-page">
      <AgentsCustomToolsTour />
      <div className="mt-6" data-tour="agents-custom-tools-header">
        <CustomToolsHeader
          hideTitle
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedToolIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewTool={handleCreateTool}
          onFilter={handleOpenFilter}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedToolIds: [] }))}
          activeFilters={appliedFilters}
          showFilters={true}
        />
      </div>

      <div className="mt-5 flex-1 overflow-auto" data-tour="agents-custom-tools-content">
        {/* The onboarding empty state only when nothing narrows the list: under a search
            or filter, "no tool created yet" would be false. */}
        {!state.loading.list && state.tools.length === 0 && !isNarrowed ? (
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

      <Dialog
        open={bulkDeleteIds !== null}
        onOpenChange={open => {
          if (!open && !isBulkDeleting) setBulkDeleteIds(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulkDeleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('bulkDeleteDialog.description', { count: bulkDeleteIds?.length ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteIds(null)}
              disabled={isBulkDeleting}
            >
              {t('bulkDeleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? t('bulkDeleteDialog.deleting') : t('bulkDeleteDialog.confirm')}
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
        tagOptions={tagOptions}
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
    </AgentsTabsLayout>
  );
}
