import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { useLanguage } from '@/hooks/useLanguage';
import { AgentsCustomMCPsTour } from '@/tours';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { TestTube } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import {
  CustomMcpServer,
  CustomMcpServersState,
  ListCustomMcpServersParams,
  CustomMcpServerFormData,
} from '@/types/ai';
import { AgentsTabsLayout } from '@/components/agents';

import CustomMCPServersHeader from '@/components/customMcpServers/CustomMCPServersHeader';
import CustomMCPServersTable from '@/components/customMcpServers/CustomMCPServersTable';
import CustomMCPServersPagination from '@/components/customMcpServers/CustomMCPServersPagination';
import { CustomMCPServerWizardModal } from '@/components/customMcpServers';
import CustomMCPServerDetails from '@/components/customMcpServers/CustomMCPServerDetails';
import CustomMCPServersFilterPanel from '@/components/customMcpServers/CustomMCPServersFilterPanel';
import CustomMCPServerTestDialog, {
  CustomMCPServerTestOutcome,
} from '@/components/customMcpServers/CustomMCPServerTestDialog';
import {
  EMPTY_CUSTOM_MCP_SERVER_FACETS,
  EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS,
  CustomMcpServerFacetSelection,
  buildCustomMcpServerFilterParams,
  countSelectedFacets,
  mergeFacetOptions,
} from '@/components/customMcpServers/customMcpServersFilterFacets';
import {
  listCustomMcpServersPage,
  getCustomMcpServer,
  createCustomMcpServer,
  updateCustomMcpServer,
  deleteCustomMcpServer,
  testCustomMcpServer,
} from '@/services/agents/customMcpServerService';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: CustomMcpServersState = {
  servers: [],
  selectedServerIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    test: false,
  },
  filters: [],
  searchQuery: '',
};

export default function CustomMCPServers() {
  const { can } = usePermissions();
  const { t } = useLanguage('customMcpServers');
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editServerId } = useParams<{ id: string }>();
  const isWizardCreate = location.pathname === '/agents/custom-mcp-servers/new';
  const isWizardEdit = !!editServerId && location.pathname.endsWith('/edit');
  const isWizardOpen = isWizardCreate || isWizardEdit;
  const [state, setState] = useState<CustomMcpServersState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<CustomMcpServer | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [editingServer, setEditingServer] = useState<CustomMcpServer | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsServer, setDetailsServer] = useState<CustomMcpServer | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // Stable: the panel re-binds its outside-click listeners whenever `onClose` changes.
  const closeFilterPanel = useCallback(() => setFilterPanelOpen(false), []);
  // Tags/Timeout are applied SERVER-side, over the whole base, like the Agents tab facets.
  const [facets, setFacets] = useState<CustomMcpServerFacetSelection>(
    EMPTY_CUSTOM_MCP_SERVER_FACETS,
  );
  // Read by `loadServers` instead of closing over `facets`: the debounced search fires a
  // `loadServers` from an older render, which would drop a facet ticked in the meantime.
  const facetsRef = useRef<CustomMcpServerFacetSelection>(EMPTY_CUSTOM_MCP_SERVER_FACETS);
  const [facetOptions, setFacetOptions] = useState(EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS);
  // Requests are not serialized: a slow response for an older search/facet set must not
  // overwrite the rows of the newer one.
  const loadSeqRef = useRef(0);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  // Per-run token, not the server id: re-testing the same server, or closing the dialog
  // mid-flight, must not let an older run write its outcome.
  const testRunRef = useRef(0);
  const [testDialogServer, setTestDialogServer] = useState<CustomMcpServer | null>(null);
  const [testOutcome, setTestOutcome] = useState<CustomMCPServerTestOutcome | null>(null);
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

  // Load servers
  const loadServers = useCallback(
    async (
      params?: Partial<ListCustomMcpServersParams>,
      facetsOverride?: CustomMcpServerFacetSelection,
    ) => {
      // No toast: `AgentsTabsLayout` is already redirecting whoever lacks `read`.
      if (!can('ai_custom_mcp_servers', 'read')) {
        return;
      }
      const seq = ++loadSeqRef.current;
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: ListCustomMcpServersParams = {
          skip: 0,
          limit: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const filterParams = buildCustomMcpServerFilterParams(
          facetsOverride ?? facetsRef.current,
        );
        const { servers, total } = await listCustomMcpServersPage(requestParams, filterParams);
        if (seq !== loadSeqRef.current) return;

        const pageSize = requestParams.limit || DEFAULT_PAGE_SIZE;
        setFacetOptions(known => mergeFacetOptions(known, servers));
        setState(prev => ({
          ...prev,
          servers,
          meta: {
            pagination: {
              page: Math.floor((requestParams.skip || 0) / pageSize) + 1,
              page_size: pageSize,
              total,
              total_pages: Math.ceil(total / pageSize),
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        if (seq !== loadSeqRef.current) return;
        console.error('Error loading Custom MCP servers:', error);
        toast.error(t('errors.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  usePermissionGatedLoad({
    resource: 'ai_custom_mcp_servers',
    load: loadServers,
  });

  // Handlers
  // Dropping the selection is the honest move: keeping rows the user can no longer see
  // counted in "N selecionados" hides what a bulk action would hit.
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedServerIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      loadServers({ skip: 0, search: query });
    }, 500);
  };

  // A facet change is a refetch from page 1: staying on page 5 would ask for a page the
  // narrowed result set no longer has.
  const applyFacets = (next: CustomMcpServerFacetSelection) => {
    facetsRef.current = next;
    setFacets(next);
    setState(prev => ({
      ...prev,
      selectedServerIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));
    loadServers(
      { skip: 0, limit: state.meta.pagination.page_size, search: state.searchQuery },
      next,
    );
  };

  // Reloads keep the page, page size and search on screen: dropping the search here would
  // list the whole base under a search box that still shows the typed text.
  const reloadCurrentPage = (page = state.meta.pagination.page) => {
    const { page_size } = state.meta.pagination;
    return loadServers({ skip: (page - 1) * page_size, limit: page_size, search: state.searchQuery });
  };

  // Page and page-size changes drop the selection for the same reason a search does.
  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      selectedServerIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));

    reloadCurrentPage(page);
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      selectedServerIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));

    loadServers({ skip: 0, limit: perPage, search: state.searchQuery });
  };

  // Server actions
  const handleServerClick = (server: CustomMcpServer) => {
    setDetailsServer(server);
    setDetailsModalOpen(true);
  };

  const handleCreateServer = () => {
    if (!can('ai_custom_mcp_servers', 'create')) {
      toast.error(t('permissions.createDenied'));
      return;
    }
    setEditingServer(null);
    navigate('/agents/custom-mcp-servers/new');
  };

  const handleEditServer = (server: CustomMcpServer) => {
    if (!can('ai_custom_mcp_servers', 'update')) {
      toast.error(t('permissions.editDenied'));
      return;
    }
    setEditingServer(server);
    navigate(`/agents/custom-mcp-servers/${server.id}/edit`);
  };

  // Prefill the wizard on deep-link/refresh into an edit URL: use the cached
  // server from the current list if present, else fetch it by id.
  useEffect(() => {
    if (!isWizardEdit || !editServerId) return;
    if (editingServer?.id === editServerId) return;
    const cached = state.servers.find(server => server.id === editServerId);
    if (cached) {
      setEditingServer(cached);
      return;
    }
    let cancelled = false;
    getCustomMcpServer(editServerId)
      .then(fetched => {
        if (!cancelled && fetched) setEditingServer(fetched);
      })
      .catch(err => {
        console.error('Failed to load Custom MCP server for edit:', err);
        toast.error(t('errors.loadError'));
        navigate('/agents/custom-mcp-servers');
      });
    return () => {
      cancelled = true;
    };
  }, [isWizardEdit, editServerId, state.servers, editingServer?.id, navigate, t]);

  const handleDeleteServer = (server: CustomMcpServer) => {
    if (!can('ai_custom_mcp_servers', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleTestServer = async (server: CustomMcpServer) => {
    const run = ++testRunRef.current;
    setTestingServer(server.id);
    setTestDialogServer(server);
    setTestOutcome(null);
    setState(prev => ({ ...prev, loading: { ...prev.loading, test: true } }));

    let outcome: CustomMCPServerTestOutcome;
    try {
      const result = await testCustomMcpServer(server.id);
      if (result.test_result.success) {
        // EVO-2139: prioriza `tools_count` do próprio test (número descoberto
        // agora no handshake MCP) sobre `server.tools.length` (DB, que fica
        // stale se o Create original não conseguiu popular). Optional-chaining
        // no fallback evita o crash silencioso quando o server tem tools=null.
        const toolsCount =
          result.test_result.tools_count ?? result.server.tools?.length ?? 0;
        outcome = { success: true, toolsCount };
        // Update server with latest tools
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(s =>
            s.id === server.id ? (result.server as CustomMcpServer) : s,
          ),
        }));
      } else {
        outcome = { success: false, error: result.test_result.error || t('test.unknownError') };
      }
    } catch (error) {
      console.error('Error testing Custom MCP server:', error);
      outcome = { success: false, error: t('errors.testError') };
    }

    if (run !== testRunRef.current) return;
    setTestingServer(null);
    setTestOutcome(outcome);
    setState(prev => ({ ...prev, loading: { ...prev.loading, test: false } }));
  };

  const closeTestDialog = () => {
    testRunRef.current += 1;
    setTestingServer(null);
    setTestDialogServer(null);
    setTestOutcome(null);
    setState(prev => ({ ...prev, loading: { ...prev.loading, test: false } }));
  };

  // Confirm delete single server
  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await deleteCustomMcpServer(serverToDelete.id);
      toast.success(t('success.deleteSuccess'));

      // A deleted row left in the selection would be re-sent by the bulk delete and 404.
      const deletedId = serverToDelete.id;
      const { page } = state.meta.pagination;
      const targetPage = state.servers.length <= 1 && page > 1 ? page - 1 : page;
      setState(prev => ({
        ...prev,
        selectedServerIds: prev.selectedServerIds.filter(id => id !== deletedId),
        meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: targetPage } },
      }));
      reloadCurrentPage(targetPage);

      setDeleteDialogOpen(false);
      setServerToDelete(null);
    } catch (error) {
      console.error('Error deleting Custom MCP server:', error);
      toast.error(t('errors.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  const handleBulkDelete = () => {
    if (!can('ai_custom_mcp_servers', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    if (state.selectedServerIds.length === 0) {
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const selectedIds = state.selectedServerIds;
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(selectedIds.map(id => deleteCustomMcpServer(id)));
      const rejected = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      const failed = rejected.length;
      const deleted = selectedIds.length - failed;

      if (failed > 0) {
        // The toast only carries a count: without this the reason each delete failed is
        // lost, and a partial failure leaves nothing to debug.
        console.error(
          'Error bulk deleting Custom MCP servers:',
          rejected.map(result => result.reason),
        );
        toast.error(t('bulkDeleteDialog.partialError', { failed, total: selectedIds.length }));
      } else {
        toast.success(t('bulkDeleteDialog.success', { count: deleted }));
      }

      // Refetch instead of local math: after a partial failure the local list is a guess.
      // A page the delete emptied steps back one, or it would render empty.
      const { page } = state.meta.pagination;
      const targetPage = deleted >= state.servers.length && page > 1 ? page - 1 : page;
      setState(prev => ({
        ...prev,
        selectedServerIds: [],
        meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: targetPage } },
      }));
      setBulkDeleteDialogOpen(false);
      await reloadCurrentPage(targetPage);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle server form submission
  const handleServerFormSubmit = async (data: CustomMcpServerFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingServer ? 'update' : 'create']: true },
    }));

    try {
      if (editingServer) {
        // Update existing server
        const response = await updateCustomMcpServer(editingServer.id, data);
        toast.success(t('success.updateSuccess'));

        // Update the specific server in the list with the latest data
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(server =>
            server.id === editingServer.id ? { ...server, ...response } : server,
          ),
        }));
      } else {
        // Create new server
        await createCustomMcpServer(data);
        toast.success(t('success.createSuccess'));

        // Refresh the entire list for new servers
        reloadCurrentPage();
      }

      // Clear editing state; the wizard page navigates back below.
      setEditingServer(null);
      if (isWizardCreate || isWizardEdit) {
        navigate('/agents/custom-mcp-servers');
      }
    } catch (error) {
      console.error('Error saving Custom MCP server:', error);
      toast.error(editingServer ? t('errors.updateError') : t('errors.saveError'));
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
      setDetailsServer(null);
    }
  };

  const isNarrowed = state.searchQuery.trim().length > 0 || countSelectedFacets(facets) > 0;

  if (isWizardOpen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 animate-slideInFromRight">
          <CustomMCPServerWizardModal
            embedded
            open={isWizardOpen}
            loading={state.loading.create || state.loading.update}
            server={isWizardEdit ? editingServer || undefined : undefined}
            onOpenChange={open => {
              if (!open) navigate('/agents/custom-mcp-servers');
            }}
            onSubmit={handleServerFormSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <AgentsTabsLayout tab="customMcpServers">
    <div className="flex h-full flex-col px-[34px] pb-5" data-tour="agents-custom-mcps-page">
      <AgentsCustomMCPsTour />
      <div className="mt-6" data-tour="agents-custom-mcps-header">
        <CustomMCPServersHeader
          hideTitle
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedServerIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewServer={handleCreateServer}
          onFilter={() => setFilterPanelOpen(open => !open)}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedServerIds: [] }))}
          filterCount={countSelectedFacets(facets)}
          showFilters={true}
          filterPanel={
            <CustomMCPServersFilterPanel
              open={filterPanelOpen}
              onClose={closeFilterPanel}
              selection={facets}
              onSelectionChange={applyFacets}
              onClear={() => applyFacets(EMPTY_CUSTOM_MCP_SERVER_FACETS)}
              options={facetOptions}
            />
          }
        />
      </div>

      {/* Content */}
      <div className="mt-5 flex-1 overflow-auto" data-tour="agents-custom-mcps-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.servers')}</div>
          </div>
        ) : state.servers.length === 0 && !isNarrowed ? (
          <EmptyState
            icon={TestTube}
            title={t('emptyState.title')}
            description={t('emptyState.description')}
            action={{
              label: t('emptyState.action'),
              onClick: handleCreateServer,
            }}
            className="h-full"
          />
        ) : (
          <CustomMCPServersTable
            servers={state.servers}
            selectedServers={state.servers.filter(server =>
              state.selectedServerIds.includes(server.id),
            )}
            loading={state.loading.list}
            onSelectionChange={servers =>
              setState(prev => ({
                ...prev,
                selectedServerIds: servers.map(s => s.id),
              }))
            }
            onServerClick={handleServerClick}
            onEditServer={handleEditServer}
            onDeleteServer={handleDeleteServer}
            onTestServer={handleTestServer}
            onCreateServer={handleCreateServer}
            testingServerId={testingServer}
            emptyMessage={isNarrowed ? t('table.noResults') : undefined}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <CustomMCPServersPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={state.loading.list}
        />
      )}

      {/* Delete Server Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: serverToDelete?.name })}
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
              onClick={confirmDeleteServer}
              disabled={state.loading.delete}
            >
              {state.loading.delete ? t('loading.deleting') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={open => {
          if (!isBulkDeleting) setBulkDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulkDeleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('bulkDeleteDialog.description', { count: state.selectedServerIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
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

      {/* Server Details Modal */}
      <CustomMCPServerDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        server={detailsServer}
        onEdit={server => {
          setDetailsModalOpen(false);
          handleEditServer(server);
        }}
        onTest={server => {
          setDetailsModalOpen(false);
          handleTestServer(server);
        }}
        isTestLoading={testingServer === detailsServer?.id}
      />

      <CustomMCPServerTestDialog
        open={!!testDialogServer}
        onOpenChange={open => {
          if (!open) closeTestDialog();
        }}
        server={testDialogServer}
        outcome={testOutcome}
      />
    </div>
    </AgentsTabsLayout>
  );
}
