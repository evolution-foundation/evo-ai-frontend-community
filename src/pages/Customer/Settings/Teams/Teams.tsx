import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsTeamsTour } from '@/tours';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button } from '@evoapi/design-system';
import { Grid3X3, List, Users } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { useNavigate } from 'react-router-dom';

import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import TeamsService from '@/services/teams/teamsService';
import {
  Team,
  TeamsState,
  TeamsListParams,
  TeamFormData,
} from '@/types/users';

import {
  TeamCard,
  TeamsHeader,
  TeamsTable,
  TeamsPagination,
  TeamModal,
  TeamDetails,
} from '@/components/teams';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: TeamsState = {
  teams: [],
  selectedTeamIds: [],
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
    import: false,
    export: false,
    bulk: false,
  },
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Teams() {
  const { t } = useLanguage('teams');
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [state, setState] = useState<TeamsState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null);

  // Load teams
  const loadTeams = useCallback(
    async (params?: Partial<TeamsListParams>) => {
      if (!can('teams', 'read')) {
        toast.error(t('messages.permissionDenied.read'));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: TeamsListParams = {
          page: 1,
          per_page: DEFAULT_PAGE_SIZE,
          sort: 'name',
          order: 'asc',
          ...params,
        };

        const response = await TeamsService.getTeams(requestParams);

        // Handle array response vs paginated response
        if (Array.isArray(response)) {
          setState(prev => ({
            ...prev,
            teams: response,
            meta: {
              pagination: {
                page: 1,
                page_size: response.length,
                total: response.length,
                total_pages: 1,
              },
            },
            loading: { ...prev.loading, list: false },
          }));
        } else {
          setState(prev => ({
            ...prev,
            teams: response.data || [],
            meta: {
              pagination: {
                page: response.meta.pagination?.page || 1,
                page_size: response.meta.pagination?.page_size || DEFAULT_PAGE_SIZE,
                total: response.meta.pagination?.total || 0,
                total_pages: response.meta.pagination?.total_pages || 0,
              },
            },
            loading: { ...prev.loading, list: false },
          }));
        }
      } catch (error) {
        console.error('Error loading teams:', error);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  usePermissionGatedLoad({
    resource: 'teams',
    load: loadTeams,
    onDenied: () => toast.error(t('messages.permissionDenied.read')),
  });

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    // Reload with new search
    loadTeams({ page: 1, q: query || undefined });
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));

    loadTeams({ page });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));

    loadTeams({ page: 1, per_page: perPage });
  };

  // Team actions
  const handleTeamClick = (team: Team) => {
    setDetailsTeam(team);
    setDetailsModalOpen(true);
  };

  const handleCreateTeam = () => {
    if (!can('teams', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditingTeam(null);
    setTeamModalOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    if (!can('teams', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingTeam(team);
    setTeamModalOpen(true);
  };

  const handleDeleteTeam = (team: Team) => {
    if (!can('teams', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const handleManageUsers = (team: Team) => {
    navigate(`/settings/teams/${team.id}/add-users`);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('teams', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  // Import/Export placeholders
  const handleImportTeams = () => {
    toast.info(t('messages.importInfo'));
  };

  const handleExportTeams = () => {
    toast.info(t('messages.exportInfo'));
  };

  const handleFilterTeams = () => {
    toast.info(t('messages.filterInfo'));
  };

  // Confirm delete single team
  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await TeamsService.deleteTeam(teamToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadTeams();

      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedTeamIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete teams one by one (no bulk API yet)
      for (const teamId of state.selectedTeamIds) {
        await TeamsService.deleteTeam(teamId);
      }

      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedTeamIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedTeamIds: [] }));
      loadTeams();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting teams:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle team form submission
  const handleTeamFormSubmit = async (data: TeamFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingTeam ? 'update' : 'create']: true },
    }));

    try {
      if (editingTeam) {
        // Update existing team
        await TeamsService.updateTeam(editingTeam.id, data);
        toast.success(t('messages.updateSuccess'));
      } else {
        // Create new team
        await TeamsService.createTeam(data);
        toast.success(t('messages.createSuccess'));
      }

      // Refresh the list
      loadTeams();

      // Close modal and clear editing state
      setTeamModalOpen(false);
      setEditingTeam(null);
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error(editingTeam ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleTeamModalClose = (open: boolean) => {
    if (!open) {
      setTeamModalOpen(false);
      setEditingTeam(null);
    }
  };

  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsTeam(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-teams-page">
      <SettingsTeamsTour />
      <div data-tour="settings-teams-header">
        <TeamsHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedTeamIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewTeam={handleCreateTeam}
          onImport={handleImportTeams}
          onExport={handleExportTeams}
          onFilter={handleFilterTeams}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedTeamIds: [] }))}
          activeFilters={[]}
          showFilters={false}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-3" data-tour="settings-teams-view-toggle">
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
      <div className="flex-1 overflow-auto" data-tour="settings-teams-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : state.teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.action'),
              onClick: handleCreateTeam
            }}
            className="h-full"
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.teams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                onManageUsers={handleManageUsers}
                onEdit={handleEditTeam}
                onDelete={handleDeleteTeam}
              />
            ))}
          </div>
        ) : (
          <TeamsTable
            teams={state.teams}
            selectedTeams={state.teams.filter(team =>
              state.selectedTeamIds.includes(team.id),
            )}
            loading={state.loading.list}
            onSelectionChange={teams =>
              setState(prev => ({
                ...prev,
                selectedTeamIds: teams.map(t => t.id),
              }))
            }
            onTeamClick={handleTeamClick}
            onManageUsers={handleManageUsers}
            onEditTeam={handleEditTeam}
            onDeleteTeam={handleDeleteTeam}
            onCreateTeam={handleCreateTeam}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
              loadTeams({ sort: column as 'name' | 'created_at' | 'updated_at', order: newOrder });
            }}
            getRowKey={(team: Team) => team.id.toString()}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <TeamsPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={state.loading.list}
        />
      )}

      {/* Delete Team Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { name: teamToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={state.loading.delete}
            >
              {t('dialog.delete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTeam}
              disabled={state.loading.delete}
            >
              {state.loading.delete ? t('dialog.delete.deleting') : t('dialog.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.bulkDelete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.bulkDelete.description', { count: state.selectedTeamIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={state.loading.bulk}
            >
              {t('dialog.bulkDelete.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={state.loading.bulk}>
              {state.loading.bulk ? t('dialog.bulkDelete.deleting') : t('dialog.bulkDelete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Modal */}
      <TeamModal
        open={teamModalOpen}
        onOpenChange={handleTeamModalClose}
        team={editingTeam || undefined}
        isNew={!editingTeam}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleTeamFormSubmit}
      />

      {/* Team Details Modal */}
      <TeamDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        team={detailsTeam}
        onEdit={team => {
          setDetailsModalOpen(false);
          setEditingTeam(team);
          setTeamModalOpen(true);
        }}
        onManageUsers={team => {
          setDetailsModalOpen(false);
          handleManageUsers(team);
        }}
      />
    </div>
  );
}
