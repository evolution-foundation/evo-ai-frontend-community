import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@evoapi/design-system';
import { AgentsTable, AgentsHeader, AgentsPagination, AgentCard as AgentCardItem, AgentWizardModal, AgentsFilter } from '@/components/agents';
import { EmptyState } from '@/components/base';
import { Bot, Search, Grid3X3, List } from 'lucide-react';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { getAccessibleAgents, deleteAgent } from '@/services/agents';
import { Agent, AGENT_FILTER_TYPES } from '@/types/agents';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import type { BaseFilter, AppliedFilter } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import { AgentsTour } from '@/tours';
import { exportAsJson, generateExportFilename } from '@/utils/exportUtils';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { PaginationMeta } from '@/types/core';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

interface AgentsState {
  agents: Agent[];
  selectedAgents: Agent[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: boolean;
}

const INITIAL_STATE: AgentsState = {
  agents: [],
  selectedAgents: [],
  meta: {
    pagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  },
  loading: false,
};

const Agentes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage('agents');
  const { can, isReady: permissionsReady, loading: permissionsLoading } = useUserPermissions();
  useDarkMode();

  const [state, setState] = useState<AgentsState>(INITIAL_STATE);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  // EVO-1952: ref synced to activeFilters so the applied-chip "x" removes against
  // the current list, not the stale snapshot captured when the chips were built.
  const activeFiltersRef = useRef<BaseFilter[]>([]);
  activeFiltersRef.current = activeFilters;

  const loadingRef = useRef(false);
  const loadAgentsRef = useRef<((params?: { page?: number; per_page?: number }) => Promise<void>) | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isWizardOpen = location.pathname === '/agents/new';

  const loadAgents = useCallback(
    async (params?: { page?: number; per_page?: number }, filtersOverride?: BaseFilter[]) => {
      if (loadingRef.current || permissionsLoading || !permissionsReady) {
        return;
      }

      if (!can('ai_agents', 'read')) {
        toast.error(t('permissions.viewDenied'));
        return;
      }

      loadingRef.current = true;
      setState(prev => ({ ...prev, loading: true }));

      try {
        const currentPage = params?.page ?? 1;
        const currentPageSize = params?.per_page ?? 24;

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

        const response = await getAccessibleAgents(currentPage, currentPageSize, { filterParams });

        const total = response.meta?.pagination?.total || 0;
        const pageSize = response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE;

        const agentsData: Agent[] = Array.isArray(response.data)
          ? (response.data.length > 0 && Array.isArray(response.data[0])
              ? (response.data as unknown as Agent[][]).flat()
              : (response.data as unknown as Agent[]))
          : [];

        setState(prev => ({
          ...prev,
          agents: agentsData,
          meta: {
            pagination: {
              page: response.meta?.pagination?.page || currentPage,
              page_size: pageSize,
              total,
              total_pages: response.meta?.pagination?.total_pages || Math.ceil(total / pageSize),
              has_next_page: response.meta?.pagination?.has_next_page,
              has_previous_page: response.meta?.pagination?.has_previous_page,
            },
          },
          loading: false,
        }));
      } catch (error) {
        console.error('Erro ao carregar agentes:', error);
        toast.error(t('loadError'));
        setState(prev => ({ ...prev, loading: false }));
      } finally {
        loadingRef.current = false;
      }
    },
    [permissionsReady, permissionsLoading, can, t, activeFilters],
  );

  useEffect(() => {
    loadAgentsRef.current = loadAgents;
  }, [loadAgents]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (loadAgentsRef.current) {
      loadAgentsRef.current();
    }
  }, [permissionsReady, permissionsLoading]);

  const handleExportAllAgents = () => {
    try {
      const filename = generateExportFilename('agents-export');
      const result = exportAsJson({ agents: state.agents }, filename, true);

      if (result) {
        toast.success(t('export.success'), {
          description: t('export.successDesc', { count: state.agents.length }),
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Erro ao exportar agentes:', error);
      toast.error(t('export.error'), {
        description: t('export.errorDesc'),
      });
    }
  };

  const handleCreateAgent = () => {
    if (!can('ai_agents', 'create')) {
      toast.error(t('permissions.createDenied'));
      return;
    }
    navigate('/agents/new');
  };

  const handleEditAgent = (agentId: string) => {
    if (!can('ai_agents', 'update')) {
      toast.error(t('permissions.editDenied'));
      return;
    }
    navigate(`/agents/${agentId}/edit`);
  };

  const handleDeleteAgent = (agent: Agent) => {
    if (!can('ai_agents', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      setIsDeleting(true);
      await deleteAgent(agentToDelete.id);

      setState(prev => ({
        ...prev,
        agents: prev.agents.filter(a => a.id !== agentToDelete.id),
        meta: {
          ...prev.meta,
          pagination: {
            ...prev.meta.pagination,
            total: Math.max(0, prev.meta.pagination.total - 1),
            total_pages: Math.ceil(Math.max(0, prev.meta.pagination.total - 1) / prev.meta.pagination.page_size),
          },
        },
      }));

      toast.success(t('deleteDialog.success', { name: agentToDelete.name }));
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar agente:', error);
      toast.error(t('loadError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newOrder);
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page },
      },
      selectedAgents: [],
    }));

    loadAgents({ page });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
      selectedAgents: [],
    }));

    loadAgents({ page: 1, per_page: perPage });
  };

  const handleBulkDelete = () => {
    toast.info(t('bulkDelete'));
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, AGENT_FILTER_TYPES, t, handleRemoveFilter);

  const handleOpenFilter = () => setFilterModalOpen(true);

  const handleApplyFilters = (filters: BaseFilter[]) => {
    setActiveFilters(filters);
    setAppliedFilters(convertFiltersToApplied(filters));
    loadAgents({ page: 1 }, filters);
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadAgents({ page: 1 }, []);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFiltersRef.current.filter((_, i) => i !== index);
    if (newFilters.length === 0) {
      handleClearFilters();
    } else {
      handleApplyFilters(newFilters);
    }
  };

  const filteredAgents = state.agents.filter(
    agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {isWizardOpen ? (
        <div className="flex-1 min-h-0 animate-slideInFromRight">
          <AgentWizardModal
            embedded
            open={isWizardOpen}
            onOpenChange={(open) => {
              if (!open) {
                navigate('/agents/list');
              }
            }}
            onAgentCreated={() => {
              loadAgents();
            }}
          />
        </div>
      ) : (
        <div className="animate-fadeIn h-full flex flex-col">
          <AgentsTour />
          <div className="flex-1 space-y-6 p-6">
            <div data-tour="agents-header">
            <AgentsHeader
              totalCount={state.meta.pagination.total}
              selectedCount={state.selectedAgents.length}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onNewAgent={handleCreateAgent}
              onExport={handleExportAllAgents}
              onManageApiKeys={() => setIsApiKeysModalOpen(true)}
              onBulkDelete={handleBulkDelete}
              onClearSelection={() => setState(prev => ({ ...prev, selectedAgents: [] }))}
              onFilter={handleOpenFilter}
              activeFilters={appliedFilters}
              showFilters={true}
            />
            </div>

            <AgentsFilter
              open={filterModalOpen}
              onOpenChange={setFilterModalOpen}
              filters={activeFilters}
              onFiltersChange={setActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />

            <div className="flex items-center justify-end" data-tour="agents-view-toggle">
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

            <div data-tour="agents-list">
            {state.loading ? (
              <div className="flex items-center justify-center h-48">
                <Bot className="h-8 w-8 animate-pulse" />
              </div>
            ) : state.agents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title={t('emptyState.title')}
                description={t('emptyState.description')}
                action={{
                  label: t('createAgent'),
                  onClick: handleCreateAgent,
                }}
              />
            ) : filteredAgents.length === 0 ? (
              <EmptyState
                icon={Search}
                title={t('emptyState.noResults')}
                description={t('search.noResults')}
                action={{
                  label: t('search.clearSearch'),
                  onClick: () => setSearchTerm(''),
                  variant: 'outline',
                }}
              />
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAgents.map(agent => (
                  <AgentCardItem
                    key={agent.id}
                    agent={agent}
                    onEdit={() => handleEditAgent(agent.id)}
                    onDelete={handleDeleteAgent}
                    onExportAsJSON={() => {
                      toast.info(t('exportJSON'));
                    }}
                    onShare={() => {
                      toast.info(t('share'));
                    }}
                  />
                ))}
              </div>
            ) : (
              <AgentsTable
                agents={filteredAgents}
                selectedAgents={state.selectedAgents}
                loading={state.loading}
                onSelectionChange={agents => setState(prev => ({ ...prev, selectedAgents: agents }))}
                onEditAgent={agent => handleEditAgent(agent.id)}
                onDeleteAgent={handleDeleteAgent}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            )}
            </div>
          </div>

          <div className="p-6 pt-0">
            <AgentsPagination
              currentPage={state.meta.pagination.page}
              totalPages={state.meta.pagination.total_pages}
              totalCount={state.meta.pagination.total}
              perPage={state.meta.pagination.page_size}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
              loading={state.loading}
            />
          </div>
        </div>
      )}

      <ApiKeysModal open={isApiKeysModalOpen} onOpenChange={setIsApiKeysModalOpen} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: agentToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAgent} disabled={isDeleting}>
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agentes;
