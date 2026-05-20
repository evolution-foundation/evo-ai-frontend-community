import { useState } from 'react';
import { Edit, Trash2, Play, Pause, RefreshCw, List } from 'lucide-react';
import { Badge } from '@evoapi/design-system';
import BaseTable from '@/components/base/BaseTable';
import { Segment } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface SegmentsTableProps {
  segments: Segment[];
  selectedSegments: Segment[];
  loading: boolean;
  onSelectionChange: (segments: Segment[]) => void;
  onEditSegment: (segment: Segment) => void;
  onDeleteSegment: (segment: Segment) => void;
  onCreateSegment: () => void;
  onRecomputeSegment: (segment: Segment) => void;
  onViewContactIds: (segment: Segment) => void;
  sortBy: 'name' | 'created_at';
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export default function SegmentsTable({
  segments,
  selectedSegments,
  loading,
  onSelectionChange,
  onEditSegment,
  onDeleteSegment,
  onRecomputeSegment,
  onViewContactIds,
  sortBy,
  sortOrder,
  onSort,
}: SegmentsTableProps) {
  const { t } = useLanguage('segments');
  const [loadingRecompute, setLoadingRecompute] = useState<string | null>(null);

  const handleRecompute = async (segment: Segment) => {
    setLoadingRecompute(segment.id);
    try {
      await onRecomputeSegment(segment);
    } finally {
      setLoadingRecompute(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default' as const,
      paused: 'secondary' as const,
      completed: 'outline' as const,
    };

    const labels = {
      running: t('table.status.active'),
      paused: t('table.status.paused'),
      completed: t('table.status.completed'),
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      render: (segment: Segment) => (
        <div>
          <div className="font-medium text-gray-200">{segment.name}</div>
          <div className="text-sm text-gray-500">ID: {segment.id}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      render: (segment: Segment) => getStatusBadge(segment.status),
    },
    {
      key: 'contactsCount',
      label: t('table.columns.contacts'),
      render: (segment: Segment) => getStatusBadge(segment.contactsCount.toLocaleString()),
    },
    {
      key: 'lastComputedAt',
      label: t('table.columns.lastComputed'),
      render: (segment: Segment) => (
        <div className="text-sm text-gray-500">
          {segment.lastComputedAt ? formatDate(segment.lastComputedAt) : t('table.never')}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: (segment: Segment) => (
        <div className="text-sm text-gray-500">{formatDate(segment.created_at)}</div>
      ),
    },
  ];

  const actions = [
    {
      label: t('actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditSegment,
    },
    {
      label: t('actions.viewIds'),
      icon: <List className="h-4 w-4" />,
      onClick: onViewContactIds,
    },
    {
      label: t('actions.recompute'),
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: handleRecompute,
      loading: (segment: Segment) => loadingRecompute === segment.id,
    },
    {
      label: t('actions.pause'),
      icon: <Pause className="h-4 w-4" />,
      onClick: (segment: Segment) => {
        // TODO: Implementar ação de pausar
        console.log('Pausar segmento:', segment.id);
      },
      show: (segment: Segment) => segment.status === 'running',
    },
    {
      label: t('actions.activate'),
      icon: <Play className="h-4 w-4" />,
      onClick: (segment: Segment) => {
        // TODO: Implementar ação de ativar
        console.log('Ativar segmento:', segment.id);
      },
      show: (segment: Segment) => segment.status !== 'running',
    },
    {
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteSegment,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable
      data={segments}
      columns={columns}
      actions={actions}
      loading={loading}
      getRowKey={segment => segment.id.toString()}
      selectable={true}
      selectedItems={selectedSegments}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  );
}
