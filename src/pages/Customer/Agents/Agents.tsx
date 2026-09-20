import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@evoapi/design-system';
import { AgentsTable, AgentsHeader, AgentsPagination, AgentWizardModal, AgentsFilterPanel, AgentsTabsLayout } from '@/components/agents';
import {
  EMPTY_AGENT_FACETS,
  AgentFacetSelection,
  buildAgentFilterParams,
  countSelectedFacets,
  mergeModelOptions,
} from '@/components/agents/agentsFilterFacets';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { getAccessibleAgents, deleteAgent } from '@/services/agents';
import { Agent } from '@/types/agents';
import { useLanguage } from '@/hooks/useLanguage';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import { AgentsTour } from '@/tours';
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
  const { can, isReady: permissionsReady, loading: permissionsLoading } = usePermissions();
  useDarkMode();

  const [state, setState] = useState<AgentsState>(INITIAL_STATE);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // Type/Model facets are applied SERVER-side, over the whole base — filtering only the
  // loaded page would report "3 external agents" when there are 40 (EVO-2231, AC 11).
  const [facets, setFacets] = useState<AgentFacetSelection>(EMPTY_AGENT_FACETS);
  // There is no facet endpoint, so the options are what the loaded pages revealed. They
  // accumulate: narrowing by Tipo must not make the Modelo you picked disappear.
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const loadingRef = useRef(false);
  const loadAgentsRef = useRef<
    | ((
        params?: { page?: number; per_page?: number },
        facetsOverride?: AgentFacetSelection,
      ) => Promise<void>)
    | null
  >(null);
  // Last facets the user asked for. `loadAgents` bails while a request is in flight, so
  // without this a checkbox toggled mid-request would stay checked over unfiltered rows.
  const pendingFacetsRef = useRef<AgentFacetSelection>(EMPTY_AGENT_FACETS);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const isWizardOpen = location.pathname === '/agents/new';

  const loadAgents = useCallback(
    async (
      params?: { page?: number; per_page?: number },
      facetsOverride?: AgentFacetSelection,
    ) => {
      if (loadingRef.current || permissionsLoading || !permissionsReady) {
        return;
      }

      // No toast: `AgentsTabsLayout` is already redirecting whoever lacks `read`, and it
      // owns the no-access message.
      if (!can('ai_agents', 'read')) {
        return;
      }

      const requestedFacets = facetsOverride ?? facets;
      loadingRef.current = true;
      setState(prev => ({ ...prev, loading: true }));

      try {
        const currentPage = params?.page ?? 1;
        const currentPageSize = params?.per_page ?? 24;

        const filterParams = buildAgentFilterParams(requestedFacets);
        const response = await getAccessibleAgents(currentPage, currentPageSize, { filterParams });

        const total = response.meta?.pagination?.total || 0;
        const pageSize = response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE;

        const agentsData: Agent[] = Array.isArray(response.data)
          ? (response.data.length > 0 && Array.isArray(response.data[0])
              ? (response.data as unknown as Agent[][]).flat()
              : (response.data as unknown as Agent[]))
          : [];

        setModelOptions(known => mergeModelOptions(known, agentsData));

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
        if (pendingFacetsRef.current !== requestedFacets) {
          loadAgentsRef.current?.({ page: 1 }, pendingFacetsRef.current);
        }
      }
    },
    [permissionsReady, permissionsLoading, can, t, facets],
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
    if (!can('ai_agents', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    if (state.selectedAgents.length === 0) {
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const selected = state.selectedAgents;
    if (selected.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(selected.map(agent => deleteAgent(agent.id)));
      const rejected = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      const failed = rejected.length;
      const deleted = selected.length - failed;

      if (failed > 0) {
        // The toast only carries a count: without this the reason each delete failed is
        // lost, and a partial failure leaves nothing to debug.
        console.error(
          'Erro ao deletar agentes em massa:',
          rejected.map(result => result.reason),
        );
        toast.error(t('bulkDeleteDialog.partialError', { failed, total: selected.length }));
      } else {
        toast.success(t('bulkDeleteDialog.success', { count: deleted }));
      }

      // Refetch instead of local math: after a partial failure the local list is a guess,
      // and the current page may no longer exist once rows are gone.
      const { total, page_size, page } = state.meta.pagination;
      const remainingPages = Math.max(1, Math.ceil(Math.max(0, total - deleted) / page_size));
      setState(prev => ({ ...prev, selectedAgents: [] }));
      setBulkDeleteDialogOpen(false);
      // per_page must travel along: loadAgents defaults to 24, which would desync the
      // target page computed from the user's current page size.
      await loadAgents({ page: Math.min(page, remainingPages), per_page: page_size });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // A facet change is a refetch from page 1: staying on page 5 would ask for a page the
  // narrowed result set no longer has.
  const applyFacets = (next: AgentFacetSelection) => {
    pendingFacetsRef.current = next;
    setFacets(next);
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page: 1 },
      },
      selectedAgents: [],
    }));
    loadAgents({ page: 1 }, next);
  };

  // Dropping the selection is the honest move: keeping rows the user can no longer see
  // counted in "N selecionados" hides what a bulk action would hit.
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setState(prev => (prev.selectedAgents.length > 0 ? { ...prev, selectedAgents: [] } : prev));
  };

  // Search stays client-side over the loaded page, as it always was on this screen.
  const filteredAgents = state.agents.filter(
    agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isNarrowed = searchTerm.trim().length > 0 || countSelectedFacets(facets) > 0;

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
        <AgentsTabsLayout tab="agents">
        <div className="animate-fadeIn h-full flex flex-col">
          <AgentsTour />
          <div className="flex-1 px-[34px] pb-5">
            <div className="mt-6" data-tour="agents-header">
            <AgentsHeader
              hideTitle
              totalCount={state.meta.pagination.total}
              selectedCount={state.selectedAgents.length}
              searchValue={searchTerm}
              onSearchChange={handleSearchChange}
              onNewAgent={handleCreateAgent}
              onManageApiKeys={() => setIsApiKeysModalOpen(true)}
              onBulkDelete={handleBulkDelete}
              onClearSelection={() => setState(prev => ({ ...prev, selectedAgents: [] }))}
              onFilter={() => setFilterPanelOpen(open => !open)}
              filterCount={countSelectedFacets(facets)}
              showFilters={true}
              filterPanel={
                <AgentsFilterPanel
                  open={filterPanelOpen}
                  onClose={() => setFilterPanelOpen(false)}
                  selection={facets}
                  onSelectionChange={applyFacets}
                  onClear={() => applyFacets(EMPTY_AGENT_FACETS)}
                  modelOptions={modelOptions}
                />
              }
            />
            </div>

            <div className="mt-5" data-tour="agents-list">
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
              emptyMessage={isNarrowed ? t('table.noResults') : undefined}
            />
            </div>
          </div>

          <div className="px-[34px] pb-5">
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
        </AgentsTabsLayout>
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
              {t('bulkDeleteDialog.description', { count: state.selectedAgents.length })}
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
    </div>
  );
};

export default Agentes;
