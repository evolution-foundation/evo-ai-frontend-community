import { getFormattingLocale } from '@/lib/formattingLocale';
import { CheckCircle, XCircle, Globe, Edit, Trash2, Play } from 'lucide-react';
import { Webhook } from '@/types/integrations';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { Badge } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhooksTableProps {
  webhooks: Webhook[];
  selectedWebhooks: Webhook[];
  loading?: boolean;
  testingWebhookId?: string | null;
  onSelectionChange: (webhooks: Webhook[]) => void;
  onEditWebhook: (webhook: Webhook) => void;
  onDeleteWebhook: (webhook: Webhook) => void;
  onTestWebhook: (webhook: Webhook) => void;
  onCreateWebhook?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function WebhooksTable({
  webhooks,
  selectedWebhooks,
  loading,
  testingWebhookId,
  onSelectionChange,
  onEditWebhook,
  onDeleteWebhook,
  onTestWebhook,
  onCreateWebhook,
  sortBy,
  sortOrder,
  onSort,
}: WebhooksTableProps) {
  const { t } = useLanguage('integrations');
  const webhooksList = webhooks || [];

  const getEventBadgeColor = (event: string) => {
    const eventColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'conversation_created': 'default',
      'conversation_updated': 'secondary',
      'message_created': 'default',
      'contact_created': 'default',
      'contact_updated': 'secondary'
    };
    return eventColors[event] || 'secondary';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return new Intl.DateTimeFormat(getFormattingLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'N/A';
    }
  };

  const columns: TableColumn<Webhook>[] = [
    {
      key: 'url',
      label: t('webhooks.table.columns.webhook'),
      sortable: true,
      render: webhook => (
        <div className="flex items-center gap-3 py-2">
          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{webhook.url}</div>
            {webhook.description && (
              <div className="text-xs text-muted-foreground truncate">
                {webhook.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'subscriptions',
      label: t('webhooks.table.columns.events'),
      sortable: false,
      render: webhook => (
        <div className="flex flex-wrap gap-1">
          {webhook.subscriptions?.slice(0, 2).map((event) => (
            <Badge
              key={event}
              variant={getEventBadgeColor(event)}
              className="text-xs"
            >
              {event.replace('_', ' ')}
            </Badge>
          ))}
          {webhook.subscriptions && webhook.subscriptions.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{webhook.subscriptions.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'enabled',
      label: t('webhooks.table.columns.status'),
      sortable: true,
      render: webhook => (
        webhook.enabled ? (
          <Badge variant="default" className="flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" />
            {t('webhooks.table.status.active')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" />
            {t('webhooks.table.status.inactive')}
          </Badge>
        )
      ),
    },
    {
      key: 'created_at',
      label: t('webhooks.table.columns.createdAt'),
      sortable: true,
      render: webhook => (
        <div className="text-sm text-muted-foreground">
          {formatDate(webhook.created_at)}
        </div>
      ),
    },
  ];

  const actions: TableAction<Webhook>[] = [
    {
      label: t('webhooks.table.actions.test'),
      icon: <Play className="h-4 w-4" />,
      onClick: onTestWebhook,
      show: webhook => !!(webhook.enabled && testingWebhookId !== webhook.id),
    },
    {
      label: t('webhooks.table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditWebhook,
    },
    {
      label: t('webhooks.table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteWebhook,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable<Webhook>
      data={webhooksList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedWebhooks}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('webhooks.table.empty.noResults')}
      emptyIcon={Globe}
      emptyTitle={t('webhooks.table.empty.title')}
      emptyDescription={t('webhooks.table.empty.description')}
      emptyAction={
        onCreateWebhook
          ? {
              label: t('webhooks.table.actions.create'),
              onClick: onCreateWebhook,
            }
          : undefined
      }
      getRowKey={webhook => String(webhook.id)}
      className="border-0 shadow-none"
    />
  );
}