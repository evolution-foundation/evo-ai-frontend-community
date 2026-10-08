import { ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
  Trash2,
} from 'lucide-react';
import { BaseHeader, HeaderAction } from '@/components/base';

interface CustomMCPServersHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewServer: () => void;
  onFilter: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  showFilters?: boolean;
  hideTitle?: boolean;
  filterPanel?: ReactNode;
  filterCount?: number;
}

export default function CustomMCPServersHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewServer,
  onFilter,
  onBulkDelete,
  onClearSelection,
  showFilters = true,
  hideTitle = false,
  filterPanel,
  filterCount,
}: CustomMCPServersHeaderProps) {
  const { t } = useLanguage('customMcpServers');
  const { can, isReady } = usePermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('ai_custom_mcp_servers', 'create') ? {
    label: t('header.newServer'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewServer,
  } : undefined;

  const bulkActions: HeaderAction[] = isReady && can('ai_custom_mcp_servers', 'delete') ? [
    {
      label: t('header.bulkDelete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onBulkDelete,
      variant: 'destructive',
    },
  ] : [];

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t('header.subtitle')}
      hideTitle={hideTitle}
      filterPanel={filterPanel}
      filterCount={filterCount}
      selectionBarTone="primary"
      totalCount={totalCount}
      selectedCount={selectedCount}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('header.searchPlaceholder')}
      primaryAction={primaryAction}
      bulkActions={bulkActions}
      onFilterClick={onFilter}
      showFilters={showFilters}
      onClearSelection={onClearSelection}
    />
  );
}
