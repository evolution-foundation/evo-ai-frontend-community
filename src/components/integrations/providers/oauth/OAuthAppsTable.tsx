import { getFormattingLocale } from '@/lib/formattingLocale';
import { Key, Edit, Trash2, Copy, Eye, EyeOff, Shield } from 'lucide-react';
import { OAuthApplication } from '@/types/integrations';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { Badge } from '@evoapi/design-system';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface OAuthAppsTableProps {
  apps: OAuthApplication[];
  selectedApps: OAuthApplication[];
  loading?: boolean;
  onSelectionChange: (apps: OAuthApplication[]) => void;
  onEditApp: (app: OAuthApplication) => void;
  onDeleteApp: (app: OAuthApplication) => void;
  onCreateApp?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  showSecrets?: Record<string, boolean>;
  onToggleSecret?: (appId: string) => void;
}

export default function OAuthAppsTable({
  apps,
  selectedApps,
  loading,
  onSelectionChange,
  onEditApp,
  onDeleteApp,
  onCreateApp,
  sortBy,
  sortOrder,
  onSort,
  showSecrets = {},
  onToggleSecret,
}: OAuthAppsTableProps) {
  const { t } = useLanguage('integrations');
  const appsList = apps || [];

  const handleCopyToClipboard = (text: string, isSecret: boolean) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(isSecret ? t('oauth.messages.clientSecretCopied') : t('oauth.messages.clientIdCopied'));
    });
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
    } catch {
      return 'N/A';
    }
  };

  const columns: TableColumn<OAuthApplication>[] = [
    {
      key: 'name',
      label: t('oauth.table.columns.application'),
      sortable: true,
      render: app => (
        <div className="flex items-center gap-3 py-2">
          <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{app.name}</div>
            {app.redirect_uri && (
              <div className="text-xs text-muted-foreground truncate">
                {app.redirect_uri}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'uid',
      label: t('oauth.table.columns.clientId'),
      sortable: false,
      render: app => (
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded max-w-xs truncate">
            {app.uid}
          </div>
        </div>
      ),
    },
    {
      key: 'scopes',
      label: t('oauth.table.columns.scopes'),
      sortable: false,
      render: app => (
        <div className="flex flex-wrap gap-1">
          {app.scopes?.slice(0, 2).map((scope) => (
            <Badge key={scope} variant="secondary" className="text-xs">
              {scope}
            </Badge>
          ))}
          {app.scopes && app.scopes.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{app.scopes.length - 2}
            </Badge>
          )}
          {!app.scopes?.length && (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('oauth.table.columns.status'),
      sortable: false,
      render: () => (
        <Badge variant="default" className="text-xs flex items-center gap-1 w-fit">
          <Shield className="w-3 h-3" />
          {t('oauth.table.status.active')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: t('oauth.table.columns.createdAt'),
      sortable: true,
      render: app => (
        <div className="text-sm text-muted-foreground">
          {formatDate(app.created_at)}
        </div>
      ),
    },
  ];

  const actions: TableAction<OAuthApplication>[] = [
    {
      label: t('oauth.table.actions.copyClientId'),
      icon: <Copy className="h-4 w-4" />,
      onClick: app => handleCopyToClipboard(app.uid, false),
    },
    {
      label: t('oauth.table.actions.viewSecret'),
      icon: <Eye className="h-4 w-4" />,
      onClick: app => onToggleSecret?.(app.uid),
      show: app => !!onToggleSecret && !showSecrets?.[app.uid],
    },
    {
      label: t('oauth.table.actions.hideSecret'),
      icon: <EyeOff className="h-4 w-4" />,
      onClick: app => onToggleSecret?.(app.uid),
      show: app => !!onToggleSecret && !!showSecrets?.[app.uid],
    },
    {
      label: t('oauth.table.actions.copySecret'),
      icon: <Copy className="h-4 w-4" />,
      onClick: app => handleCopyToClipboard(app.secret || '', true),
      show: app => !!app.secret,
    },
    {
      label: t('oauth.table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditApp,
    },
    {
      label: t('oauth.table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteApp,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable<OAuthApplication>
      data={appsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedApps}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('oauth.table.empty.noResults')}
      emptyIcon={Key}
      emptyTitle={t('oauth.table.empty.title')}
      emptyDescription={t('oauth.table.empty.description')}
      emptyAction={
        onCreateApp
          ? {
              label: t('oauth.table.actions.create'),
              onClick: onCreateApp,
            }
          : undefined
      }
      getRowKey={app => String(app.uid)}
      className="border-0 shadow-none"
    />
  );
}
