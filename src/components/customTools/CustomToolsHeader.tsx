import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';

interface CustomToolsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewTool: () => void;
  onFilter: () => void;
  onClearSelection: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
  hideTitle?: boolean;
}

export default function CustomToolsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewTool,
  onFilter,
  onClearSelection,
  activeFilters = [],
  showFilters = true,
  hideTitle = false,
}: CustomToolsHeaderProps) {
  const { t } = useLanguage('customTools');
  const { can, isReady } = usePermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('ai_custom_tools', 'create') ? {
    label: t('header.newTool'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewTool,
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
