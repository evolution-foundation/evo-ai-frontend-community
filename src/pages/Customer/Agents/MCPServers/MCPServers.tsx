import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { Grid3X3, List, Server } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { MCPServer, MCPServersState, MCPServersListParams } from '@/types/ai';
import { MCPServerCard } from '@/components/mcpServers';

import MCPServersHeader from '@/components/mcpServers/MCPServersHeader';
import MCPServersTable from '@/components/mcpServers/MCPServersTable';
import MCPServersPagination from '@/components/mcpServers/MCPServersPagination';
import MCPServerDetails from '@/components/mcpServers/MCPServerDetails';
import { listMCPServers } from '@/services/agents/mcpServerService';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: MCPServersState = {
  servers: [],
  selectedServerIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
  },
  filters: [],
  searchQuery: '',
};

export default function MCPServers() {
  const { t } = useLanguage('customerMcpServers');
  const { can } = usePermissions();
  const [state, setState] = useState<MCPServersState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsServer, setDetailsServer] = useState<MCPServer | null>(null);

  // Load servers
  const loadServers = useCallback(
    async (params?: Partial<MCPServersListParams>) => {
      if (!can('ai_mcp_servers', 'read')) {
        toast.error(t('errors.permissionDenied'));
        return;
      }
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: MCPServersListParams = {
          skip: 0,
          limit: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const response = await listMCPServers(requestParams);

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
        console.error('Error loading MCP servers:', error);
        toast.error(t('errors.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  usePermissionGatedLoad({
    resource: 'ai_mcp_servers',
    load: loadServers,
    onDenied: () => toast.error(t('errors.permissionDenied')),
  });

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    loadServers({ skip: 0, search: query });
  };

  const handleServerClick = (server: MCPServer) => {
    setDetailsServer(server);
    setDetailsModalOpen(true);
  };



  const handlePageChange = (page: number) => {
    const skip = (page - 1) * state.meta.pagination.page_size;
    setState(prev => ({ ...prev, meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } } }));
    loadServers({ skip });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: pageSize, page: 1 } },
    }));
    loadServers({ skip: 0, limit: pageSize });
  };

  const selectedServers = state.servers.filter(server => 
    state.selectedServerIds.includes(server.id)
  );

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <MCPServersHeader
        totalCount={state.meta.pagination.total}
        selectedCount={state.selectedServerIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onClearSelection={() => setState(prev => ({ ...prev, selectedServerIds: [] }))}
      />

      {/* View Toggle */}
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
            <div className="text-muted-foreground">{t('loading.servers')}</div>
          </div>
        ) : state.servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title={t('emptyState.title')}
            description={t('emptyState.description')}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.servers.map(server => (
              <MCPServerCard
                key={server.id}
                server={server}
                onClick={() => handleServerClick(server)}
              />
            ))}
          </div>
        ) : (
          <MCPServersTable
            servers={state.servers}
            selectedServers={selectedServers}
            loading={state.loading.list}
            onSelectionChange={(servers) =>
              setState(prev => ({
                ...prev,
                selectedServerIds: servers.map(s => s.id),
              }))
            }
            onServerClick={handleServerClick}
          />
        )}
      </div>

      {/* Pagination */}
      {state.servers.length > 0 && (
        <MCPServersPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePageSizeChange}
        />
      )}

      {/* Server Details Modal */}
      <MCPServerDetails
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        server={detailsServer}
      />

    </div>
  );
}