import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsCannedResponsesTour } from '@/tours';
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
import { MessageSquare, Search } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import {
  CannedResponse,
  CannedResponsesState,
  CannedResponseFormData,
} from '@/types/knowledge';

import CannedResponsesHeader from '@/components/cannedResponses/CannedResponsesHeader';
import CannedResponsesTable from '@/components/cannedResponses/CannedResponsesTable';
import CannedResponsesPagination from '@/components/cannedResponses/CannedResponsesPagination';
import CannedResponseModal from '@/components/cannedResponses/CannedResponseModal';
import { DEFAULT_PAGE_SIZE, SETTINGS_LIST_FETCH_SIZE } from '@/constants/pagination';

const INITIAL_STATE: CannedResponsesState = {
  cannedResponses: [],
  selectedCannedResponseIds: [],
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
  },
  searchQuery: '',
  sortBy: 'short_code',
  sortOrder: 'asc',
};

export default function CannedResponses() {
  const { t } = useLanguage('cannedResponses');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const [state, setState] = useState<CannedResponsesState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cannedResponseToDelete, setCannedResponseToDelete] = useState<CannedResponse | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [cannedResponseModalOpen, setCannedResponseModalOpen] = useState(false);
  const [editingCannedResponse, setEditingCannedResponse] = useState<CannedResponse | null>(null);

  // Load canned responses
  const loadCannedResponses = useCallback(async () => {
    if (!can('canned_responses', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      const response = await cannedResponsesService.getCannedResponses(
        undefined,
        SETTINGS_LIST_FETCH_SIZE,
      );

      setState(prev => ({
        ...prev,
        cannedResponses: response.data,
        selectedCannedResponseIds: [],
        meta: {
          ...prev.meta,
          pagination: { ...prev.meta.pagination, page: 1 },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error loading canned responses:', error);
      toast.error(t('messages.loadError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  }, [can, t]);

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadCannedResponses();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  // Get sorted and filtered canned responses
  const sortedCannedResponses = cannedResponsesService.sortCannedResponses(
    state.cannedResponses,
    state.sortBy,
    state.sortOrder,
  );

  // Search filtered canned responses
  const searchFilteredCannedResponses = cannedResponsesService.filterCannedResponses(
    sortedCannedResponses,
    state.searchQuery,
  );

  const pageSize = state.meta.pagination.page_size ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(searchFilteredCannedResponses.length / pageSize));
  const currentPage = Math.min(state.meta.pagination.page, totalPages);
  const paginatedCannedResponses = searchFilteredCannedResponses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedCannedResponseIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      selectedCannedResponseIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      selectedCannedResponseIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));
  };

  // Canned Response actions
  const handleCreateCannedResponse = () => {
    if (!can('canned_responses', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditingCannedResponse(null);
    setCannedResponseModalOpen(true);
  };

  const handleEditCannedResponse = (cannedResponse: CannedResponse) => {
    if (!can('canned_responses', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingCannedResponse(cannedResponse);
    setCannedResponseModalOpen(true);
  };

  const handleDeleteCannedResponse = (cannedResponse: CannedResponse) => {
    if (!can('canned_responses', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setCannedResponseToDelete(cannedResponse);
    setDeleteDialogOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('canned_responses', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single canned response
  const confirmDeleteCannedResponse = async () => {
    if (!cannedResponseToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await cannedResponsesService.deleteCannedResponse(cannedResponseToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadCannedResponses();

      setDeleteDialogOpen(false);
      setCannedResponseToDelete(null);
    } catch (error) {
      console.error('Error deleting canned response:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedCannedResponseIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each selected canned response
      await Promise.all(
        state.selectedCannedResponseIds.map(id => cannedResponsesService.deleteCannedResponse(id)),
      );

      toast.success(
        t('messages.bulkDeleteSuccess', { count: state.selectedCannedResponseIds.length }),
      );

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedCannedResponseIds: [] }));
      loadCannedResponses();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting canned responses:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle canned response form submission
  const handleCannedResponseFormSubmit = async (data: CannedResponseFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingCannedResponse ? 'update' : 'create']: true },
    }));

    try {
      if (editingCannedResponse) {
        // Update existing canned response
        await cannedResponsesService.updateCannedResponse(editingCannedResponse.id, data);
        toast.success(t('messages.updateSuccess'));
      } else {
        // Create new canned response
        await cannedResponsesService.createCannedResponse(data);
        toast.success(t('messages.createSuccess'));
      }

      // Refresh the entire list
      loadCannedResponses();

      // Close modal and clear editing state
      setCannedResponseModalOpen(false);
      setEditingCannedResponse(null);
    } catch (error) {
      console.error('Error saving canned response:', error);
      toast.error(editingCannedResponse ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleCannedResponseModalClose = (open: boolean) => {
    if (!open) {
      setCannedResponseModalOpen(false);
      setEditingCannedResponse(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-canned-responses-page">
      <SettingsCannedResponsesTour />
      <div data-tour="settings-canned-responses-header">
        <CannedResponsesHeader
          totalCount={searchFilteredCannedResponses.length}
          selectedCount={state.selectedCannedResponseIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewCannedResponse={handleCreateCannedResponse}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedCannedResponseIds: [] }))}
          showBulkActions={state.selectedCannedResponseIds.length > 0}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto mt-6" data-tour="settings-canned-responses-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : searchFilteredCannedResponses.length === 0 ? (
          state.searchQuery.trim() ? (
            <EmptyState
              icon={Search}
              title={t('common:base.noResults.title')}
              description={t('common:base.noResults.description')}
              action={{
                label: t('common:base.noResults.clearSearch'),
                onClick: () => handleSearchChange(''),
                variant: 'outline',
              }}
              className="h-full"
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={t('empty.title')}
              description={t('empty.description')}
              action={{
                label: t('empty.action'),
                onClick: handleCreateCannedResponse,
              }}
              className="h-full"
            />
          )
        ) : (
          <CannedResponsesTable
            cannedResponses={paginatedCannedResponses}
            selectedCannedResponses={paginatedCannedResponses.filter(cr =>
              state.selectedCannedResponseIds.includes(cr.id),
            )}
            loading={state.loading.list}
            onSelectionChange={cannedResponses =>
              setState(prev => ({
                ...prev,
                selectedCannedResponseIds: cannedResponses.map(cr => cr.id),
              }))
            }
            onEditCannedResponse={handleEditCannedResponse}
            onDeleteCannedResponse={handleDeleteCannedResponse}
            onCreateCannedResponse={handleCreateCannedResponse}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({
                ...prev,
                sortBy: column,
                sortOrder: newOrder,
                selectedCannedResponseIds: [],
                meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
              }));
            }}
          />
        )}
      </div>

      {/* Pagination fixa em baixo */}
      {searchFilteredCannedResponses.length > 0 && (
        <div className="mt-auto pt-4 border-t">
          <CannedResponsesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={searchFilteredCannedResponses.length}
            perPage={pageSize}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            loading={state.loading.list}
          />
        </div>
      )}

      {/* Delete Canned Response Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { shortCode: cannedResponseToDelete?.short_code })}
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
              onClick={confirmDeleteCannedResponse}
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
              {t('dialog.bulkDelete.description', {
                count: state.selectedCannedResponseIds.length,
              })}
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

      {/* Canned Response Modal */}
      <CannedResponseModal
        open={cannedResponseModalOpen}
        onOpenChange={handleCannedResponseModalClose}
        cannedResponse={editingCannedResponse || undefined}
        isNew={!editingCannedResponse}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleCannedResponseFormSubmit}
      />
    </div>
  );
}
