import { ReactNode } from 'react';
import {
  Plus,
  Key,
  Trash2,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';

interface AgentsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewAgent: () => void;
  onManageApiKeys: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onFilter?: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
  hideTitle?: boolean;
  filterPanel?: ReactNode;
  filterCount?: number;
}

/** `h-auto` cancels the fixed height of `size="sm"`, which otherwise wins over these. */
const TOOLBAR_BUTTON_CLASS =
  'h-auto rounded-[9px] border-border bg-card px-[15px] py-2.5 text-[13.5px] font-semibold text-muted-foreground shadow-none hover:border-primary/30 hover:bg-primary/10 hover:text-primary';

const PRIMARY_BUTTON_CLASS =
  'h-auto rounded-[9px] px-[18px] py-[11px] text-[13.5px] font-semibold shadow-md shadow-primary/25';

export default function AgentsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewAgent,
  onManageApiKeys,
  onBulkDelete,
  onClearSelection,
  onFilter,
  activeFilters = [],
  showFilters = true,
  hideTitle = false,
  filterPanel,
  filterCount,
}: AgentsHeaderProps) {
  const { t } = useLanguage('agents');
  const { can, isReady } = usePermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('ai_agents', 'create') ? {
    label: t('createAgent'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewAgent,
    className: PRIMARY_BUTTON_CLASS,
    dataTour: 'agents-new-button',
  } : undefined;

  const secondaryActions: HeaderAction[] = [
    {
      label: t('apiKeys.manage'),
      icon: <Key className="h-4 w-4" />,
      onClick: onManageApiKeys,
      variant: 'outline' as const,
      className: TOOLBAR_BUTTON_CLASS,
      dataTour: 'agents-api-keys',
    },
  ];

  const bulkActions: HeaderAction[] = isReady && can('ai_agents', 'delete') ? [
    {
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onBulkDelete,
      variant: 'destructive',
    },
  ] : [];

  return (
    <BaseHeader
      title={t('title')}
      subtitle={t('subtitle')}
      hideTitle={hideTitle}
      filterPanel={filterPanel}
      filterButtonClassName={TOOLBAR_BUTTON_CLASS}
      filterCount={filterCount}
      selectionBarTone="primary"
      totalCount={totalCount}
      selectedCount={selectedCount}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('search.placeholder')}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      bulkActions={bulkActions}
      filters={activeFilters}
      onFilterClick={onFilter ?? (() => {})}
      showFilters={showFilters}
      onClearSelection={onClearSelection}
    />
  );
}
