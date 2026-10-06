import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  Plus,
  Trash2,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';

interface CustomToolsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewTool: () => void;
  onFilter: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
  hideTitle?: boolean;
}

/** `h-auto` cancels the fixed height of `size="sm"`, which otherwise wins over these. */
const TOOLBAR_BUTTON_CLASS =
  'h-auto rounded-[9px] border-border bg-card px-[15px] py-2.5 text-[13.5px] font-semibold text-muted-foreground shadow-none hover:border-primary/30 hover:bg-primary/10 hover:text-primary';

const PRIMARY_BUTTON_CLASS =
  'h-auto rounded-[9px] px-[18px] py-[11px] text-[13.5px] font-semibold shadow-md shadow-primary/25';

export default function CustomToolsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewTool,
  onFilter,
  onBulkDelete,
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
    className: PRIMARY_BUTTON_CLASS,
  } : undefined;

  const bulkActions: HeaderAction[] = isReady && can('ai_custom_tools', 'delete') ? [
    {
      label: t('table.actions.deleteSelected'),
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
      filterButtonClassName={TOOLBAR_BUTTON_CLASS}
      selectionBarTone="primary"
      totalCount={totalCount}
      selectedCount={selectedCount}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('header.searchPlaceholder')}
      primaryAction={primaryAction}
      bulkActions={bulkActions}
      filters={activeFilters}
      onFilterClick={onFilter}
      showFilters={showFilters}
      onClearSelection={onClearSelection}
    />
  );
}
