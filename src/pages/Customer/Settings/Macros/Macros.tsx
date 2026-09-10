import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsMacrosTour } from '@/tours';
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
import { Settings } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { macrosService } from '@/services/macros';
import { Macro, MacrosListParams, MacrosState } from '@/types/automation';
// import { BaseFilter } from '@/types/core';
import { AppliedFilter } from '@/types/core';

import { MacrosHeader, MacrosTable, MacrosPagination, MacroFormModal } from '@/components/macros';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: MacrosState = {
  macros: [],
  selectedMacroIds: [],
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
  },
  filters: [],
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Macros() {
  const { t } = useLanguage('macros');
  const { can, isReady: permissionsReady } = usePermissions();
  const [state, setState] = useState<MacrosState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [macroToDelete, setMacroToDelete] = useState<Macro | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [macroModalOpen, setMacroModalOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [, setFilterModalOpen] = useState(false);
  // const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters] = useState<AppliedFilter[]>([]);

  // Load macros
  const loadMacros = useCallback(
    async (params?: Partial<MacrosListParams>) => {
      if (!can('macros', 'read')) {
        toast.error(t('messages.permissionDenied.read'));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: MacrosListParams = {
          page: 1,
          per_page: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const response = await macrosService.getMacros(requestParams);

        setState(prev => ({
          ...prev,
          macros: response.data || [],
          meta: {
            pagination: {
              page: response.meta?.pagination?.page || 1,
              page_size: response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE,
              total: response.meta?.pagination?.total || response.data?.length || 0,
              total_pages: response.meta?.pagination?.total_pages || 1,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading macros:', error);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  usePermissionGatedLoad({
    resource: 'macros',
    load: loadMacros,
    onDenied: () => toast.error(t('messages.permissionDenied.read')),
  });

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

    // In a real implementation, you would debounce this
    // For now, we'll filter client-side
    if (query.trim()) {
      const filteredMacros = state.macros.filter(macro =>
        macro.name.toLowerCase().includes(query.toLowerCase()),
      );
      setState(prev => ({
        ...prev,
        macros: filteredMacros,
      }));
    } else {
      loadMacros();
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

    loadMacros({ page });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
    }));

    loadMacros({ page: 1, per_page: perPage });
  };

  // Macro actions
  const handleMacroClick = (macro: Macro) => {
    if (!can('macros', 'manage')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingMacro(macro);
    setMacroModalOpen(true);
  };

  const handleCreateMacro = () => {
    if (!can('macros', 'manage')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditingMacro(null);
    setMacroModalOpen(true);
  };

  const handleEditMacro = (macro: Macro) => {
    if (!can('macros', 'manage')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingMacro(macro);
    setMacroModalOpen(true);
  };

  const handleDeleteMacro = (macro: Macro) => {
    if (!can('macros', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setMacroToDelete(macro);
    setDeleteDialogOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('macros', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const canDeleteMacro = () => permissionsReady && can('macros', 'delete');

  const canEditMacro = () => permissionsReady && can('macros', 'manage');

  // Confirm delete single macro
  const confirmDeleteMacro = async () => {
    if (!macroToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await macrosService.deleteMacro(macroToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadMacros();

      setDeleteDialogOpen(false);
      setMacroToDelete(null);
    } catch (error) {
      console.error('Error deleting macro:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedMacroIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      // Delete macros one by one
      for (const macroId of state.selectedMacroIds) {
        await macrosService.deleteMacro(macroId);
      }

      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedMacroIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedMacroIds: [] }));
      loadMacros();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting macros:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Handle macro form submission
  const handleMacroFormSubmit = async () => {
    // Close modal and refresh
    setMacroModalOpen(false);
    setEditingMacro(null);
    loadMacros();
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-macros-page">
      <SettingsMacrosTour />
      <div data-tour="settings-macros-header">
        <MacrosHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedMacroIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewMacro={handleCreateMacro}
          onBulkDelete={handleBulkDelete}
          onFilter={() => setFilterModalOpen(true)}
          onClearSelection={() => setState(prev => ({ ...prev, selectedMacroIds: [] }))}
          activeFilters={appliedFilters}
          showFilters={false} // Disable filters for now
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto mt-6" data-tour="settings-macros-content">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : state.macros.length === 0 ? (
          <EmptyState
            icon={Settings}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.action'),
              onClick: handleCreateMacro,
            }}
            className="h-full"
          />
        ) : (
          <MacrosTable
            macros={state.macros}
            selectedMacros={state.macros.filter(macro => state.selectedMacroIds.includes(macro.id))}
            loading={state.loading.list}
            onSelectionChange={macros =>
              setState(prev => ({
                ...prev,
                selectedMacroIds: macros.map(m => m.id),
              }))
            }
            onMacroClick={handleMacroClick}
            onEditMacro={handleEditMacro}
            onDeleteMacro={handleDeleteMacro}
            onCreateMacro={handleCreateMacro}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
              // In a real implementation, you would reload with sort params
            }}
            getRowKey={(macro: Macro) => macro.id.toString()}
            canDeleteMacro={canDeleteMacro}
            canEditMacro={canEditMacro}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <div className="mt-auto pt-4 border-t">
          <MacrosPagination
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

      {/* Delete Macro Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { name: macroToDelete?.name })}
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
              onClick={confirmDeleteMacro}
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
              {t('dialog.bulkDelete.description', { count: state.selectedMacroIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={state.loading.delete}
            >
              {t('dialog.bulkDelete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={state.loading.delete}
            >
              {state.loading.delete
                ? t('dialog.bulkDelete.deleting')
                : t('dialog.bulkDelete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Macro Modal */}
      <MacroFormModal
        isOpen={macroModalOpen}
        onClose={() => setMacroModalOpen(false)}
        macro={editingMacro}
        onSuccess={handleMacroFormSubmit}
      />
    </div>
  );
}
