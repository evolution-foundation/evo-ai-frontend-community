import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
import { Grid3X3, List, TestTube } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import {
  CustomMcpServer,
  CustomMcpServersState,
  ListCustomMcpServersParams,
  CustomMcpServerFormData,
} from '@/types/ai';
import { BaseFilter, AppliedFilter, CUSTOM_MCP_SERVER_FILTER_TYPES } from '@/types/core';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import { CustomMCPServerCard } from '@/components/customMcpServers';

import CustomMCPServersHeader from '@/components/customMcpServers/CustomMCPServersHeader';
import CustomMCPServersTable from '@/components/customMcpServers/CustomMCPServersTable';
import CustomMCPServersPagination from '@/components/customMcpServers/CustomMCPServersPagination';
import CustomMCPServerModal from '@/components/customMcpServers/CustomMCPServerModal';
import CustomMCPServerDetails from '@/components/customMcpServers/CustomMCPServerDetails';
import CustomMCPServersFilter from '@/components/customMcpServers/CustomMCPServersFilter';
import {
  listCustomMcpServers,
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
  const { can, isReady: permissionsReady } = useUserPermissions();
  const { t } = useLanguage('customMcpServers');
  const [state, setState] = useState<CustomMcpServersState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<CustomMcpServer | null>(null);

  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<CustomMcpServer | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsServer, setDetailsServer] = useState<CustomMcpServer | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  // Load servers
  const loadServers = useCallback(
    async (params?: Partial<ListCustomMcpServersParams>) => {
      if (!can('ai_custom_mcp_servers', 'read')) {
        toast.error(t('permissions.viewDenied'));
        return;
      }
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: ListCustomMcpServersParams = {
          skip: 0,
          limit: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const response = await listCustomMcpServers(requestParams);

        setState(prev => ({
          ...prev,
          servers: response,
          meta: {
            pagination: {
              page: Math.floor((requestParams.skip || 0) / (requestParams.limit || DEFAULT_PAGE_SIZE)) + 1,
              page_size: requestParams.limit || DEFAULT_PAGE_SIZE,
              total: response.length,
              total_pages: Math.ceil(response.length / (requestParams.limit || DEFAULT_PAGE_SIZE)),
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading Custom MCP servers:', error);
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
      loadServers();
    }
  }, [permissionsReady, loadServers]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    // TODO: Implement search functionality
    loadServers({ skip: 0, search: query });
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, CUSTOM_MCP_SERVER_FILTER_TYPES, t, handleRemoveFilter);

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
      await loadServers({ skip: 0 });
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(t('errors.applyFiltersError'));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadServers({ skip: 0 });
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
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));

    const skip = (page - 1) * state.meta.pagination.page_size;
    loadServers({ skip });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));

    loadServers({ skip: 0, limit: perPage });
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
    setServerModalOpen(true);
  };

  const handleEditServer = (server: CustomMcpServer) => {
    if (!can('ai_custom_mcp_servers', 'update')) {
      toast.error(t('permissions.editDenied'));
      return;
    }
    setEditingServer(server);
    setServerModalOpen(true);
  };

  const handleDeleteServer = (server: CustomMcpServer) => {
    if (!can('ai_custom_mcp_servers', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleTestServer = async (server: CustomMcpServer) => {
    setTestingServer(server.id);
    setState(prev => ({ ...prev, loading: { ...prev.loading, test: true } }));

    try {
      const result = await testCustomMcpServer(server.id);
      if (result.test_result.success) {
        toast.success(t('success.testSuccess', { count: result.server.tools.length || 0 }));
        // Update server with latest tools
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(s =>
            s.id === server.id ? (result.server as CustomMcpServer) : s,
          ),
        }));
      } else {
        toast.error(
          t('test.failed', { error: result.test_result.error || t('test.unknownError') }),
        );
      }
    } catch (error) {
      console.error('Error testing Custom MCP server:', error);
      toast.error(t('errors.testError'));
    } finally {
      setTestingServer(null);
      setState(prev => ({ ...prev, loading: { ...prev.loading, test: false } }));
    }
  };

  // Confirm delete single server
  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await deleteCustomMcpServer(serverToDelete.id);
      toast.success(t('success.deleteSuccess'));

      // Refresh the list
      loadServers();

      setDeleteDialogOpen(false);
      setServerToDelete(null);
    } catch (error) {
      console.error('Error deleting Custom MCP server:', error);
      toast.error(t('errors.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
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
        loadServers();
      }

      // Close modal and clear editing state
      setServerModalOpen(false);
      setEditingServer(null);
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

  // Handle modal close
  const handleServerModalClose = (open: boolean) => {
    if (!open) {
      setServerModalOpen(false);
      setEditingServer(null);
    }
  };

  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsServer(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="agents-custom-mcps-page">
      <AgentsCustomMCPsTour />
      <div data-tour="agents-custom-mcps-header">
        <CustomMCPServersHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedServerIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewServer={handleCreateServer}
          onFilter={handleOpenFilter}
          onClearSelection={() => setState(prev => ({ ...prev, selectedServerIds: [] }))}
          activeFilters={appliedFilters}
          showFilters={true}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-3" data-tour="agents-custom-mcps-view-toggle">
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
      <div className="flex-1 overflow-auto" data-tour="agents-custom-mcps-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.servers')}</div>
          </div>
        ) : state.servers.length === 0 ? (
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
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.servers.map(server => (
              <CustomMCPServerCard
                key={server.id}
                server={server}
                onEdit={handleEditServer}
                onDelete={handleDeleteServer}
                onTest={handleTestServer}
                onClick={handleServerClick}
                isTestLoading={testingServer === server.id}
              />
            ))}
          </div>
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

      {/* Server Modal */}
      <CustomMCPServerModal
        open={serverModalOpen}
        onOpenChange={handleServerModalClose}
        server={editingServer || undefined}
        mode={!editingServer ? 'create' : 'edit'}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleServerFormSubmit}
      />

      {/* Server Details Modal */}
      <CustomMCPServerDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        server={detailsServer}
        onEdit={server => {
          setDetailsModalOpen(false);
          setEditingServer(server);
          setServerModalOpen(true);
        }}
        onTest={handleTestServer}
        isTestLoading={testingServer === detailsServer?.id}
      />

      {/* Servers Filter Modal */}
      <CustomMCPServersFilter
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
