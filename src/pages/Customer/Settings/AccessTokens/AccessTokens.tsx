import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { SettingsAccessTokensTour } from '@/tours';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { Key } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

import {
  getAccessTokens,
  createAccessToken,
  updateAccessToken,
  deleteAccessToken,
  regenerateAccessToken,
} from '@/services/auth/accessTokensService';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import type { AccessToken, AccessTokensState, AccessTokenFormData } from '@/types/auth';

import {
  AccessTokensHeader,
  AccessTokensTable,
  AccessTokensPagination,
  AccessTokenModal,
  ViewTokenModal,
} from '@/components/AccessTokens';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: AccessTokensState = {
  tokens: [],
  selectedTokenIds: [],
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
    bulk: false,
    regenerateToken: false,
  },
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function AccessTokens() {
  const { can } = usePermissions();
  const { t } = useTranslation('accessTokens');
  const [state, setState] = useState<AccessTokensState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<AccessToken | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<AccessToken | null>(null);
  const [viewTokenModalOpen, setViewTokenModalOpen] = useState(false);
  const [selectedTokenForView, setSelectedTokenForView] = useState<AccessToken | null>(null);

  // Load tokens
  const loadTokens = useCallback(
    async (page?: number, perPage?: number) => {
      if (!can('access_tokens', 'read')) {
        toast.error(t('messages.permissionDenied', { action: 'visualizar' }));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const response = await getAccessTokens({
          page: page || state.meta.pagination.page,
          per_page: perPage || state.meta.pagination.page_size,
        });

        setState(prev => ({
          ...prev,
          tokens: response.data,
          meta: {
            pagination: {
              page: response.meta.pagination.page,
              page_size: response.meta.pagination.page_size,
              total: response.meta.pagination.total,
              total_pages: response.meta.pagination.total_pages,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading access tokens:', (error as any).response?.data);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  usePermissionGatedLoad({
    resource: 'access_tokens',
    load: loadTokens,
    onDenied: () => toast.error(t('messages.permissionDenied', { action: 'visualizar' })),
  });

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page: 1,
        },
      },
    }));

    // Client-side filtering
    if (query.trim()) {
      const filteredTokens = state.tokens.filter(
        token =>
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.token.toLowerCase().includes(query.toLowerCase()) ||
          token.scopes.toLowerCase().includes(query.toLowerCase()),
      );
      setState(prev => ({
        ...prev,
        tokens: filteredTokens,
      }));
    } else {
      loadTokens();
    }
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page: page,
        },
      },
    }));

    // Trigger reload with new page
    loadTokens(page, state.meta.pagination.page_size);
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page_size: perPage,
          page: 1,
        },
      },
    }));

    // Trigger reload with new per_page
    loadTokens(1, perPage);
  };

  // Token actions
  const handleCreateToken = () => {
    if (!can('access_tokens', 'create')) {
      toast.error(t('messages.permissionDenied', { action: 'criar' }));
      return;
    }

    setEditingToken(null);
    setTokenModalOpen(true);
  };

  const handleEditToken = (token: AccessToken) => {
    if (!can('access_tokens', 'update')) {
      toast.error(t('messages.permissionDenied', { action: 'editar' }));
      return;
    }

    setEditingToken(token);
    setTokenModalOpen(true);
  };

  const handleDeleteToken = (token: AccessToken) => {
    if (!can('access_tokens', 'delete')) {
      toast.error(t('messages.permissionDenied', { action: 'excluir' }));
      return;
    }

    setTokenToDelete(token);
    setDeleteDialogOpen(true);
  };

  const handleViewToken = (token: AccessToken) => {
    if (!can('access_tokens', 'read')) {
      toast.error(t('messages.permissionDenied', { action: 'visualizar detalhes do' }));
      return;
    }

    setSelectedTokenForView(token);
    setViewTokenModalOpen(true);
  };

  const handleRegenerateToken = async (token: AccessToken) => {
    if (!can('access_tokens', 'update_token')) {
      toast.error(t('messages.permissionDenied', { action: 'regenerar' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, regenerateToken: true } }));
      const response = await regenerateAccessToken(token.id);

      // Update the token in the list
      setState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === token.id ? { ...t, token: response.data.token } : t,
        ),
      }));

      setSelectedTokenForView(response.data);
      setViewTokenModalOpen(true);
      toast.success(t('messages.regenerateSuccess'));
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast.error(t('messages.regenerateError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, regenerateToken: false } }));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('access_tokens', 'delete')) {
      toast.error(t('messages.permissionDenied', { action: 'excluir' }));
      return;
    }

    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single token
  const confirmDeleteToken = async () => {
    if (!tokenToDelete) return;

    if (!can('access_tokens', 'delete')) {
      toast.error(t('messages.permissionDenied', { action: 'excluir' }));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await deleteAccessToken(tokenToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadTokens();

      setDeleteDialogOpen(false);
      setTokenToDelete(null);
    } catch (error) {
      console.error('Error deleting access token:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedTokenIds.length === 0) return;

    if (!can('access_tokens', 'delete')) {
      toast.error(t('messages.permissionDenied', { action: 'excluir' }));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each selected token
      await Promise.all(state.selectedTokenIds.map(id => deleteAccessToken(id)));
      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedTokenIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedTokenIds: [] }));
      loadTokens();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting access tokens:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle token form submission
  const handleTokenFormSubmit = async (data: AccessTokenFormData) => {
    // Check permission before executing
    const requiredPermission = editingToken ? 'update' : 'create';
    if (!can('access_tokens', requiredPermission)) {
      toast.error(
        t('messages.permissionDenied', {
          action: editingToken ? 'atualizar' : 'criar',
        }),
      );
      return;
    }

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingToken ? 'update' : 'create']: true },
    }));

    try {
      if (editingToken) {
        // Update existing token
        await updateAccessToken(editingToken.id, data);
        toast.success(t('messages.updateSuccess'));
      } else {
        // Create new token
        await createAccessToken(data);
        toast.success(t('messages.createSuccess'));
      }

      // Refresh the entire list
      loadTokens();

      // Close modal and clear editing state
      setTokenModalOpen(false);
      setEditingToken(null);
    } catch (error) {
      console.error('Error saving access token:', error);
      toast.error(editingToken ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleTokenModalClose = (open: boolean) => {
    if (!open) {
      setTokenModalOpen(false);
      setEditingToken(null);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('messages.copySuccess'));
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error(t('messages.copyError', { item: label }));
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-access-tokens-page">
      <SettingsAccessTokensTour />
      <div data-tour="settings-access-tokens-header">
        <AccessTokensHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedTokenIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewToken={handleCreateToken}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedTokenIds: [] }))}
          showBulkActions={state.selectedTokenIds.length > 0}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto mt-6" data-tour="settings-access-tokens-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('messages.loading')}</div>
          </div>
        ) : state.tokens.length === 0 ? (
          <EmptyState
            icon={Key}
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              can('access_tokens', 'create')
                ? {
                    label: t('actions.create'),
                    onClick: handleCreateToken,
                  }
                : undefined
            }
            className="h-full"
          />
        ) : (
          <AccessTokensTable
            tokens={state.tokens}
            selectedTokens={state.tokens.filter(token => state.selectedTokenIds.includes(token.id))}
            loading={state.loading.list}
            onSelectionChange={tokens =>
              setState(prev => ({
                ...prev,
                selectedTokenIds: tokens.map(token => token.id),
              }))
            }
            onEditToken={handleEditToken}
            onDeleteToken={handleDeleteToken}
            onViewToken={handleViewToken}
            onRegenerateToken={handleRegenerateToken}
            onCreateToken={handleCreateToken}
            onCopy={handleCopy}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({
                ...prev,
                sortBy: column as 'name' | 'created_at',
                sortOrder: newOrder,
              }));
            }}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <div className="mt-auto pt-4 border-t">
          <AccessTokensPagination
            currentPage={state.meta.pagination.page}
            totalPages={state.meta.pagination.total_pages}
            totalCount={state.meta.pagination.total}
            perPage={state.meta.pagination.page_size}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </div>
      )}

      {/* Delete Token Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: tokenToDelete?.name })}
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
              onClick={confirmDeleteToken}
              disabled={state.loading.delete}
            >
              {state.loading.delete ? t('actions.deleting') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulkDeleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('bulkDeleteDialog.description', { count: state.selectedTokenIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={state.loading.bulk}
            >
              {t('bulkDeleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={state.loading.bulk}>
              {state.loading.bulk ? t('actions.deleting') : t('bulkDeleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Modal */}
      <AccessTokenModal
        open={tokenModalOpen}
        onOpenChange={handleTokenModalClose}
        token={editingToken || undefined}
        isNew={!editingToken}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleTokenFormSubmit}
      />

      {/* View Token Modal */}
      <ViewTokenModal
        open={viewTokenModalOpen}
        onOpenChange={setViewTokenModalOpen}
        token={selectedTokenForView}
        onCopy={handleCopy}
      />
    </div>
  );
}
