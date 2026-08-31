import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@evoapi/design-system';
import { Edit, Trash2, Eye, Globe, Lock } from 'lucide-react';
import { Macro } from '@/types/automation';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePermissions } from '@/contexts/PermissionsContext';

interface MacrosTableProps {
  macros: Macro[];
  selectedMacros: Macro[];
  loading?: boolean;
  onSelectionChange: (macros: Macro[]) => void;
  onMacroClick: (macro: Macro) => void;
  onEditMacro: (macro: Macro) => void;
  onDeleteMacro: (macro: Macro) => void;
  onCreateMacro?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  getRowKey?: (macro: Macro) => string;
  canDeleteMacro?: (macro: Macro) => boolean;
  canEditMacro?: (macro: Macro) => boolean;
}

export default function MacrosTable({
  macros,
  selectedMacros,
  loading,
  onSelectionChange,
  onMacroClick,
  onEditMacro,
  onDeleteMacro,
  onCreateMacro,
  sortBy,
  sortOrder,
  onSort,
  getRowKey,
  canDeleteMacro,
  canEditMacro,
}: MacrosTableProps) {
  const { t } = useLanguage('macros');
  const { formatDateTime } = useDateFormat();
  const { can, isReady } = usePermissions();

  const getVisibilityLabel = (visibility: string) => {
    return visibility === 'global' ? t('table.visibility.public') : t('table.visibility.private');
  };

  const getVisibilityIcon = (visibility: string) => {
    return visibility === 'global' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />;
  };

  const getVisibilityColor = (visibility: string) => {
    return visibility === 'global' ? 'text-green-600' : 'text-blue-600';
  };

  const columns: TableColumn<Macro>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      width: '300px',
      render: (macro) => (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">
              {macro.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {macro.actions.length} {macro.actions.length === 1 ? t('table.actionCount', { count: macro.actions.length }) : t('table.actionCount_plural', { count: macro.actions.length })}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'visibility',
      label: t('table.columns.visibility'),
      width: '150px',
      render: (macro) => (
        <div className="flex items-center gap-2">
          <div className={getVisibilityColor(macro.visibility)}>
            {getVisibilityIcon(macro.visibility)}
          </div>
          <Badge
            variant={macro.visibility === 'global' ? 'secondary' : 'outline'}
            className={`text-xs ${getVisibilityColor(macro.visibility)}`}
          >
            {getVisibilityLabel(macro.visibility)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      width: '180px',
      render: (macro) => (
        <div className="text-sm">
          {macro.created_at ? formatDateTime(macro.created_at) : <span className="text-muted-foreground">{t('table.noDate')}</span>}
        </div>
      ),
    },
    {
      key: 'updated_at',
      label: t('table.columns.updatedAt'),
      sortable: true,
      width: '180px',
      render: (macro) => (
        <div className="text-sm">
          {macro.updated_at ? formatDateTime(macro.updated_at) : <span className="text-muted-foreground">{t('table.noDate')}</span>}
        </div>
      ),
    },
    {
      key: 'id',
      label: t('table.columns.id'),
      sortable: true,
      width: '80px',
      render: (macro) => (
        <span className="font-mono text-xs text-muted-foreground">
          {macro.id}
        </span>
      ),
    },
  ];

  const actions: TableAction<Macro>[] = [
    {
      label: t('table.actions.view'),
      icon: <Eye className="h-4 w-4" />,
      onClick: onMacroClick,
    },
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditMacro,
      show: canEditMacro,
    },
    {
      label: t('table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteMacro,
      variant: 'destructive',
      show: canDeleteMacro,
    },
  ];

  return (
    <BaseTable
      data={macros}
      columns={columns}
      actions={actions}
      selectedItems={selectedMacros}
      onSelectionChange={onSelectionChange}
      loading={loading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={getRowKey || ((macro: Macro) => macro.id.toString())}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      emptyAction={onCreateMacro && isReady && can('macros', 'manage') ? {
        label: t('empty.action'),
        onClick: onCreateMacro,
      } : undefined}
    />
  );
}
