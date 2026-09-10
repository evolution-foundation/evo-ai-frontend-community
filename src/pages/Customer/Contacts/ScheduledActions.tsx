import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ScheduledActionsTour } from '@/tours';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import { ScheduledAction } from '@/types/automation';
import { ScheduleActionModal } from '@/components/scheduledActions/ScheduleActionModal';
import ScheduledActionsHeader from '@/components/scheduledActions/ScheduledActionsHeader';
import ScheduledActionsTable from '@/components/scheduledActions/ScheduledActionsTable';
import EmptyState from '@/components/base/EmptyState';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduledActionsState {
  actions: ScheduledAction[];
  selectedActionIds: string[];
  meta: {
    count: number;
    total_count: number;
    current_page: number;
    per_page: number;
    total_pages: number;
  };
  loading: {
    list: boolean;
  };
  searchQuery: string;
  statusFilter: string | null;
}

const INITIAL_STATE: ScheduledActionsState = {
  actions: [],
  selectedActionIds: [],
  meta: {
    count: 0,
    total_count: 0,
    current_page: 1,
    per_page: 20,
    total_pages: 0,
  },
  loading: {
    list: false,
  },
  searchQuery: '',
  statusFilter: null,
};

export default function ScheduledActions() {
  const { t } = useLanguage('contacts');
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [state, setState] = useState<ScheduledActionsState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ScheduledAction | null>(null);
  const [, setUpdateTrigger] = useState(0); // Force re-render for countdown updates

  // Load scheduled actions
  const loadActions = useCallback(
    async (params?: { page?: number; per_page?: number; status?: string; search?: string }) => {

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const queryParams: Record<string, any> = {
          page: params?.page || state.meta.current_page,
          per_page: params?.per_page || state.meta.per_page,
        };

        if (params?.status || state.statusFilter) {
          queryParams.status = params?.status || state.statusFilter;
        }

        if (params?.search || state.searchQuery) {
          queryParams.search = params?.search || state.searchQuery;
        }

        const response = await scheduledActionsService.list(queryParams);
        
        // API returns an array of ScheduledAction[]
        const actionsArray = Array.isArray(response) ? response : [];
        
        setState(prev => ({
          ...prev,
          actions: actionsArray,
          meta: {
            ...prev.meta,
            current_page: params?.page || prev.meta.current_page,
            per_page: params?.per_page || prev.meta.per_page,
            total_count: actionsArray.length,
            count: actionsArray.length,
            total_pages: Math.ceil(actionsArray.length / (params?.per_page || prev.meta.per_page)),
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error: any) {
        console.error('Error loading scheduled actions:', error);
        toast.error(error.response?.data?.error || t('scheduledActions.errors.loadFailed'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [state.meta.current_page, state.meta.per_page, state.statusFilter, state.searchQuery, t],
  );

  usePermissionGatedLoad({
    resource: 'contacts',
    load: loadActions,
    onDenied: () => toast.error('Você não tem permissão para visualizar ações agendadas'),
  });

  // Set up interval to update countdown every second
  useEffect(() => {
    const hasScheduledActions = state.actions.some(
      action => action.status === 'scheduled' && !action.overdue
    );

    if (!hasScheduledActions) return;

    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.actions]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, current_page: 1 },
    }));

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadActions({ page: 1, search: query.trim() || undefined });
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleCreate = () => {
    setEditingAction(null);
    setModalOpen(true);
  };

  const handleEdit = (action: ScheduledAction) => {
    setEditingAction(action);
    setModalOpen(true);
  };

  const handleCancel = async (actionId: string) => {
    try {
      await scheduledActionsService.cancel(actionId);
      toast.success(t('scheduledActions.messages.cancelled'));
      await loadActions();
      setState(prev => ({
        ...prev,
        selectedActionIds: prev.selectedActionIds.filter(id => id !== actionId),
      }));
    } catch (error: any) {
      console.error('Error cancelling action:', error);
      toast.error(error.response?.data?.error || t('scheduledActions.errors.cancelFailed'));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAction(null);
    loadActions();
  };

  const handleSelectionChange = (actions: ScheduledAction[]) => {
    setState(prev => ({
      ...prev,
      selectedActionIds: actions.map(a => a.id),
    }));
  };

  const handleClearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedActionIds: [],
    }));
  };

  const handleBulkCancel = async () => {
    if (state.selectedActionIds.length === 0) return;

    try {
      await Promise.all(
        state.selectedActionIds.map(id => scheduledActionsService.cancel(id))
      );
      toast.success(t('scheduledActions.messages.bulkCancelled', { count: state.selectedActionIds.length }));
      await loadActions();
      handleClearSelection();
    } catch (error: any) {
      console.error('Error cancelling actions:', error);
      toast.error(error.response?.data?.error || t('scheduledActions.errors.bulkCancelFailed'));
    }
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const getFilteredActions = () => {
    return state.actions;
  };

  const filteredActions = getFilteredActions();

  return (
    <div className="h-full flex flex-col p-6" data-tour="scheduled-actions-page">
      <ScheduledActionsTour />
      <div data-tour="scheduled-actions-header">
      <ScheduledActionsHeader
        totalCount={state.meta.total_count}
        selectedCount={state.selectedActionIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onNewAction={handleCreate}
        onBulkCancel={handleBulkCancel}
        onClearSelection={handleClearSelection}
      />
      </div>

      <div data-tour="scheduled-actions-content">
      {state.loading.list && state.actions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('scheduledActions.loading')}</p>
          </div>
        </div>
      ) : filteredActions.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('scheduledActions.empty')}
          description={t('scheduledActions.emptyDescription')}
          action={
            can('contacts', 'create') ? {
              label: t('scheduledActions.newAction'),
              onClick: handleCreate,
            } : undefined
          }
        />
      ) : (
        <>
          <ScheduledActionsTable
            actions={filteredActions}
            selectedActions={state.actions.filter(a => state.selectedActionIds.includes(a.id))}
            loading={state.loading.list}
            onSelectionChange={handleSelectionChange}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onContactClick={handleContactClick}
          />

          {state.meta.total_pages > 1 && (
            <div className="mt-4 flex justify-center">
              {/* Pagination component would go here */}
              <div className="text-sm text-muted-foreground">
                {t('scheduledActions.pagination', {
                  page: state.meta.current_page,
                  totalPages: state.meta.total_pages,
                  total: state.meta.total_count,
                })}
              </div>
            </div>
          )}
        </>
      )}

      </div>

      {modalOpen && (
        <ScheduleActionModal
          open={modalOpen}
          onClose={handleModalClose}
          contactId={editingAction?.contact_id}
          action={editingAction}
        />
      )}
    </div>
  );
}
