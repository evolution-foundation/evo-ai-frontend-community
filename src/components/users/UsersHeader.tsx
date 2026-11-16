import {
  Plus,
  Download,
  Mail,
  Trash2,
} from 'lucide-react';
import { BaseHeader, HeaderAction, HeaderFilter } from '@/components/base';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLanguage } from '@/hooks/useLanguage';

interface UsersHeaderProps {
  invitationsEnabled?: boolean;
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewUser: () => void;
  onBulkInvite: () => void;
  onFilter: () => void;
  onBulkDelete?: () => void;
  onClearSelection?: () => void;
  activeFilters?: HeaderFilter[];
  showFilters?: boolean;
}

export default function UsersHeader({
  invitationsEnabled = false,
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewUser,
  onBulkInvite,
  onFilter,
  onBulkDelete,
  onClearSelection,
  activeFilters = [],
  showFilters = true,
}: UsersHeaderProps) {
  const { can } = usePermissions();
  const { t } = useLanguage('users');

  const primaryAction: HeaderAction | undefined = can('users', 'create') ? {
    label: t('header.newUser'),
    icon: <Plus className="h-4 w-4" />,
    onClick: onNewUser,
  } : undefined;

  const secondaryActions: HeaderAction[] = [
    ...(invitationsEnabled && can('users', 'create') && can('users', 'manage') && can('users', 'bulk_operations') ? [{
      label: t('header.bulkInvite'),
      icon: <Mail className="h-4 w-4" />,
      onClick: onBulkInvite,
      variant: 'outline' as const,
    }] : []),
    {
      label: t('header.export'),
      icon: <Download className="h-4 w-4" />,
      onClick: () => {}, // TODO: Implement export
      variant: 'outline',
    },
  ];

  const bulkActions: HeaderAction[] = onBulkDelete && can('users', 'delete') ? [
    {
      label: t('header.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onBulkDelete,
      variant: 'destructive' as const,
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
