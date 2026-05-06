import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { Grid3X3, List, Users } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { contactsService } from '@/services/contacts';
import { Contact, ContactsState, ContactsListParams, ContactFormData } from '@/types/contacts';
import { BaseFilter, AppliedFilter } from '@/types/core';
import { ContactCard } from '@/components/contacts';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

import ContactsHeader from '@/components/contacts/ContactsHeader';
import ContactsTable from '@/components/contacts/ContactsTable';
import ContactsPagination from '@/components/contacts/ContactsPagination';
import ContactModal from '@/components/contacts/ContactModal';
import StartConversationModal from '@/components/contacts/StartConversationModal';
import ContactDetails from '@/components/contacts/ContactDetails';
import ContactsFilter from '@/components/contacts/ContactsFilter';
import ContactImportModal from '@/components/contacts/ContactImportModal';
import ContactExportModal from '@/components/contacts/ContactExportModal';
import ContactEventsModal from '@/components/contacts/ContactEventsModal';
import ContactMergeModal from '@/components/contacts/ContactMergeModal';
import { AxiosError } from 'axios';
import { ContactsTour } from '@/tours';

const INITIAL_STATE: ContactsState = {
  contacts: [],
  selectedContactIds: [],
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
  filters: [],
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Contacts() {
  const { t } = useLanguage('contacts');
  const { contactId: contactIdFromRoute } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();
  const { can, isReady: permissionsReady } = useUserPermissions();
  const [state, setState] = useState<ContactsState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [conversationModalOpen, setConversationModalOpen] = useState(false);
  const [conversationContact, setConversationContact] = useState<Contact | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsContact, setDetailsContact] = useState<Contact | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [eventsModalOpen, setEventsModalOpen] = useState(false);
  const [eventsContact, setEventsContact] = useState<Contact | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [contactsToMerge, setContactsToMerge] = useState<Contact[]>([]);

  // Load contacts
  const loadContacts = useCallback(
    async (params?: Partial<ContactsListParams>) => {
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: ContactsListParams = {
          page: 1,
          per_page: DEFAULT_PAGE_SIZE,
          sort: 'name',
          order: 'asc',
          ...params,
        };

        const response = await contactsService.getContacts(requestParams);

        const total = response.meta?.pagination?.total || 0;
        const pageSize = response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE;

        setState(prev => ({
          ...prev,
          contacts: response.data,
          meta: {
            pagination: {
              page: response.meta?.pagination?.page || 1,
              page_size: pageSize,
              total: total,
              total_pages: response.meta?.pagination?.total_pages || Math.ceil(total / pageSize),
              has_next_page: response.meta?.pagination?.has_next_page,
              has_previous_page: response.meta?.pagination?.has_previous_page,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading contacts:', error);

        // Se erro 403 ou 404, marcar como erro e não tentar novamente
        const axiosError = error as AxiosError;
        if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
          console.error('Account not found or without permission. Stopping contact attempts.');
        }

        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [t],
  );

  // Load contacts with search
  const loadContactsWithSearch = useCallback(
    async (query: string, params?: { page?: number; per_page?: number }) => {
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const searchParams = {
          q: query,
          page: params?.page || 1,
          per_page: params?.per_page || DEFAULT_PAGE_SIZE,
        };

        const response = await contactsService.searchContacts(searchParams);

        setState(prev => ({
          ...prev,
          contacts: response.data,
          meta: {
            pagination: {
              page: response.meta?.pagination?.page || 1,
              page_size: response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE,
              total: response.meta?.pagination?.total || 0,
              total_pages:
                response.meta?.pagination?.total_pages ||
                Math.ceil(
                  (response.meta?.pagination?.total || 0) /
                    (response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE),
                ),
              has_next_page: response.meta?.pagination?.has_next_page,
              has_previous_page: response.meta?.pagination?.has_previous_page,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error searching contacts:', error);
        toast.error(t('messages.searchError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [t],
  );

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadContacts();
  }, [permissionsReady]);

  useEffect(() => {
    if (!contactIdFromRoute) return;

    let cancelled = false;

    const openContactDetails = async () => {
      try {
        const contact = await contactsService.getContact(contactIdFromRoute);
        if (cancelled) return;
        setDetailsContact(contact);
        setDetailsModalOpen(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading contact from route:', error);
        toast.error(t('errors.loadContact'));
      }
    };

    openContactDetails();

    return () => {
      cancelled = true;
    };
  }, [contactIdFromRoute, t]);

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

    // Debounce search
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        loadContactsWithSearch(query.trim());
      } else {
        loadContacts({ page: 1 });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // removed unused

  // removed unused

  // Funções para o sistema de filtros
  const generateFilterQuery = (filters: BaseFilter[]) => {
    // Converte os filtros para o formato da API
    return filters.map(filter => ({
      attribute_key: filter.attributeKey,
      filter_operator: filter.filterOperator,
      values: Array.isArray(filter.values) ? filter.values : [filter.values],
      query_operator: filter.queryOperator,
    }));
  };

  // Build filter payload for API request
  // Backend expects payload (not filters) and query_operator in uppercase (AND/OR)
  const buildFilterPayload = (filters: BaseFilter[]) => {
    const filterQuery = generateFilterQuery(filters);
    
    return filterQuery.map((filter, index) => {
      const isLastFilter = index === filterQuery.length - 1;
      const queryOperator = isLastFilter 
        ? null 
        : (filter.query_operator.toUpperCase() as 'AND' | 'OR');
      
      return {
        attribute_key: filter.attribute_key,
        values: filter.values,
        filter_operator: filter.filter_operator,
        query_operator: queryOperator,
      };
    });
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] => {
    return filters.map((filter, index) => ({
      id: `filter-${index}`,
      label: `${filter.attributeKey}: ${
        Array.isArray(filter.values) ? filter.values.join(',') : filter.values
      }`,
      value: Array.isArray(filter.values)
        ? String(filter.values.join(','))
        : (filter.values as string | number),
      onRemove: () => handleRemoveFilter(index),
    }));
  };

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
      if (filters.length === 0) {
        // Se não há filtros, carregar todos os contatos
        await loadContacts({ page: 1 });
        return;
      }

      // Aplicar filtros usando o endpoint correto
      const filterPayload = buildFilterPayload(filters);

      const response = await contactsService.filterContacts({
        page: 1,
        payload: filterPayload,
      });

      const total = response.meta?.pagination?.total || 0;
      const pageSize = response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE;

      setState(prev => ({
        ...prev,
        contacts: response.data,
        meta: {
          pagination: {
            page: response.meta?.pagination?.page || 1,
            page_size: pageSize,
            total: total,
            total_pages: response.meta?.pagination?.total_pages || Math.ceil(total / pageSize),
            has_next_page: response.meta?.pagination?.has_next_page,
            has_previous_page: response.meta?.pagination?.has_previous_page,
          },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error(t('messages.filterError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  };

  // Helper function for applying filters with pagination
  const handleApplyFiltersWithPagination = async (
    filters: BaseFilter[],
    page: number,
    perPage?: number,
  ) => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      if (filters.length === 0) {
        // Se não há filtros, carregar todos os contatos
        await loadContacts({ page, per_page: perPage });
        return;
      }

      // Aplicar filtros usando o endpoint correto
      const filterPayload = buildFilterPayload(filters);

      const response = await contactsService.filterContacts({
        page,
        payload: filterPayload,
      });

      const total = response.meta?.pagination?.total || 0;
      const pageSize = response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE;

      setState(prev => ({
        ...prev,
        contacts: response.data,
        meta: {
          pagination: {
            page: response.meta?.pagination?.page || 1,
            page_size: pageSize,
            total: total,
            total_pages: response.meta?.pagination?.total_pages || Math.ceil(total / pageSize),
            has_next_page: response.meta?.pagination?.has_next_page,
            has_previous_page: response.meta?.pagination?.has_previous_page,
          },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error applying filters with pagination:', error);
      toast.error(t('messages.filterError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setAppliedFilters([]);
    loadContacts({ page: 1 });
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

    // Check if we have active search or filters
    if (state.searchQuery.trim()) {
      loadContactsWithSearch(state.searchQuery, { page });
    } else if (activeFilters.length > 0) {
      handleApplyFiltersWithPagination(activeFilters, page);
    } else {
      loadContacts({ page });
    }
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
    }));

    // Check if we have active search or filters
    if (state.searchQuery.trim()) {
      loadContactsWithSearch(state.searchQuery, { page: 1, per_page: perPage });
    } else if (activeFilters.length > 0) {
      handleApplyFiltersWithPagination(activeFilters, 1, perPage);
    } else {
      loadContacts({ page: 1, per_page: perPage });
    }
  };

  // Contact selection
  // removed unused

  // removed unused

  // Contact actions
  const handleContactClick = (contact: Contact) => {
    setDetailsContact(contact);
    setDetailsModalOpen(true);
  };

  const handleCreateContact = () => {
    if (!can('contacts', 'create')) {
      toast.error('Você não tem permissão para criar contatos');
      return;
    }
    setEditingContact(null);
    setContactModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactModalOpen(true);
  };

  const handleStartConversation = (contact: Contact) => {
    setConversationContact(contact);
    setConversationModalOpen(true);
  };

  const handleViewEvents = (contact: Contact) => {
    setEventsContact(contact);
    setEventsModalOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleMergeContacts = () => {
    if (state.selectedContactIds.length < 2) {
      toast.error('Selecione pelo menos 2 contatos para mesclar');
      return;
    }
    if (!can('contacts', 'update')) {
      toast.error('Você não tem permissão para mesclar contatos');
      return;
    }
    const selectedContacts = state.contacts.filter(c => state.selectedContactIds.includes(c.id));
    setContactsToMerge(selectedContacts);
    setMergeModalOpen(true);
  };

  // removed unused

  // Import/Export
  const handleImportContacts = () => {
    setImportModalOpen(true);
  };

  const handleExportContacts = () => {
    setExportModalOpen(true);
  };

  const handleImportModalSubmit = async (file: File) => {
    if (!can('contacts', 'read')) {
      toast.error('Você não tem permissão para visualizar contatos');
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, import: true } }));

    try {
      await contactsService.importContacts(file);
      toast.success(t('messages.importQueued'));

      // Refresh the list
      loadContacts();
    } catch (error: unknown) {
      console.error('Error importing contacts:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('messages.importError');
      toast.error(errorMessage);
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, import: false } }));
    }
  };

  interface ExportModalParams {
    format: 'csv' | 'xlsx';
    fields: string[];
    includeFilters?: boolean;
    payload?: Record<string, unknown>;
  }

  const handleExportModalSubmit = async (params: ExportModalParams) => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, export: true } }));

    try {
      // Build export payload according to ContactExportParams interface
      const exportPayload = {
        format: params.format,
        fields: params.fields,
        ...(params.includeFilters &&
          activeFilters.length > 0 && {
            payload: generateFilterQuery(activeFilters).reduce(
              (acc, filter, index) => ({
                ...acc,
                [`filter-${index}`]: filter,
              }),
              {},
            ),
          }),
      };

      await contactsService.exportContacts(exportPayload);
      toast.success(t('messages.exportQueued'));
    } catch (error: unknown) {
      console.error('Error exporting contacts:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('messages.exportError');
      toast.error(errorMessage);
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, export: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedContactIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      await contactsService.bulkDelete(state.selectedContactIds);
      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedContactIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedContactIds: [] }));
      loadContacts();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting contacts:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Confirm merge contacts
  const confirmMergeContacts = async (parentContactId: string, childContactId: string) => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      await contactsService.mergeContacts({
        base_contact_id: parentContactId,
        mergee_contact_id: childContactId,
      });

      toast.success(t('messages.mergeSuccess'));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedContactIds: [] }));
      loadContacts();

      setMergeModalOpen(false);
      setContactsToMerge([]);
    } catch (error) {
      console.error('Error merging contacts:', error);
      toast.error(t('messages.mergeError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle contact form submission
  const handleContactFormSubmit = async (data: ContactFormData) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingContact ? 'update' : 'create']: true },
    }));

    try {
      if (editingContact) {
        // Update existing contact
        const updatedContact = await contactsService.updateContact(editingContact.id, data);
        toast.success(t('messages.updateSuccess'));

        setState(prev => {
          const oldContact = prev.contacts.find(c => c.id === editingContact.id);

          if (!oldContact) {
            loadContacts();
            return prev;
          }

          const newContacts = prev.contacts.map(contact =>
            contact.id === editingContact.id ? updatedContact : contact,
          );

          return {
            ...prev,
            contacts: newContacts,
          };
        });

        // Close modal and clear editing state AFTER state update
        setContactModalOpen(false);
        setEditingContact(null);
      } else {
        // Create new contact
        await contactsService.createContact(data);
        toast.success(t('messages.createSuccess'));

        // Close modal and clear editing state
        setContactModalOpen(false);
        setEditingContact(null);

        // Refresh the entire list for new contacts
        loadContacts();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(editingContact ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle conversation creation
  const handleConversationCreated = (conversationId: string) => {
    toast.success(t('messages.conversationStarted'));
    // TODO: Navigate to conversation
    console.log('Navigate to conversation:', conversationId);
  };

  // Handle modal close
  const handleContactModalClose = (open: boolean) => {
    if (!open) {
      setContactModalOpen(false);
      setEditingContact(null);
    }
  };

  const handleConversationModalClose = (open: boolean) => {
    if (!open) {
      setConversationModalOpen(false);
      setConversationContact(null);
    }
  };

  const handleDetailsModalClose = (open: boolean) => {
    if (!open) {
      setDetailsModalOpen(false);
      setDetailsContact(null);
      if (contactIdFromRoute) {
        navigate('/contacts', { replace: true });
      }
    }
  };

  const handleEventsModalClose = (open: boolean) => {
    if (!open) {
      setEventsModalOpen(false);
      setEventsContact(null);
    }
  };

  const handleMergeModalClose = (open: boolean) => {
    if (!open) {
      setMergeModalOpen(false);
      setContactsToMerge([]);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <ContactsTour />
      <div data-tour="contacts-header">
      <ContactsHeader
        totalCount={state.meta.pagination.total}
        selectedCount={state.selectedContactIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onNewContact={handleCreateContact}
        onImport={handleImportContacts}
        onExport={handleExportContacts}
        onFilter={handleOpenFilter}
        onBulkDelete={handleBulkDelete}
        onMergeContacts={handleMergeContacts}
        onClearSelection={() => setState(prev => ({ ...prev, selectedContactIds: [] }))}
        activeFilters={appliedFilters}
        showFilters={true}
      />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end mb-3" data-tour="contacts-view-toggle">
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
      <div className="flex-1 overflow-auto" data-tour="contacts-list">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.contacts')}</div>
          </div>
        ) : state.contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.action'),
              onClick: handleCreateContact,
            }}
            className="h-full"
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onViewDetails={handleContactClick}
                onStartConversation={handleStartConversation}
                onEdit={handleEditContact}
                onViewEvents={handleViewEvents}
              />
            ))}
          </div>
        ) : (
          <ContactsTable
            contacts={state.contacts}
            selectedContacts={state.contacts.filter(contact =>
              state.selectedContactIds.includes(contact.id),
            )}
            loading={state.loading.list}
            onSelectionChange={contacts =>
              setState(prev => ({
                ...prev,
                selectedContactIds: contacts.map(c => c.id),
              }))
            }
            onContactClick={handleContactClick}
            onStartConversation={handleStartConversation}
            onEditContact={handleEditContact}
            onViewEvents={handleViewEvents}
            onCreateContact={handleCreateContact}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
              loadContacts({
                sort: column as
                  | 'name'
                  | 'email'
                  | 'phone_number'
                  | 'last_activity_at'
                  | 'created_at',
                order: newOrder,
              });
            }}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <div data-tour="contacts-pagination">
          <ContactsPagination
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

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.bulkDelete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.bulkDelete.description', { count: state.selectedContactIds.length })}
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

      {/* Contact Modal */}
      <ContactModal
        open={contactModalOpen}
        onOpenChange={handleContactModalClose}
        contact={editingContact || undefined}
        isNew={!editingContact}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleContactFormSubmit}
      />

      {/* Start Conversation Modal */}
      {conversationContact && (
        <StartConversationModal
          open={conversationModalOpen}
          onOpenChange={handleConversationModalClose}
          contact={conversationContact}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {/* Contact Details Modal */}
      <ContactDetails
        open={detailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        contact={detailsContact}
        onEdit={contact => {
          setDetailsModalOpen(false);
          setEditingContact(contact);
          setContactModalOpen(true);
        }}
        onStartConversation={contact => {
          setDetailsModalOpen(false);
          setConversationContact(contact);
          setConversationModalOpen(true);
        }}
        onNavigateToContact={async contactId => {
          try {
            const response = await contactsService.getContact(contactId);
            setDetailsContact(response);
            setDetailsModalOpen(true);
          } catch (error) {
            console.error('Error loading contact:', error);
            toast.error(t('errors.loadContact'));
          }
        }}
        onContactUpdated={() => {
          loadContacts();
        }}
      />

      {/* Contacts Filter Modal */}
      <ContactsFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={activeFilters}
        onFiltersChange={setActiveFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Contact Import Modal */}
      <ContactImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportModalSubmit}
        loading={state.loading.import}
      />

      {/* Contact Export Modal */}
      <ContactExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExportModalSubmit}
        loading={state.loading.export}
        activeFilters={activeFilters}
        totalCount={state.meta.pagination.total}
      />

      {/* Contact Events Modal */}
      <ContactEventsModal
        open={eventsModalOpen}
        onOpenChange={handleEventsModalClose}
        contact={eventsContact}
      />

      {/* Contact Merge Modal */}
      <ContactMergeModal
        open={mergeModalOpen}
        onOpenChange={handleMergeModalClose}
        contacts={contactsToMerge}
        onConfirm={confirmMergeContacts}
        loading={state.loading.bulk}
      />
    </div>
  );
}
