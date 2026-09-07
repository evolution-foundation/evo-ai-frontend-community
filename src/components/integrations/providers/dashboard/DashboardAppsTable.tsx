import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Monitor, Edit, Trash2, ExternalLink } from 'lucide-react';
import { DashboardApp } from '@/types/integrations';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { Badge } from '@evoapi/design-system';

interface DashboardAppsTableProps {
  apps: DashboardApp[];
  selectedApps: DashboardApp[];
  loading?: boolean;
  onSelectionChange: (apps: DashboardApp[]) => void;
  onEditApp: (app: DashboardApp) => void;
  onDeleteApp: (app: DashboardApp) => void;
  onCreateApp?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function DashboardAppsTable({
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
}: DashboardAppsTableProps) {
  const { t } = useLanguage('integrations');
  const appsList = apps || [];

  const getDisplayTypeColor = (type: string) => {
    return type === 'sidebar' ? 'default' : 'secondary';
  };

  const getSidebarMenuLabel = (menu?: string) => {
    const menuLabels: Record<string, string> = {
      conversations: t('dashboardApps.modal.fields.sidebarMenu.conversations'),
      contacts: t('dashboardApps.modal.fields.sidebarMenu.contacts'),
      pipelines: t('dashboardApps.modal.fields.sidebarMenu.pipelines'),
      campaigns: t('dashboardApps.modal.fields.sidebarMenu.campaigns'),
      automation: t('dashboardApps.modal.fields.sidebarMenu.automation'),
      agents: t('dashboardApps.modal.fields.sidebarMenu.agents'),
      channels: t('dashboardApps.modal.fields.sidebarMenu.channels'),
      settings: t('dashboardApps.modal.fields.sidebarMenu.settings'),
    };
    return menuLabels[menu || ''] || menu || '-';
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

  const columns: TableColumn<DashboardApp>[] = [
    {
      key: 'title',
      label: t('dashboardApps.table.columns.application'),
      sortable: true,
      render: app => (
        <div className="flex items-center gap-3 py-2">
          <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{app.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {Array.isArray(app.content) ? app.content[0]?.url : (app.content as any)?.url || 'N/A'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'display_type',
      label: t('dashboardApps.table.columns.type'),
      sortable: true,
      render: app => (
        <Badge variant={getDisplayTypeColor(app.display_type)} className="text-xs">
          {app.display_type === 'sidebar' ? t('dashboardApps.table.displayType.sidebar') : t('dashboardApps.table.displayType.conversation')}
        </Badge>
      ),
    },
    {
      key: 'sidebar_menu',
      label: t('dashboardApps.table.columns.menuPosition'),
      sortable: false,
      render: app => (
        <div className="text-sm">
          {app.display_type === 'sidebar' ? (
            <div>
              <div className="font-medium text-xs">
                {getSidebarMenuLabel(app.sidebar_menu)}
              </div>
              <div className="text-xs text-muted-foreground">
                {app.sidebar_position === 'before' ? t('dashboardApps.table.position.before') : t('dashboardApps.table.position.after')}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('dashboardApps.table.columns.createdAt'),
      sortable: true,
      render: app => (
        <div className="text-sm text-muted-foreground">
          {formatDate(app.created_at)}
        </div>
      ),
    },
  ];

  const actions: TableAction<DashboardApp>[] = [
    {
      label: t('dashboardApps.table.actions.open'),
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: app => {
        const url = Array.isArray(app.content) ? app.content[0]?.url : (app.content as any)?.url;
        if (url) window.open(url, '_blank');
      },
      show: app => !!(Array.isArray(app.content) ? app.content[0]?.url : (app.content as any)?.url),
    },
    {
      label: t('dashboardApps.table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditApp,
    },
    {
      label: t('dashboardApps.table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteApp,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable<DashboardApp>
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
      emptyMessage={t('dashboardApps.table.empty.noResults')}
      emptyIcon={Monitor}
      emptyTitle={t('dashboardApps.table.empty.title')}
      emptyDescription={t('dashboardApps.table.empty.description')}
      emptyAction={
        onCreateApp
          ? {
              label: t('dashboardApps.table.actions.create'),
              onClick: onCreateApp,
            }
          : undefined
      }
      getRowKey={app => String(app.id)}
      className="border-0 shadow-none"
    />
  );
}
