import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Edit, X, Clock, AlertCircle } from 'lucide-react';
import { ScheduledAction } from '@/types/automation';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { Badge } from '@evoapi/design-system';

interface ScheduledActionsTableProps {
  actions: ScheduledAction[];
  selectedActions: ScheduledAction[];
  loading?: boolean;
  onSelectionChange: (actions: ScheduledAction[]) => void;
  onEdit: (action: ScheduledAction) => void;
  onCancel: (actionId: string) => void;
  onContactClick: (contactId: string) => void;
}

export default function ScheduledActionsTable({
  actions: scheduledActions,
  selectedActions,
  loading,
  onSelectionChange,
  onEdit,
  onCancel,
  onContactClick,
}: ScheduledActionsTableProps) {
  const { t } = useLanguage('contacts');

  const getActionTypeLabel = (type: string) => {
    return t(`scheduledActions.actions.${type}`) || type;
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

  const columns: TableColumn<ScheduledAction>[] = [
    {
      key: 'action_type',
      label: t('scheduledActions.table.columns.actionType'),
      sortable: true,
      render: action => (
        <div className="font-medium">{getActionTypeLabel(action.action_type)}</div>
      ),
    },
    {
      key: 'status',
      label: t('scheduledActions.table.columns.status'),
      sortable: true,
      render: action => getStatusBadge(action.status),
    },
    {
      key: 'contact',
      label: t('scheduledActions.table.columns.contact'),
      sortable: false,
      render: action => {
        const contactId = action.contact_id;
        if (!contactId) return '-';
        return (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={e => {
              e.stopPropagation();
              onContactClick(contactId);
            }}
          >
            {contactId}
          </button>
        );
      },
    },
    {
      key: 'scheduled_for',
      label: t('scheduledActions.table.columns.scheduledFor'),
      sortable: true,
      render: action => (
        <div className="space-y-1">
          <div className="text-sm">
            {new Date(action.scheduled_for).toLocaleString(getFormattingLocale())}
          </div>
          {action.status === 'scheduled' && !action.overdue && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{t('scheduledActions.timePrefix')} {getTimeUntilExecution(action.scheduled_for)}</span>
            </div>
          )}
          {action.overdue && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{t('scheduledActions.overdue')}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('scheduledActions.table.columns.createdAt'),
      sortable: true,
      render: action => (
        <div className="text-sm text-muted-foreground">
          {new Date(action.created_at).toLocaleString(getFormattingLocale())}
        </div>
      ),
    },
  ];

  const tableActions: TableAction<ScheduledAction>[] = [
    {
      label: t('scheduledActions.table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
      show: action => action.status === 'scheduled',
    },
    {
      label: t('scheduledActions.table.actions.cancel'),
      icon: <X className="h-4 w-4" />,
      onClick: action => onCancel(action.id),
      show: action => action.status === 'scheduled' || action.status === 'executing',
      variant: 'destructive',
    },
  ];

  return (
    <BaseTable
      data={scheduledActions}
      columns={columns}
      actions={tableActions}
      selectable={true}
      selectedItems={selectedActions}
      onSelectionChange={onSelectionChange}
      loading={loading}
      getRowKey={action => action.id}
      emptyTitle={t('scheduledActions.empty')}
      emptyDescription={t('scheduledActions.emptyDescription')}
    />
  );
}
