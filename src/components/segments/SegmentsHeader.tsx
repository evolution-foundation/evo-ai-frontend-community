import { Plus, Trash2, RefreshCw } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface SegmentsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewSegment: () => void;
  onBulkDelete: () => void;
  onRecomputeAll: () => void;
  onClearSelection: () => void;
  showBulkActions: boolean;
  isRecomputingAll?: boolean;
}

export default function SegmentsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewSegment,
  onBulkDelete,
  onRecomputeAll,
  onClearSelection,
  showBulkActions,
  isRecomputingAll,
}: SegmentsHeaderProps) {
  const { t } = useLanguage('segments');
  const { can, isReady } = useUserPermissions();

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t('header.subtitle', { count: totalCount })}
      searchPlaceholder={t('header.searchPlaceholder')}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      selectedCount={selectedCount}
      onClearSelection={onClearSelection}
      primaryAction={
        !showBulkActions && isReady && can('segments', 'create') ? {
          label: t('header.newSegment'),
          icon: <Plus className="h-4 w-4" />,
          onClick: onNewSegment,
        } : undefined
      }
      secondaryActions={
        !showBulkActions ? [
          ...(isReady && can('segments', 'update') ? [{
            label: isRecomputingAll ? t('header.recomputing') : t('header.recomputeAll'),
            icon: <RefreshCw className={`h-4 w-4 ${isRecomputingAll ? 'animate-spin' : ''}`} />,
            onClick: onRecomputeAll,
          }] : []),
        ] : []
      }
      bulkActions={
        showBulkActions && isReady && can('segments', 'delete') ? [
          {
            label: t('header.delete'),
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onBulkDelete,
            variant: 'destructive' as const,
          }
        ] : []
      }
    />
  );
}
