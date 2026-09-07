import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Eye,
  Edit,
  Trash2,
  CopyPlus,
  Copy,
  Power,
  Star,
  Lock,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pipeline } from '@/types/analytics';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PipelinesTableProps {
  pipelines: Pipeline[];
  loading: boolean;
  onView: (pipeline: Pipeline) => void;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
  onDuplicate: (pipeline: Pipeline) => void;
  onToggleStatus: (pipeline: Pipeline) => void;
  onSetAsDefault: (pipeline: Pipeline) => void;
  onCreate?: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const TYPE_LABEL_KEY: Record<Pipeline['pipeline_type'], string> = {
  sales: 'pipelinesTable.types.sales',
  support: 'pipelinesTable.types.support',
  marketing: 'pipelinesTable.types.marketing',
  custom: 'pipelinesTable.types.custom',
};

// "Ganhos" = leads that reached a stage explicitly typed as completed
// (stage_type === 'completed'). NO last-stage fallback — the last stage may be a
// "cancelled/lost" stage, so only real completed stages count. Returns both the
// lead count and the summed value of those stages.
function wonSummary(pipeline: Pipeline): { count: number; value: number } {
  const completed = (pipeline.stages || []).filter(
    s => (s.stage_type || '').toLowerCase() === 'completed',
  );
  return completed.reduce(
    (acc, s) => ({
      count: acc.count + (s.item_count ?? s.items?.length ?? 0),
      value: acc.value + (s.total_value ?? 0),
    }),
    { count: 0, value: 0 },
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(getFormattingLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );

export default function PipelinesTable({
  pipelines,
  loading,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onSetAsDefault,
  onCreate,
  sortBy,
  sortOrder,
  onSort,
}: PipelinesTableProps) {
  const { t } = useLanguage('pipelines');
  const { can, isReady } = usePermissions();

  const columns: TableColumn<Pipeline>[] = [
    {
      key: 'name',
      label: t('pipelinesTable.columns.name'),
      sortable: true,
      render: pipeline => (
        <div
          className="flex items-center gap-3.5 cursor-pointer py-1 min-w-0"
          onClick={() => onView(pipeline)}
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
            <GitBranch className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {pipeline.visibility === 'private' && (
                <Lock className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
              )}
              <span className="font-semibold text-[15px] text-sidebar-foreground truncate">
                {pipeline.name}
              </span>
              {pipeline.is_default && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  {t('pipelinesTable.default')}
                </span>
              )}
            </div>
            {pipeline.description && (
              <div className="text-xs text-sidebar-foreground/55 truncate mt-0.5">
                {pipeline.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'won',
      label: t('pipelinesTable.columns.won'),
      align: 'center',
      render: pipeline => {
        const won = wonSummary(pipeline);
        return (
          <div className="flex flex-col items-center leading-tight">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-sidebar-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {won.count}
            </span>
            {won.value > 0 && (
              <span className="text-[11px] font-semibold text-primary">
                R$ {formatCurrency(won.value)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      label: t('pipelinesTable.columns.items'),
      align: 'center',
      render: pipeline => (
        <span className="text-sm font-semibold text-sidebar-foreground">
          {pipeline.item_count || 0}
        </span>
      ),
    },
    {
      key: 'stages',
      label: t('pipelinesTable.columns.stages'),
      align: 'center',
      render: pipeline => (
        <span className="text-sm font-semibold text-sidebar-foreground">
          {pipeline.stages?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'value',
      label: t('pipelinesTable.columns.totalValue'),
      align: 'right',
      render: pipeline => {
        const total = pipeline.services_info?.total_value || 0;
        return total > 0 ? (
          <span className="text-sm font-semibold text-primary">R$ {formatCurrency(total)}</span>
        ) : (
          <span className="text-sm font-semibold text-sidebar-foreground/60">R$ 0,00</span>
        );
      },
    },
    {
      key: 'type',
      label: t('pipelinesTable.columns.type'),
      render: pipeline => (
        <span className="text-sm text-sidebar-foreground/80">
          {t(TYPE_LABEL_KEY[pipeline.pipeline_type])}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('pipelinesTable.columns.status'),
      render: pipeline => (
        <span
          className={cn(
            'inline-flex items-center text-[11.5px] font-bold px-2.5 py-0.5 rounded-md',
            pipeline.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {pipeline.is_active
            ? t('pipelinesTable.status.active')
            : t('pipelinesTable.status.inactive')}
        </span>
      ),
    },
  ];

  // Write actions are RBAC-gated (EVO-2030/EVO-2033): only rendered when the
  // matching pipelines permission is granted. View/Copy ID stay ungated.
  const canUpdate = isReady && can('pipelines', 'update');
  const canCreate = isReady && can('pipelines', 'create');
  const canDelete = isReady && can('pipelines', 'delete');

  const actions: TableAction<Pipeline>[] = [
    { label: t('pipelinesTable.actions.view'), icon: <Eye className="h-4 w-4" />, onClick: onView },
    {
      label: t('pipelinesTable.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
      show: () => canUpdate,
    },
    {
      label: t('pipelinesTable.actions.duplicate'),
      icon: <CopyPlus className="h-4 w-4" />,
      onClick: onDuplicate,
      show: () => canCreate,
    },
    {
      label: t('pipelinesTable.actions.copyId'),
      icon: <Copy className="h-4 w-4" />,
      onClick: async pipeline => {
        await navigator.clipboard.writeText(String(pipeline.id));
        toast.success(t('pipelinesTable.actions.idCopied'));
      },
    },
    {
      label: t('pipelinesTable.actions.setAsDefault'),
      icon: <Star className="h-4 w-4" />,
      onClick: onSetAsDefault,
      show: pipeline => canUpdate && !pipeline.is_default,
    },
    {
      label: t('pipelinesTable.actions.deactivate'),
      icon: <Power className="h-4 w-4" />,
      onClick: onToggleStatus,
      show: pipeline => canUpdate && pipeline.is_active,
    },
    {
      label: t('pipelinesTable.actions.activate'),
      icon: <Power className="h-4 w-4" />,
      onClick: onToggleStatus,
      show: pipeline => canUpdate && !pipeline.is_active,
    },
    {
      label: t('pipelinesTable.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive',
      show: () => canDelete,
    },
  ];

  return (
    <BaseTable<Pipeline>
      data={pipelines}
      columns={columns}
      actions={actions}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('empty.noPipelines')}
      emptyIcon={GitBranch}
      emptyTitle={t('empty.noPipelines')}
      emptyDescription={t('empty.noPipelinesDescription')}
      emptyAction={onCreate ? { label: t('empty.createPipeline'), onClick: onCreate } : undefined}
      getRowKey={pipeline => String(pipeline.id)}
    />
  );
}
