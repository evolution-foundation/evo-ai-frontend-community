import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Plus, Trash2 } from 'lucide-react';
import { BaseHeader } from '@/components/base';

interface MacrosHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewMacro: () => void;
  onBulkDelete: () => void;
  onFilter: () => void;
  onClearSelection: () => void;
  activeFilters: any[];
  showFilters?: boolean;
}

export default function MacrosHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewMacro,
  onBulkDelete,
  onFilter,
  onClearSelection,
  activeFilters,
  showFilters = true,
}: MacrosHeaderProps) {
  const { t } = useLanguage('macros');
  const { can, isReady } = usePermissions();

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t('header.subtitle', { count: totalCount })}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('header.searchPlaceholder')}
      primaryAction={isReady && can('macros', 'manage') ? {
        label: t('header.newMacro'),
        icon: <Plus className="h-4 w-4" />,
        onClick: onNewMacro,
      } : undefined}
      showFilters={showFilters}
      onFilterClick={onFilter}
      filters={activeFilters.map(filter => ({
        label: filter.key,
        value: filter.value,
        onRemove: () => filter.onRemove?.(),
      }))}
      selectedCount={selectedCount}
      onClearSelection={onClearSelection}
      bulkActions={isReady && can('macros', 'delete') ? [
        {
          label: t('header.bulkDelete'),
          icon: <Trash2 className="h-4 w-4" />,
          onClick: onBulkDelete,
          variant: 'destructive' as const,
        },
      ] : []}
    />
  );
}
