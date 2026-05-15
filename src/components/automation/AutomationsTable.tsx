import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@evoapi/design-system';
import { Edit, Trash2, Copy } from 'lucide-react';
import type { AutomationRule } from '@/types/automation';
import BaseTable, { type TableColumn, type TableAction } from '@/components/base/BaseTable';
import { useDateFormat } from '@/hooks/useDateFormat';

interface Props {
  automations: AutomationRule[];
  selected: AutomationRule[];
  loading?: boolean;
  onSelectionChange: (items: AutomationRule[]) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onClone: (rule: AutomationRule) => void;
  onCreate: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canClone: boolean;
}

export default function AutomationsTable({
  automations,
  selected,
  loading,
  onSelectionChange,
  onEdit,
  onDelete,
  onClone,
  onCreate,
  canEdit,
  canDelete,
  canClone,
}: Props) {
  const { t } = useLanguage('automation');
  const { formatDateTime } = useDateFormat();

  const columns: TableColumn<AutomationRule>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      width: '300px',
      render: (rule) => (
        <div>
          <div className="font-medium truncate">{rule.name}</div>
          {rule.description && (
            <div className="text-xs text-muted-foreground truncate">{rule.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'event_name',
      label: t('table.columns.event'),
      width: '200px',
      render: (rule) => (
        <Badge variant="outline">{t(`form.fields.event.options.${rule.event_name}`)}</Badge>
      ),
    },
    {
      key: 'active',
      label: t('table.columns.status'),
      width: '120px',
      render: (rule) => (
        <Badge variant={rule.active ? 'default' : 'secondary'}>
          {rule.active ? t('table.status.active') : t('table.status.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions_count',
      label: t('table.columns.actionsCount'),
      width: '120px',
      render: (rule) => (
        <span className="text-sm text-muted-foreground">{rule.actions?.length ?? 0}</span>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      width: '180px',
      render: (rule) => {
        const ts = (rule as unknown as { created_at?: string; created_on?: number }).created_at;
        const fallback = (rule as unknown as { created_on?: number }).created_on;
        const value = ts ?? (fallback ? new Date(fallback).toISOString() : null);
        return (
          <div className="text-sm">
            {value ? formatDateTime(value) : <span className="text-muted-foreground">—</span>}
          </div>
        );
      },
    },
  ];

  const actions: TableAction<AutomationRule>[] = [
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
      show: () => canEdit,
    },
    {
      label: t('table.actions.clone'),
      icon: <Copy className="h-4 w-4" />,
      onClick: onClone,
      show: () => canClone,
    },
    {
      label: t('table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive',
      show: () => canDelete,
    },
  ];

  return (
    <BaseTable
      data={automations}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selected}
      onSelectionChange={onSelectionChange}
      loading={loading}
      getRowKey={(rule) => rule.id}
      emptyTitle={t('page.empty.title')}
      emptyDescription={t('page.empty.description')}
      emptyAction={{
        label: t('page.empty.action'),
        onClick: onCreate,
      }}
    />
  );
}
