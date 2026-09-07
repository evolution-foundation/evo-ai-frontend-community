import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge, Button } from '@evoapi/design-system';
import { Edit, Trash2, TestTube, Loader2, ExternalLink } from 'lucide-react';
import { CustomMcpServer } from '@/types/ai';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { usePermissions } from '@/contexts/PermissionsContext';

interface CustomMCPServersTableProps {
  servers: CustomMcpServer[];
  selectedServers: CustomMcpServer[];
  loading?: boolean;
  onSelectionChange: (servers: CustomMcpServer[]) => void;
  onServerClick: (server: CustomMcpServer) => void;
  onEditServer: (server: CustomMcpServer) => void;
  onDeleteServer: (server: CustomMcpServer) => void;
  onTestServer: (server: CustomMcpServer) => void;
  onCreateServer?: () => void;
  testingServerId?: string | null;
}

export default function CustomMCPServersTable({
  servers,
  selectedServers,
  loading,
  onSelectionChange,
  onServerClick,
  onEditServer,
  onDeleteServer,
  onTestServer,
  onCreateServer,
  testingServerId,
}: CustomMCPServersTableProps) {
  const { t } = useLanguage('customMcpServers');
  const { can, isReady } = usePermissions();
  const serversList = servers || [];

  const columns: TableColumn<CustomMcpServer>[] = [
    {
      key: 'server',
      label: t('table.columns.server'),
      sortable: true,
      render: server => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onServerClick(server)}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <TestTube className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{server.name || t('table.noName')}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                {t('card.custom')}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: t('table.columns.description'),
      sortable: false,
      render: server => (
        <div className="max-w-[300px]">
          <p className="text-sm text-muted-foreground truncate">
            {server.description || t('table.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'url',
      label: t('table.columns.url'),
      sortable: false,
      render: server => (
        <div className="max-w-[200px]">
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {server.url}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'tools',
      label: t('table.columns.tools'),
      sortable: false,
      render: server => (
        <div className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-muted-foreground">
            {server.tools?.length || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'timeout',
      label: t('table.columns.timeout'),
      sortable: false,
      render: server => (
        <span className="text-sm text-muted-foreground">
          {server.timeout}s
        </span>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: server => (
        <span className="text-sm text-muted-foreground">
          {new Date(server.created_at).toLocaleDateString(getFormattingLocale())}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('table.columns.test'),
      sortable: false,
      render: server => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTestServer(server);
          }}
          disabled={testingServerId === server.id}
          className="gap-1"
        >
          {testingServerId === server.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <TestTube className="h-3 w-3" />
          )}
          {t('actions.test')}
        </Button>
      ),
    },
  ];

  const actions: TableAction<CustomMcpServer>[] = [
    {
      label: t("actions.edit"),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditServer,
      show: () => isReady && can('ai_custom_mcp_servers', 'update'),
    },
    {
      label: t("actions.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteServer,
      variant: 'destructive' as const,
      show: () => isReady && can('ai_custom_mcp_servers', 'delete'),
    },
  ];

  return (
    <BaseTable<CustomMcpServer>
      data={serversList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedServers}
      onSelectionChange={onSelectionChange}
      loading={loading}
      emptyMessage={t('table.empty.message')}
      emptyIcon={TestTube}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateServer && isReady && can('ai_custom_mcp_servers', 'create')
          ? {
              label: t('table.empty.action'),
              onClick: onCreateServer,
            }
          : undefined
      }
      getRowKey={server => String(server.id)}
      className="border-0 shadow-none"
    />
  );
}
