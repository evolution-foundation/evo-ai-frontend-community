import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';

interface CustomMCPServersHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewServer: () => void;
  onFilter: () => void;
  onClearSelection: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
  hideTitle?: boolean;
}

export default function CustomMCPServersHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewServer,
  onFilter,
  onClearSelection,
  activeFilters = [],
  showFilters = true,
  hideTitle = false,
}: CustomMCPServersHeaderProps) {
  const { t } = useLanguage('customMcpServers');
  const { can, isReady } = usePermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('ai_custom_mcp_servers', 'create') ? {
    label: t('header.newServer'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewServer,
  } : undefined;

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t('header.subtitle')}
      hideTitle={hideTitle}
      totalCount={totalCount}
      selectedCount={selectedCount}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('header.searchPlaceholder')}
      primaryAction={primaryAction}
      filters={activeFilters}
      onFilterClick={onFilter}
      showFilters={showFilters}
      onClearSelection={onClearSelection}
    />
  );
}
