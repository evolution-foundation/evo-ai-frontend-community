import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { SettingsCustomAttributesTour } from '@/tours';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { Search, Settings } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import {
  CustomAttributeDefinition,
  CustomAttributesState,
  CustomAttributeFormData,
  AttributeModel,
  ATTRIBUTE_TABS,
} from '@/types/settings';

import CustomAttributesHeader from '@/components/customAttributes/CustomAttributesHeader';
import CustomAttributesTable from '@/components/customAttributes/CustomAttributesTable';
import CustomAttributesPagination from '@/components/customAttributes/CustomAttributesPagination';
import CustomAttributeModal from '@/components/customAttributes/CustomAttributeModal';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: CustomAttributesState = {
  attributes: [],
  selectedAttributeIds: [],
  activeTab: 'conversation_attribute',
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
  sortBy: 'attribute_display_name',
  sortOrder: 'asc',
};

export default function CustomAttributes() {
  const { t } = useLanguage('customAttributes');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const [state, setState] = useState<CustomAttributesState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<CustomAttributeDefinition | null>(
    null,
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [attributeModalOpen, setAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<CustomAttributeDefinition | null>(null);

  // Load custom attributes
  const loadCustomAttributes = useCallback(async () => {
    if (!can('custom_attribute_definitions', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      const response = await customAttributesService.getCustomAttributes();

      setState(prev => ({
        ...prev,
        attributes: response.data,
        meta: {
          pagination: {
            page: response.meta?.pagination?.page || 1,
            page_size: response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE,
            total: response.meta?.pagination?.total || 0,
            total_pages: response.meta?.pagination?.total_pages || 1,
            has_next_page: response.meta?.pagination?.has_next_page || false,
            has_previous_page: response.meta?.pagination?.has_previous_page || false,
          },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error loading custom attributes:', error);
      toast.error(t('messages.loadError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  }, [can, t]);

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadCustomAttributes();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  // Get filtered attributes by active tab
  // For pipeline tab, show all pipeline-related attributes
  const filteredAttributes =
    state.activeTab === 'pipeline_attribute'
      ? state.attributes.filter(
          attr =>
            attr.attribute_model === 'pipeline_attribute' ||
            attr.attribute_model === 'pipeline_stage_attribute' ||
            attr.attribute_model === 'pipeline_item_attribute'
        )
      : customAttributesService.filterAttributesByModel(state.attributes, state.activeTab);

  // Search filtered attributes
  const searchFilteredAttributes = filteredAttributes.filter(attr =>
    state.searchQuery
      ? attr.attribute_display_name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        attr.attribute_description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        attr.attribute_key.toLowerCase().includes(state.searchQuery.toLowerCase())
      : true,
  );

  const pageSize = state.meta.pagination.page_size;
  const sortedAttributes = [...searchFilteredAttributes].sort((a, b) => {
    const direction = state.sortOrder === 'asc' ? 1 : -1;
    if (state.sortBy === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    }
    return a.attribute_display_name.localeCompare(b.attribute_display_name) * direction;
  });
  const totalPages = Math.max(1, Math.ceil(sortedAttributes.length / pageSize));
  const currentPage = Math.min(state.meta.pagination.page, totalPages);
  const paginatedAttributes = sortedAttributes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedAttributeIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));
  };

  const handleTabChange = (tab: string) => {
    const newTab = tab as AttributeModel;
    setState(prev => ({
      ...prev,
      activeTab: newTab,
      selectedAttributeIds: [],
      searchQuery: '',
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      selectedAttributeIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      selectedAttributeIds: [],
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 } },
    }));
  };

  // Custom Attribute actions
  const handleCreateAttribute = () => {
    if (!can('custom_attribute_definitions', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditingAttribute(null);
    setAttributeModalOpen(true);
  };

  const handleEditAttribute = (attribute: CustomAttributeDefinition) => {
    if (!can('custom_attribute_definitions', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditingAttribute(attribute);
    setAttributeModalOpen(true);
  };

  const handleDeleteAttribute = (attribute: CustomAttributeDefinition) => {
    if (!can('custom_attribute_definitions', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setAttributeToDelete(attribute);
    setDeleteDialogOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('custom_attribute_definitions', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single attribute
  const confirmDeleteAttribute = async () => {
    if (!attributeToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await customAttributesService.deleteCustomAttribute(attributeToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadCustomAttributes();

      setDeleteDialogOpen(false);
      setAttributeToDelete(null);
    } catch (error) {
      console.error('Error deleting custom attribute:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedAttributeIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each selected attribute
      await Promise.all(
        state.selectedAttributeIds.map(id => customAttributesService.deleteCustomAttribute(id)),
      );

      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedAttributeIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedAttributeIds: [] }));
      loadCustomAttributes();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting custom attributes:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle attribute form submission
  const handleAttributeFormSubmit = async (data: CustomAttributeFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingAttribute ? 'update' : 'create']: true },
    }));

    try {
      if (editingAttribute) {
        // Update existing attribute
        await customAttributesService.updateCustomAttribute(editingAttribute.id, data);
        toast.success(t('messages.updateSuccess'));
      } else {
        // Create new attribute
        await customAttributesService.createCustomAttribute(data);
        toast.success(t('messages.createSuccess'));
      }

      // Refresh the entire list
      loadCustomAttributes();

      // Close modal and clear editing state
      setAttributeModalOpen(false);
      setEditingAttribute(null);
    } catch (error) {
      console.error('Error saving custom attribute:', error);
      toast.error(editingAttribute ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleAttributeModalClose = (open: boolean) => {
    if (!open) {
      setAttributeModalOpen(false);
      setEditingAttribute(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-custom-attributes-page">
      <SettingsCustomAttributesTour />
      <div data-tour="settings-custom-attributes-header">
        <CustomAttributesHeader
          totalCount={sortedAttributes.length}
          selectedCount={state.selectedAttributeIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewAttribute={handleCreateAttribute}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedAttributeIds: [] }))}
          showBulkActions={state.selectedAttributeIds.length > 0}
          activeTab={state.activeTab}
        />
      </div>

      {/* Tabs */}
      <div data-tour="settings-custom-attributes-tabs">
      <Tabs value={state.activeTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList className="mb-4">
          {ATTRIBUTE_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {ATTRIBUTE_TABS.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-6 flex flex-col flex-1">
            {/* Content */}
            <div className="flex-1 overflow-auto">
              {state.loading.list ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-muted-foreground">{t('loading')}</div>
                </div>
              ) : sortedAttributes.length === 0 ? (
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
                    icon={Settings}
                    title={t('empty.title')}
                    description={
                      tab.key === 'conversation_attribute'
                        ? t('empty.descriptionConversation')
                        : tab.key === 'contact_attribute'
                        ? t('empty.descriptionContact')
                        : t('empty.descriptionPipeline')
                    }
                    action={{
                      label: t('empty.action'),
                      onClick: handleCreateAttribute,
                    }}
                    className="h-full"
                  />
                )
              ) : (
                <CustomAttributesTable
                  activeTab={state.activeTab}
                  attributes={paginatedAttributes}
                  selectedAttributes={paginatedAttributes.filter(attr =>
                    state.selectedAttributeIds.includes(attr.id),
                  )}
                  loading={state.loading.list}
                  onSelectionChange={attributes =>
                    setState(prev => ({
                      ...prev,
                      selectedAttributeIds: attributes.map(a => a.id),
                    }))
                  }
                  onEditAttribute={handleEditAttribute}
                  onDeleteAttribute={handleDeleteAttribute}
                  onCreateAttribute={handleCreateAttribute}
                  sortBy={state.sortBy}
                  sortOrder={state.sortOrder}
                  onSort={column => {
                    const newOrder =
                      state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
                    setState(prev => ({
                      ...prev,
                      sortBy: column as 'attribute_display_name' | 'created_at',
                      sortOrder: newOrder,
                      selectedAttributeIds: [],
                      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
                    }));
                  }}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      </div>

      {/* Pagination fixa em baixo */}
      {sortedAttributes.length > 0 && (
        <div className="mt-auto pt-4 border-t">
          <CustomAttributesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={sortedAttributes.length}
            perPage={pageSize}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            loading={state.loading.list}
          />
        </div>
      )}

      {/* Delete Custom Attribute Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { name: attributeToDelete?.attribute_display_name })}
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
              onClick={confirmDeleteAttribute}
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
              {t('dialog.bulkDelete.description', { count: state.selectedAttributeIds.length })}
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

      {/* Custom Attribute Modal */}
      <CustomAttributeModal
        open={attributeModalOpen}
        onOpenChange={handleAttributeModalClose}
        attribute={editingAttribute || undefined}
        isNew={!editingAttribute}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleAttributeFormSubmit}
        defaultAttributeModel={state.activeTab}
      />
    </div>
  );
}
