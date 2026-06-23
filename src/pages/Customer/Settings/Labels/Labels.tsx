import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsLabelsTour } from '@/tours';
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
import { Search, Tags } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { labelsService } from '@/services/contacts/labelsService';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Label, LabelsState, LabelFormData } from '@/types/settings';

import LabelsHeader from '@/components/labels/LabelsHeader';
import LabelsTable from '@/components/labels/LabelsTable';
import LabelsPagination from '@/components/labels/LabelsPagination';
import LabelModal from '@/components/labels/LabelModal';
import { DEFAULT_PAGE_SIZE, SETTINGS_LIST_FETCH_SIZE } from '@/constants/pagination';

const INITIAL_STATE: LabelsState = {
  labels: [],
  selectedLabelIds: [],
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
  sortBy: 'title',
  sortOrder: 'asc',
};

export default function Labels() {
  const { t } = useLanguage('labels');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const [state, setState] = useState<LabelsState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const hasLoaded = useRef(false);

  // Load labels
  const loadLabels = useCallback(async () => {
    if (!can('labels', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      const response = await labelsService.getLabels({ per_page: SETTINGS_LIST_FETCH_SIZE });

      setState(prev => ({
        ...prev,
        labels: response.data,
        selectedLabelIds: [],
        meta: {
          ...prev.meta,
          pagination: { ...prev.meta.pagination, page: 1 },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error loading labels:', error);
      toast.error(t('messages.loadError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  }, [can, t]);

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadLabels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedLabelIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      selectedLabelIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      selectedLabelIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));
  };

  // Label actions
  const handleCreateLabel = () => {
    if (!can('labels', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }

    setEditingLabel(null);
    setLabelModalOpen(true);
  };

  const handleEditLabel = (label: Label) => {
    if (!can('labels', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingLabel(label);
    setLabelModalOpen(true);
  };

  const handleDeleteLabel = (label: Label) => {
    if (!can('labels', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }

    setLabelToDelete(label);
    setDeleteDialogOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('labels', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single label
  const confirmDeleteLabel = async () => {
    if (!labelToDelete) return;

    // Verificar permissão antes de executar
    if (!can('labels', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await labelsService.deleteLabel(labelToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadLabels();

      setDeleteDialogOpen(false);
      setLabelToDelete(null);
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedLabelIds.length === 0) return;

    // Verificar permissão antes de executar
    if (!can('labels', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each selected label
      await Promise.all(state.selectedLabelIds.map(id => labelsService.deleteLabel(id)));
      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedLabelIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedLabelIds: [] }));
      loadLabels();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting labels:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle label form submission
  const handleLabelFormSubmit = async (data: LabelFormData) => {

    // Verificar permissão antes de executar
    const requiredPermission = editingLabel ? 'update' : 'create';
    if (!can('labels', requiredPermission)) {
      toast.error(editingLabel ? t('messages.permissionDenied.update') : t('messages.permissionDenied.create'));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingLabel ? 'update' : 'create']: true },
    }));

    try {
      if (editingLabel) {
        // Update existing label
        const response = await labelsService.updateLabel(editingLabel.id, data);
        toast.success(t('messages.updateSuccess'));

        // Update the specific label in the list
        const updatedLabel = response.data;
        setState(prev => ({
          ...prev,
          labels: prev.labels.map(label => (label.id === editingLabel.id ? updatedLabel : label)),
        }));
      } else {
        // Create new label
        await labelsService.createLabel(data);
        toast.success(t('messages.createSuccess'));
      }

      // Refresh the entire list for new labels
      loadLabels();

      // Close modal and clear editing state
      setLabelModalOpen(false);
      setEditingLabel(null);
    } catch (error) {
      console.error('Error saving label:', error);
      toast.error(editingLabel ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleLabelModalClose = (open: boolean) => {
    if (!open) {
      setLabelModalOpen(false);
      setEditingLabel(null);
    }
  };

  const pageSize = state.meta.pagination.page_size;
  const filteredLabels = state.searchQuery.trim()
    ? state.labels.filter(label => {
        const query = state.searchQuery.toLowerCase();
        return (
          label.title.toLowerCase().includes(query) ||
          label.description?.toLowerCase().includes(query)
        );
      })
    : state.labels;
  const sortedLabels = [...filteredLabels].sort((a, b) => {
    const direction = state.sortOrder === 'asc' ? 1 : -1;
    if (state.sortBy === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    }
    return a.title.localeCompare(b.title) * direction;
  });
  const totalPages = Math.max(1, Math.ceil(sortedLabels.length / pageSize));
  const currentPage = Math.min(state.meta.pagination.page, totalPages);
  const paginatedLabels = sortedLabels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-labels-page">
      <SettingsLabelsTour />
      <div data-tour="settings-labels-header">
        <LabelsHeader
          totalCount={sortedLabels.length}
          selectedCount={state.selectedLabelIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewLabel={handleCreateLabel}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedLabelIds: [] }))}
          showBulkActions={state.selectedLabelIds.length > 0}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto mt-6" data-tour="settings-labels-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : sortedLabels.length === 0 ? (
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
              icon={Tags}
              title={t('empty.title')}
              description={t('empty.description')}
              action={can('labels', 'create') ? {
                label: t('empty.action'),
                onClick: handleCreateLabel,
              } : undefined}
              className="h-full"
            />
          )
        ) : (
          <LabelsTable
            labels={paginatedLabels}
            selectedLabels={paginatedLabels.filter(label => state.selectedLabelIds.includes(label.id))}
            loading={state.loading.list}
            onSelectionChange={labels =>
              setState(prev => ({
                ...prev,
                selectedLabelIds: labels.map(l => l.id),
              }))
            }
            onEditLabel={handleEditLabel}
            onDeleteLabel={handleDeleteLabel}
            onCreateLabel={handleCreateLabel}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({
                ...prev,
                sortBy: column as 'title' | 'created_at',
                sortOrder: newOrder,
                selectedLabelIds: [],
                meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
              }));
            }}
          />
        )}
      </div>

      {/* Pagination */}
      {sortedLabels.length > 0 && (
        <div className="mt-auto pt-4 border-t">
          <LabelsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={sortedLabels.length}
            perPage={pageSize}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            loading={state.loading.list}
          />
        </div>
      )}

      {/* Delete Label Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { title: labelToDelete?.title })}
            </DialogDescription>
          </DialogHeader>
          {!!labelToDelete?.usage_count && labelToDelete.usage_count > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {t('dialog.delete.usageWarning', { count: labelToDelete.usage_count })}
            </p>
          )}
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
              onClick={confirmDeleteLabel}
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
              {t('dialog.bulkDelete.description', { count: state.selectedLabelIds.length })}
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

      {/* Label Modal */}
      <LabelModal
        open={labelModalOpen}
        onOpenChange={handleLabelModalClose}
        label={editingLabel || undefined}
        isNew={!editingLabel}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleLabelFormSubmit}
      />
    </div>
  );
}
