import {
  Plus,
  Download,
  Key,
  Trash2,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface AgentsHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewAgent: () => void;
  onExport: () => void;
  onManageApiKeys: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onFilter?: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
}

export default function AgentsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewAgent,
  onExport,
  onManageApiKeys,
  onBulkDelete,
  onClearSelection,
  onFilter,
  activeFilters = [],
  showFilters = true,
}: AgentsHeaderProps) {
  const { t } = useLanguage('agents');
  const { can, isReady } = useUserPermissions();

  const primaryAction: HeaderAction | undefined = isReady && can('ai_agents', 'create') ? {
    label: t('createAgent'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewAgent,
    dataTour: 'agents-new-button',
  } : undefined;

  const secondaryActions: HeaderAction[] = [
    {
      label: t('apiKeys.manage'),
      icon: <Key className="h-4 w-4" />,
      onClick: onManageApiKeys,
      variant: 'outline' as const,
      dataTour: 'agents-api-keys',
    },
    {
      label: t('export.all'),
      icon: <Download className="h-4 w-4" />,
      onClick: onExport,
      variant: 'outline' as const,
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
