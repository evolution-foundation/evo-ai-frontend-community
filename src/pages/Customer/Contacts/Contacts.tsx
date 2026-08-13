import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Users } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { usePermissions } from '@/contexts/PermissionsContext';
import { contactsService } from '@/services/contacts';
import { Contact, ContactsState, ContactsListParams, ContactFormData } from '@/types/contacts';
import { BaseFilter, AppliedFilter, CONTACT_FILTER_TYPES } from '@/types/core';
import { useContactFilterOptions } from '@/hooks/contacts/useContactFilterOptions';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

import ContactsHeader from '@/components/contacts/ContactsHeader';
import ContactsTable from '@/components/contacts/ContactsTable';
import ContactsPagination from '@/components/contacts/ContactsPagination';
import ContactFormPage from '@/components/contacts/ContactFormPage';
import StartConversationModal from '@/components/contacts/StartConversationModal';
import ContactDetailPage from '@/components/contacts/ContactDetailPage';
import ContactsFilterPopover from '@/components/contacts/ContactsFilterPopover';
import ContactImportModal from '@/components/contacts/ContactImportModal';
import ContactExportModal from '@/components/contacts/ContactExportModal';
import ContactMergeModal from '@/components/contacts/ContactMergeModal';
import { AxiosError } from 'axios';
import { ContactsTour } from '@/tours';

// See loadContactsWithSearch's comment: the backend matches phone_number as digits-only,
// so a query that looks like a formatted phone number is searched by its digits instead.
function normalizePhoneLikeQuery(query: string): string {
  const digitsOnly = query.replace(/[^\d]/g, '');
  const looksLikePhone = digitsOnly.length >= 8 && /^[\d\s()+-]+$/.test(query.trim());
  return looksLikePhone ? digitsOnly : query;
}

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
  const { can, isReady: permissionsReady } = usePermissions();
  const [state, setState] = useState<ContactsState>(INITIAL_STATE);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [conversationModalOpen, setConversationModalOpen] = useState(false);
  const [conversationContact, setConversationContact] = useState<Contact | null>(null);
  const [detailsContact, setDetailsContact] = useState<Contact | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsNotFound, setDetailsNotFound] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BaseFilter[]>([]);
  const hasCompanyFilter = activeFilters.some(f => f.attributeKey === 'company');
  // Preload company options while the filter modal is open so the applied chip
  // resolves the company name immediately on Apply (no id-then-name flicker).
  const { companies: companyFilterOptions } = useContactFilterOptions({
    enabled: filterModalOpen || hasCompanyFilter,
  });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [contactsToMerge, setContactsToMerge] = useState<Contact[]>([]);

  // /contacts/new is the only route-derived form mode left — editing an EXISTING
  // contact now happens inline inside ContactDetailsCard (view <-> edit toggle in
  // place), not via a separate route/page.
  const isNewRoute = contactIdFromRoute === 'new';

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
          // Phone numbers are stored/searched as digits-only (E.164, no punctuation) on
          // the backend (`phone_number ILIKE`), so a user pasting/typing the formatted
          // phone they see on screen ("+55 11 91000-0137") would silently match nothing.
          // If the query looks phone-like (8+ digits once punctuation is stripped),
          // search the digits-only form instead — this can never match a name/email,
          // so it's a safe substitution rather than an additional query.
          q: normalizePhoneLikeQuery(query),
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
    if (!contactIdFromRoute || contactIdFromRoute === 'new') {
      setDetailsContact(null);
      setDetailsNotFound(false);
      return;
    }

    let cancelled = false;

    const openContactDetails = async () => {
      setDetailsLoading(true);
      setDetailsNotFound(false);
      try {
        const contact = await contactsService.getContact(contactIdFromRoute);
        if (cancelled) return;
        setDetailsContact(contact);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading contact from route:', error);
        toast.error(t('errors.loadContact'));
        setDetailsContact(null);
        setDetailsNotFound(true);
      } finally {
        if (!cancelled) setDetailsLoading(false);
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

  const resolveFilterAttributeLabel = (attributeKey: string): string => {
    const filterType = CONTACT_FILTER_TYPES.find(f => f.attributeKey === attributeKey);
    return filterType?.attributeI18nKey ? t(filterType.attributeI18nKey) : attributeKey;
  };

  const resolveFilterValueLabel = (filter: BaseFilter): string => {
    // Presence operators carry no value — show the operator name so the chip
    // reads "Company: Present" instead of a dangling "Company:".
    if (filter.filterOperator === 'is_present' || filter.filterOperator === 'is_not_present') {
      return t(`filter.operators.${filter.filterOperator}`);
    }
    const raw = Array.isArray(filter.values) ? filter.values.join(',') : String(filter.values ?? '');
    // The company filter submits a company id (UUID); show its name in the chip.
    if (filter.attributeKey === 'company') {
      return companyFilterOptions.find(o => o.value === raw)?.label ?? raw;
    }
    // blocked submits 'true'/'false'; show the translated option label instead.
    if (filter.attributeKey === 'blocked' && (raw === 'true' || raw === 'false')) {
      return t(`filter.options.blocked.${raw}`);
    }
    return raw;
  };

  const convertFiltersToApplied = (filters: BaseFilter[]): AppliedFilter[] => {
    // BaseHeader renders each chip as `{label}: {value}`, so label is the attribute
    // name and value is the human-readable value (company id resolved to its name).
    return filters.map((filter, index) => ({
      id: `filter-${index}`,
      label: resolveFilterAttributeLabel(filter.attributeKey),
      value: resolveFilterValueLabel(filter),
      onRemove: () => handleRemoveFilter(index),
    }));
  };

  const handleOpenFilter = () => {
    setFilterModalOpen(true);
  };

  const handleApplyFilters = async (filters: BaseFilter[]) => {
    setActiveFilters(filters);

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

  // Derived so company chips re-resolve their name once the options load async.
  const appliedFilters = useMemo(
    () => convertFiltersToApplied(activeFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFilters, companyFilterOptions, t],
  );

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
    navigate(`/contacts/${contact.id}`);
  };

  const handleCreateContact = () => {
    if (!can('contacts', 'create')) {
      toast.error('Você não tem permissão para criar contatos');
      return;
    }
    navigate('/contacts/new');
  };

  // Editing now happens INLINE in ContactDetailsCard (view <-> edit toggle within the
  // same card, matching the prototype) instead of navigating to a separate form route.
  // The table/card list's "Edit" action opens the detail page, where Editar lives.
  const handleEditContact = (contact: Contact) => {
    navigate(`/contacts/${contact.id}`);
  };

  const handleStartConversation = (contact: Contact) => {
    setConversationContact(contact);
    setConversationModalOpen(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await contactsService.deleteContact(contactToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      const deletedId = contactToDelete.id;
      const wasDetailsOpen = detailsContact?.id === deletedId;

      setDeleteDialogOpen(false);
      setContactToDelete(null);

      if (wasDetailsOpen) {
        setDetailsContact(null);
        navigate('/contacts', { replace: true });
      }

      setState(prev => {
        const newTotal = Math.max(0, prev.meta.pagination.total - 1);
        const pageSize = prev.meta.pagination.page_size;
        return {
          ...prev,
          contacts: prev.contacts.filter(c => c.id !== deletedId),
          selectedContactIds: prev.selectedContactIds.filter(id => id !== deletedId),
          meta: {
            ...prev.meta,
            pagination: {
              ...prev.meta.pagination,
              total: newTotal,
              total_pages: Math.ceil(newTotal / pageSize),
            },
          },
        };
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
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

  const handleImportModalSubmit = async (file: File, label?: string) => {
    if (!can('contacts', 'read')) {
      toast.error('Você não tem permissão para visualizar contatos');
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, import: true } }));

    try {
      await contactsService.importContacts(file, label);
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

  // Handles BOTH inline edit-in-place (ContactDetailsCard, existing contact) and the
  // /contacts/new create page — distinguished by isNewRoute, not a separate form route.
  const handleContactFormSubmit = async (data: ContactFormData) => {
    const editingContactId = !isNewRoute ? contactIdFromRoute : undefined;
    setFormLoading(true);

    try {
      if (editingContactId) {
        // Update existing contact
        const updatedContact = await contactsService.updateContact(editingContactId, data);
        toast.success(t('messages.updateSuccess'));

        setDetailsContact(updatedContact);
        setState(prev => {
          const oldContact = prev.contacts.find(c => c.id === editingContactId);

          if (!oldContact) {
            loadContacts();
            return prev;
          }

          const newContacts = prev.contacts.map(contact =>
            contact.id === editingContactId ? updatedContact : contact,
          );

          return {
            ...prev,
            contacts: newContacts,
          };
        });
      } else {
        // Create new contact
        const created = await contactsService.createContact(data);
        toast.success(t('messages.createSuccess'));

        // Refresh the list and land on the new contact's detail page.
        loadContacts();
        navigate(`/contacts/${created.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(editingContactId ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setFormLoading(false);
    }
  };

  // Handle conversation creation
  const handleConversationCreated = (conversationId: string) => {
    toast.success(t('messages.conversationStarted'));
    // TODO: Navigate to conversation
    console.log('Navigate to conversation:', conversationId);
  };

  const handleCancelNewContact = () => {
    navigate('/contacts');
  };

  const handleConversationModalClose = (open: boolean) => {
    if (!open) {
      setConversationModalOpen(false);
      setConversationContact(null);
    }
  };

  const handleCloseContactDetails = () => {
    setDetailsContact(null);
    navigate('/contacts', { replace: true });
  };

  const handleMergeModalClose = (open: boolean) => {
    if (!open) {
      setMergeModalOpen(false);
      setContactsToMerge([]);
    }
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4">
      <ContactsTour />
      {isNewRoute ? (
        <ContactFormPage
          loading={formLoading}
          onSubmit={handleContactFormSubmit}
          onClose={handleCancelNewContact}
        />
      ) : contactIdFromRoute ? (
        <ContactDetailPage
          contact={detailsContact}
          loading={detailsLoading}
          notFound={detailsNotFound}
          formSaving={formLoading}
          onClose={handleCloseContactDetails}
          onSave={handleContactFormSubmit}
          onStartConversation={contact => {
            setConversationContact(contact);
            setConversationModalOpen(true);
          }}
          onContactUpdated={() => {
            loadContacts();
          }}
        />
      ) : (
        <>
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
            showFilters={false}
          />
          </div>

          {/* Filter Popover trigger */}
          <div className="flex items-center justify-end mt-3 mb-2 sm:mt-6 sm:mb-3">
            <ContactsFilterPopover
              open={filterModalOpen}
              onOpenChange={setFilterModalOpen}
              filters={activeFilters}
              onFiltersChange={setActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              activeFiltersCount={activeFilters.length}
            />
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
                onDeleteContact={can('contacts', 'delete') ? handleDeleteContact : undefined}
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
            <div data-tour="contacts-pagination" className="mt-4 border-t border-border pt-4">
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
        </>
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

      {/* Single Contact Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={open => {
        if (!open && !state.loading.delete) {
          setDeleteDialogOpen(false);
          setContactToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.deleteContact.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.deleteContact.description', { name: contactToDelete?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteDialogOpen(false); setContactToDelete(null); }}
              disabled={state.loading.delete}
            >
              {t('dialog.deleteContact.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteContact} disabled={state.loading.delete}>
              {state.loading.delete
                ? t('dialog.deleteContact.deleting')
                : t('dialog.deleteContact.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Conversation Modal */}
      {conversationContact && (
        <StartConversationModal
          open={conversationModalOpen}
          onOpenChange={handleConversationModalClose}
          contact={conversationContact}
          onConversationCreated={handleConversationCreated}
        />
      )}

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
