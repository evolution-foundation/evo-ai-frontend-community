import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

import { usePermissions } from '@/contexts/PermissionsContext';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users';
import { rolesService } from '@/services/roles/rolesService';
import { User, UsersListParams, UsersState, USER_FILTER_TYPES } from '@/types/users';
import { buildAppliedFilterChips } from '@/utils/appliedFilterChips';
import { BaseFilter } from '@/types/core';
import { AppliedFilter, FilterType } from '@/types/core';

import {
  UserCard,
  UsersHeader,
  UsersTable,
  UsersPagination,
  UserFormModal,
  BulkInviteModal,
  UsersFilter,
  UserDetails,
  SetPasswordModal,
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
  const { can, isReady: permissionsReady } = usePermissions();
  const { currentUser } = useAuthStore();
  const [state, setState] = useState<UsersState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  // CRM-210
  const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false);
  const [userToSetPassword, setUserToSetPassword] = useState<User | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  // EVO-1947: the applied-filter chips are built at apply time and capture a
  // snapshot of handleRemoveFilter. This ref keeps the current filters reachable
  // so the chip "x" removes against the latest list, not a stale closure value.
  // Mirrored in an effect, never during render — a render can be discarded.
  const activeFiltersRef = useRef<BaseFilter[]>([]);
  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: string }[]>([]);
  const currentUserId = currentUser?.id?.toString() || '';
  const hasLoaded = useRef(false);
  // EVO-1947: the search term is the one request param every reload has to
  // carry — pagination, per-page and filter-apply all reload the list and none
  // of them know the term. A ref (not state) so those callbacks read the
  // current value instead of the one captured when they were last recreated.
  const searchQueryRef = useRef('');
  // Requests are fired per keystroke; without a sequence the response to "sil"
  // can land after the response to "silva" and repaint the older list.
  const requestSeqRef = useRef(0);

  // Load users
  const loadUsers = useCallback(
    async (params?: Partial<UsersListParams>, filtersOverride?: BaseFilter[]) => {
      if (!can('users', 'read')) {
        toast.error(t('messages.permissionDenied.read'));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));
      const seq = ++requestSeqRef.current;

      try {
        // The header click passes sort/order explicitly because its setState has
        // not committed yet; every other reload reads the committed value.
        const requestParams: UsersListParams = {
          page: 1,
          per_page: DEFAULT_PAGE_SIZE,
          sort: state.sortBy,
          order: state.sortOrder,
          ...params,
        };

        // EVO-1947: keep the search term on every reload. The server honors `q`
        // now, so omitting it here made page 2 (and applying a filter) silently
        // return the unsearched list while the search box still showed the term.
        const search = (params?.q ?? searchQueryRef.current).trim();
        if (search) {
          requestParams.q = search;
        } else {
          delete requestParams.q;
        }

        // EVO-1947: usar os filtros passados explicitamente quando houver, para não
        // cair no closure defasado de activeFilters logo após setActiveFilters.
        const effectiveFilters = filtersOverride ?? activeFilters;
        if (effectiveFilters.length > 0) {
          const filterParams = effectiveFilters.reduce((acc, filter, index) => {
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
          }, {} as Record<string, string>);

          Object.assign(requestParams, filterParams);
        }

        const response = await usersService.getUsers(requestParams);

        // A newer request already went out: its answer is the current one.
        if (seq !== requestSeqRef.current) return;

        setState(prev => ({
          ...prev,
          users: response.data || [],
          meta: {
            pagination: response.meta.pagination
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        if (seq !== requestSeqRef.current) return;

        console.error('Error loading users:', error);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [activeFilters, can, t, state.sortBy, state.sortOrder],
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
  // One request per keystroke used to be free (the server ignored `q`); now it
  // is a full ILIKE scan, so the reload waits for a pause in the typing.
  const debouncedSearchReload = useDebouncedCallback(() => {
    loadUsers({ page: 1 });
  }, 400);

  const handleSearchChange = (query: string) => {
    searchQueryRef.current = query;
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page: 1 },
      },
    }));

    // Reload with new search
    debouncedSearchReload();
  };

  // Funções para o sistema de filtros
  // The role options ship hard-coded as administrator/agent, which predates
  // custom roles (RBAC). Filtering has to offer whatever roles the account
  // actually has — the backend already matches on any role key.
  const userFilterTypes: FilterType[] = useMemo(() => {
    if (roleOptions.length === 0) return USER_FILTER_TYPES;

    return USER_FILTER_TYPES.map(filterType =>
      filterType.attributeKey === 'role' ? { ...filterType, options: roleOptions } : filterType,
    );
  }, [roleOptions]);

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] =>
    buildAppliedFilterChips(filters, userFilterTypes, t, handleRemoveFilter);

  const handleOpenFilter = async () => {
    setFilterModalOpen(true);
    if (roleOptions.length > 0) return;

    try {
      const roles = await rolesService.list();
      setRoleOptions(roles.map(role => ({ label: role.name, value: role.key })));
    } catch (error) {
      // Listing roles needs its own permission; without it the filter keeps the
      // built-in options instead of failing to open.
      console.error('Error loading role options:', error);
    }
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
      await loadUsers({ page: 1 }, filters);
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(t('messages.filterError'));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadUsers({ page: 1 }, []);
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

  // CRM-210: mirrors the backend gate — users.reset_password (the standalone
  // key) AND users.manage (administrative).
  const canSetPassword = can('users', 'reset_password') && can('users', 'manage');

  const callerIsSuperAdmin = currentUser?.role?.key === 'super_admin';

  // Mirrors the backend's target guards (users_controller#set_password) so the
  // button is never offered for a case it would refuse with a 403.
  const canSetPasswordFor = (user: User) => {
    if (!canSetPassword) return false;
    // currentUserId is stringified; the list may carry a numeric id.
    if (String(user.id) === currentUserId) return false;
    if (user.role?.key === 'super_admin' && !callerIsSuperAdmin) return false;
    return true;
  };

  const handleSetPassword = (user: User) => {
    if (!canSetPasswordFor(user)) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setUserToSetPassword(user);
    setSetPasswordModalOpen(true);
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
                onSetPassword={canSetPasswordFor(user) ? handleSetPassword : undefined}
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
              // Only sortable columns reach here, and they match the whitelist.
              const newSort = column as NonNullable<UsersListParams['sort']>;
              const newOrder =
                state.sortBy === newSort && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: newSort, sortOrder: newOrder }));
              loadUsers({ page: 1, sort: newSort, order: newOrder });
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

      {/* CRM-210: admin sets another user's password */}
      <SetPasswordModal
        open={setPasswordModalOpen}
        onOpenChange={setSetPasswordModalOpen}
        user={userToSetPassword}
      />

      {/* Users Filter Modal */}
      <UsersFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={activeFilters}
        filterTypes={userFilterTypes}
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
