import { useLanguage } from '@/hooks/useLanguage';
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Copy,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface CampaignsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewCampaign: () => void;
  onFilter: () => void;
  onBulkPause: () => void;
  onBulkResume: () => void;
  onBulkDelete: () => void;
  onBulkDuplicate: () => void;
  onClearSelection: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
}

export default function CampaignsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewCampaign,
  onFilter,
  onBulkPause,
  onBulkResume,
  onBulkDelete,
  onBulkDuplicate,
  onClearSelection,
  activeFilters = [],
  showFilters = true,
}: CampaignsHeaderProps) {
  const { t } = useLanguage('campaigns');
  const { can, isReady } = useUserPermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('campaigns', 'create') ? {
    label: t('header.newCampaign'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewCampaign,
  } : undefined;

  const secondaryActions: HeaderAction[] = [];

  const bulkActions: HeaderAction[] = [
    ...(isReady && can('campaigns', 'update') ? [{
      label: t('header.bulkResume'),
      icon: <Play className="h-4 w-4" />,
      onClick: onBulkResume,
      variant: 'outline' as const,
    }] : []),
    ...(isReady && can('campaigns', 'update') ? [{
      label: t('header.bulkPause'),
      icon: <Pause className="h-4 w-4" />,
      onClick: onBulkPause,
      variant: 'outline' as const,
    }] : []),
    ...(isReady && can('campaigns', 'create') ? [{
      label: t('header.bulkDuplicate'),
      icon: <Copy className="h-4 w-4" />,
      onClick: onBulkDuplicate,
      variant: 'outline' as const,
    }] : []),
    ...(isReady && can('campaigns', 'delete') ? [{
      label: t('header.bulkDelete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onBulkDelete,
      variant: 'destructive' as const,
    }] : []),
  ];

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t('header.subtitle')}
      totalCount={totalCount}
      selectedCount={selectedCount}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('header.searchPlaceholder')}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      bulkActions={bulkActions}
      filters={activeFilters}
      onFilterClick={onFilter}
      showFilters={showFilters}
      onClearSelection={onClearSelection}
    />
  );
}
