import { useLanguage } from '@/hooks/useLanguage';
import { Edit, Trash2 } from 'lucide-react';
import BaseTable from '@/components/base/BaseTable';
import { Label } from '@/types/settings';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface LabelsTableProps {
  labels: Label[];
  selectedLabels: Label[];
  loading: boolean;
  onSelectionChange: (labels: Label[]) => void;
  onEditLabel: (label: Label) => void;
  onDeleteLabel: (label: Label) => void;
  onCreateLabel: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export default function LabelsTable({
  labels,
  selectedLabels,
  loading,
  onSelectionChange,
  onEditLabel,
  onDeleteLabel,
  onSort,
  sortBy,
  sortOrder,
}: LabelsTableProps) {
  const { t } = useLanguage('labels');
  const { can } = useUserPermissions();

  const columns = [
    {
      key: 'title',
      label: t('table.columns.name'),
      sortable: true,
      render: (label: Label) => (
        <div className="font-medium">{label.title}</div>
      ),
    },
    {
      key: 'description',
      label: t('table.columns.description'),
      render: (label: Label) => (
        <div className="text-muted-foreground max-w-md truncate">
          {label.description || t('table.noDescription')}
        </div>
      ),
    },
    {
      key: 'color',
      label: t('table.columns.color'),
      render: (label: Label) => (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: label.color }}
          />
          <span className="text-xs font-mono">{label.color}</span>
        </div>
      ),
    },
    {
      key: 'show_on_sidebar',
      label: t('table.columns.sidebar'),
      render: (label: Label) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs ${
            label.show_on_sidebar
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}>
            {label.show_on_sidebar ? t('table.sidebar.yes') : t('table.sidebar.no')}
          </span>
        </div>
      ),
    },
    {
      key: 'usage_count',
      label: t('table.columns.usage'),
      render: (label: Label) => (
        <span className="text-sm text-muted-foreground">{label.usage_count ?? 0}</span>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: (label: Label) => (
        <div className="text-sm text-muted-foreground">
          {new Date(label.created_at).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
  ];

  const actions = [
    ...(can('labels', 'update') ? [{
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditLabel,
    }] : []),
    ...(can('labels', 'delete') ? [{
      label: t('table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteLabel,
      variant: 'destructive' as const,
    }] : []),
  ];

  return (
    <BaseTable
      data={labels}
      columns={columns}
      actions={actions}
      loading={loading}
      getRowKey={(label) => label.id.toString()}
      selectable={true}
      selectedItems={selectedLabels}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  );
}
