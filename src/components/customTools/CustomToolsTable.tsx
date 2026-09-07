import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge, Button } from '@evoapi/design-system';
import { Edit, Trash2, Wand, Loader2, Globe } from 'lucide-react';
import { CustomTool } from '@/types/ai';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { usePermissions } from '@/contexts/PermissionsContext';

interface CustomToolsTableProps {
  tools: CustomTool[];
  selectedTools: CustomTool[];
  loading?: boolean;
  onSelectionChange: (tools: CustomTool[]) => void;
  onToolClick: (tool: CustomTool) => void;
  onEditTool: (tool: CustomTool) => void;
  onDeleteTool: (tool: CustomTool) => void;
  onTestTool: (tool: CustomTool) => void;
  onCreateTool?: () => void;
  testingToolId?: string | null;
}

export default function CustomToolsTable({
  tools,
  selectedTools,
  loading,
  onSelectionChange,
  onToolClick,
  onEditTool,
  onDeleteTool,
  onTestTool,
  onCreateTool,
  testingToolId,
}: CustomToolsTableProps) {
  const { t } = useLanguage('customTools');
  const { can, isReady } = usePermissions();
  const toolsList = tools || [];

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'POST':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'PUT':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  const columns: TableColumn<CustomTool>[] = [
    {
      key: 'tool',
      label: t('table.columns.tool'),
      sortable: true,
      render: tool => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onToolClick(tool)}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{tool.name || t('table.noName')}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={`text-xs ${getMethodColor(tool.method)}`}>
                {tool.method}
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
      render: tool => (
        <div className="max-w-[300px]">
          <p className="text-sm text-muted-foreground truncate">
            {tool.description || t('table.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'endpoint',
      label: t('table.columns.endpoint'),
      sortable: false,
      render: tool => (
        <div className="max-w-[200px]">
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {tool.endpoint}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'tags',
      label: t('table.columns.tags'),
      sortable: false,
      render: tool => (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {tool.tags && tool.tags.length > 0 ? (
            tool.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{t('table.noTags')}</span>
          )}
          {tool.tags && tool.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{tool.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: tool => (
        <span className="text-sm text-muted-foreground">
          {new Date(tool.created_at).toLocaleDateString(getFormattingLocale())}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('table.columns.test'),
      sortable: false,
      render: tool => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTestTool(tool);
          }}
          disabled={testingToolId === tool.id}
          className="gap-1"
        >
          {testingToolId === tool.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand className="h-3 w-3" />
          )}
          {t('table.actions.test')}
        </Button>
      ),
    },
  ];

  const actions: TableAction<CustomTool>[] = [
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditTool,
      show: () => isReady && can('ai_custom_tools', 'update'),
    },
    {
      label: t('table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteTool,
      variant: 'destructive' as const,
      show: () => isReady && can('ai_custom_tools', 'delete'),
    },
  ];

  return (
    <BaseTable<CustomTool>
      data={toolsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedTools}
      onSelectionChange={onSelectionChange}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Wand}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateTool && isReady && can('ai_custom_tools', 'create')
          ? {
              label: t('table.actions.create'),
              onClick: onCreateTool,
            }
          : undefined
      }
      getRowKey={tool => String(tool.id)}
      className="border-0 shadow-none"
    />
  );
}
