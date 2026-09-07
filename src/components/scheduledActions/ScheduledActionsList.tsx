import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge } from '@evoapi/design-system';
import { CalendarClock, Plus, Edit, X, Clock, AlertCircle } from 'lucide-react';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import { ScheduleActionModal } from './ScheduleActionModal';
import { useLanguage } from '@/hooks/useLanguage';
import { ScheduledAction } from '@/types/automation';

interface ScheduledActionsListProps {
  contactId: string;
}

export function ScheduledActionsList({ contactId }: ScheduledActionsListProps) {
  const { t } = useLanguage('contacts');
  const [actions, setActions] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ScheduledAction | null>(null);
  const [, setUpdateTrigger] = useState(0); // Force re-render for countdown updates
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const sortActions = (actionsToSort: ScheduledAction[]) => {
    return [...actionsToSort].sort((a, b) => {
      // Define status priority: scheduled/executing first, failed second, completed/cancelled last
      const statusPriority: Record<string, number> = {
        scheduled: 0,
        executing: 0,
        failed: 1,
        completed: 2,
        cancelled: 2,
      };

      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;

      // If different priority groups, sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same priority group, sort by date
      const dateA = new Date(a.scheduled_for).getTime();
      const dateB = new Date(b.scheduled_for).getTime();

      if (priorityA === 0) {
        // Pending: soonest first (ascending)
        return dateA - dateB;
      } else if (priorityA === 1) {
        // Failed: oldest first (ascending - show what failed earliest)
        return dateA - dateB;
      } else {
        // Completed/Cancelled: newest first (descending - show most recent)
        return dateB - dateA;
      }
    });
  };

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await scheduledActionsService.listByContact(contactId);
      setActions(sortActions(data));
    } catch (error) {
      console.error('Error loading scheduled actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [contactId]);

  // Set up interval to update countdown every second
  useEffect(() => {
    const hasScheduledActions = actions.some(
      action => action.status === 'scheduled' && !action.overdue,
    );

    if (!hasScheduledActions) return;

    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [actions]);

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
      await loadActions();
    } catch (error) {
      console.error('Error cancelling action:', error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAction(null);
    loadActions();
  };

  const getFilteredActions = () => {
    if (!statusFilter) return actions;

    if (statusFilter === 'pending') {
      return actions.filter(a => a.status === 'scheduled' || a.status === 'executing');
    } else if (statusFilter === 'completed') {
      return actions.filter(a => a.status === 'completed');
    } else if (statusFilter === 'cancelled') {
      return actions.filter(a => a.status === 'cancelled' || a.status === 'failed');
    }

    return actions;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      executing: 'secondary',
      completed: 'outline',
      failed: 'destructive',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getActionTypeLabel = (type: string) => {
    return t(`scheduledActions.actions.${type}`) || type;
  };

  const getTimeUntilExecution = (scheduledFor: string) => {
    const now = new Date().getTime();
    const scheduledTime = new Date(scheduledFor).getTime();
    const diff = Math.max(0, Math.floor((scheduledTime - now) / 1000));

    if (diff === 0) return t('scheduledActions.timeNow');

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (days > 0) {
      return t('scheduledActions.timeFormat.daysHours', { days, hours });
    } else if (hours > 0) {
      return t('scheduledActions.timeFormat.hoursMinutes', { hours, minutes });
    } else if (minutes > 0) {
      return t('scheduledActions.timeFormat.minutesSeconds', { minutes, seconds });
    } else {
      return t('scheduledActions.timeFormat.seconds', { seconds });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('scheduledActions.loading')}</p>
      </div>
    );
  }

  const filteredActions = getFilteredActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('scheduledActions.label')}</h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('scheduledActions.newAction')}
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          {t('scheduledActions.filter')}
        </span>
        <Button
          variant={statusFilter === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(null)}
        >
          {t('scheduledActions.filterAll')} ({actions.length})
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
        >
          {t('scheduledActions.filterPending')} (
          {actions.filter(a => a.status === 'scheduled' || a.status === 'executing').length})
        </Button>
        <Button
          variant={statusFilter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('completed')}
        >
          {t('scheduledActions.filterCompleted')} (
          {actions.filter(a => a.status === 'completed').length})
        </Button>
        <Button
          variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('cancelled')}
        >
          {t('scheduledActions.filterCancelled')} (
          {actions.filter(a => a.status === 'cancelled' || a.status === 'failed').length})
        </Button>
      </div>

      {actions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('scheduledActions.empty')}</p>
          </CardContent>
        </Card>
      ) : filteredActions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('scheduledActions.emptyFiltered')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActions.map(action => (
            <Card key={action.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{getActionTypeLabel(action.action_type)}</span>
                      {getStatusBadge(action.status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(action.scheduled_for).toLocaleString(getFormattingLocale())}</span>
                        </div>
                        {action.overdue && (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>{t('scheduledActions.overdue')}</span>
                          </div>
                        )}
                      </div>
                      {action.status === 'scheduled' && !action.overdue && (
                        <div className="flex items-center gap-1 text-sm font-medium text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {t('scheduledActions.timePrefix')}{' '}
                            {getTimeUntilExecution(action.scheduled_for)}
                          </span>
                        </div>
                      )}
                    </div>

                    {action.error_message && (
                      <p className="text-sm text-destructive mt-2">{action.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {action.status === 'scheduled' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(action)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCancel(action.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <ScheduleActionModal
          open={modalOpen}
          onClose={handleModalClose}
          contactId={contactId}
          action={editingAction}
        />
      )}
    </div>
  );
}
