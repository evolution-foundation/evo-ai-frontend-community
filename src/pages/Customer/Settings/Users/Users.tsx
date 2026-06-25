import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsAgentsTour } from '@/tours';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { Grid3X3, List, Users as UsersIcon } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users';
import { User, UsersListParams, UsersState, USER_FILTER_TYPES } from '@/types/users';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import { BaseFilter } from '@/types/core';
import { AppliedFilter } from '@/types/core';

import {
  UserCard,
  UsersHeader,
  UsersTable,
  UsersPagination,
  UserFormModal,
  BulkInviteModal,
  UsersFilter,
  UserDetails,
} from '@/components/users';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: UsersState = {
  users: [],
  selectedUserIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      total_pages: 0,
      has_next_page: false,
      has_previous_page: false,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    bulk: false,
  },
  filters: [],
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Users() {
  const { t } = useLanguage('users');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const { currentUser } = useAuthStore();
  const [state, setState] = useState<UsersState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const currentUserId = currentUser?.id?.toString() || '';
  const hasLoaded = useRef(false);

  // Load users
  const loadUsers = useCallback(
    async (params?: Partial<UsersListParams>) => {
      if (!can('users', 'read')) {
        toast.error(t('messages.permissionDenied.read'));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: UsersListParams = {
          page: 1,
          per_page: DEFAULT_PAGE_SIZE,
          sort: 'name' as any,
          order: 'asc',
          ...params,
        };

        // Adicionar filtros aos parâmetros se existirem
        if (activeFilters.length > 0) {
          const filterParams = activeFilters.reduce((acc, filter, index) => {
            const prefix = `filters[${index}]`;
            acc[`${prefix}[attribute_key]`] = filter.attributeKey;
            acc[`${prefix}[filter_operator]`] = filter.filterOperator;
            acc[`${prefix}[values]`] = Array.isArray(filter.values)
              ? filter.values.join(',')
              : filter.values.toString();
            if (index > 0) {
              acc[`${prefix}[query_operator]`] = filter.queryOperator;
            }
            return acc;
          }, {} as Record<string, any>);

          Object.assign(requestParams, filterParams);
        }

        const response = await usersService.getUsers(requestParams);

        setState(prev => ({
          ...prev,
          users: response.data || [],
          meta: {
            pagination: response.meta.pagination
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [activeFilters, can, t],
  );

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

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

    // Reload with new search
    loadUsers({ page: 1, q: query || undefined });
  };

  // Funções para o sistema de filtros
  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, USER_FILTER_TYPES, t, handleRemoveFilter);

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
      await loadUsers({ page: 1 });
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(t('messages.filterError'));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadUsers({ page: 1 });
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

    loadUsers({ page });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
    }));

    loadUsers({ page: 1, per_page: perPage });
  };

  const handleCreateUser = () => {
    if (!can('users', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    if (!can('users', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (!can('users', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleBulkInvite = () => {
    if (!can('users', 'create')) {
      toast.error(t('messages.permissionDenied.invite'));
      return;
    }
    setBulkInviteModalOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('users', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const canDeleteUser = (user: User) => {
    // Não pode deletar a si mesmo
    if (user.id === currentUserId) return false;

    // Não pode deletar o último administrador
    const admins = state.users.filter(u => u.role?.key === 'administrator');
    if (user.role?.key === 'administrator' && admins.length === 1) {
      return false;
    }

    return true;
  };

  // const handleAvailabilityChange = async (userId: string, availability: 'online' | 'busy' | 'offline') => {
  //   const updatedUser = await updateAvailability(userId, availability);
  //   if (updatedUser) {
  //     setState(prev => ({
  //       ...prev,
  //       users: prev.users.map(user =>
  //         user.id === userId ? { ...user, availability_status: availability } : user
  //       )
  //     }));
  //     toast.success('Status de disponibilidade atualizado');
  //   }
  // };

  // Confirm delete single user
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await usersService.deleteUser(userToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadUsers();

      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedUserIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete users one by one (assuming no bulk delete endpoint)
      for (const userId of state.selectedUserIds) {
        await usersService.deleteUser(userId);
      }

      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedUserIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedUserIds: [] }));
      loadUsers();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle user form submission
  const handleUserFormSubmit = async () => {
    // Close modal and refresh
    setUserModalOpen(false);
    setEditingUser(null);
    loadUsers();
  };

  const handleBulkInviteSuccess = () => {
    setBulkInviteModalOpen(false);
    loadUsers();
  };

  // Handle modal close
  // const handleUserModalClose = (open: boolean) => {
  //   if (!open) {
  //     setUserModalOpen(false);
  //     setEditingUser(null);
  //   }
  // };

  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsUser(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-agents-page">
      <SettingsAgentsTour />
      <div data-tour="settings-agents-header">
        <UsersHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedUserIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewUser={handleCreateUser}
          onBulkInvite={handleBulkInvite}
          onFilter={handleOpenFilter}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedUserIds: [] }))}
          activeFilters={appliedFilters}
          showFilters={true}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-3" data-tour="settings-agents-view-toggle">
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
      <div className="flex-1 overflow-auto" data-tour="settings-agents-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : state.users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.action'),
              onClick: handleCreateUser,
            }}
            className="h-full"
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                canDelete={canDeleteUser(user)}
              />
            ))}
          </div>
        ) : (
          <UsersTable
            users={state.users}
            selectedUsers={state.users.filter(user => state.selectedUserIds.includes(user.id))}
            loading={state.loading.list}
            onSelectionChange={users =>
              setState(prev => ({
                ...prev,
                selectedUserIds: users.map(u => u.id),
              }))
            }
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onCreateUser={handleCreateUser}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
              loadUsers({ sort: column as any, order: newOrder });
            }}
            getRowKey={(user: User) => user.id.toString()}
            canDeleteUser={canDeleteUser}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <div className="mt-auto pt-4 border-t border-sidebar-border" data-tour="settings-agents-pagination">
          <UsersPagination
            currentPage={state.meta.pagination.page}
            totalPages={state.meta.pagination.total_pages}
            totalCount={state.meta.pagination.total}
            perPage={state.meta.pagination.page_size}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            loading={state.loading.list}
          />
        </div>
      )}

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { name: userToDelete?.name })}
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
              onClick={confirmDeleteUser}
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
              {t('dialog.bulkDelete.description', { count: state.selectedUserIds.length })}
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
              {state.loading.bulk
                ? t('dialog.bulkDelete.deleting')
                : t('dialog.bulkDelete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Modal */}
      <UserFormModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={editingUser}
        onSuccess={handleUserFormSubmit}
      />

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        isOpen={bulkInviteModalOpen}
        onClose={() => setBulkInviteModalOpen(false)}
        onSuccess={handleBulkInviteSuccess}
      />

      {/* Users Filter Modal */}
      <UsersFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={activeFilters}
        onFiltersChange={setActiveFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* User Details Modal */}
      <UserDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        user={detailsUser}
        onEdit={user => {
          setDetailsModalOpen(false);
          setEditingUser(user);
          setUserModalOpen(true);
        }}
        canDelete={canDeleteUser}
      />
    </div>
  );
}
