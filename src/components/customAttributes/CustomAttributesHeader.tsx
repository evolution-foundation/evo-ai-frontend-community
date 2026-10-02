import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Plus, Trash2 } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import { AttributeModel, ATTRIBUTE_TABS } from '@/types/settings';

interface CustomAttributesHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewAttribute: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  showBulkActions: boolean;
  activeTab: AttributeModel;
}

export default function CustomAttributesHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewAttribute,
  onBulkDelete,
  onClearSelection,
  showBulkActions,
  activeTab,
}: CustomAttributesHeaderProps) {
  const { t } = useLanguage('customAttributes');
  const { can, isReady } = usePermissions();
  const currentTab = ATTRIBUTE_TABS.find(tab => tab.key === activeTab);

  return (
    <BaseHeader
      title={t('header.title')}
      subtitle={t(totalCount === 1 ? 'header.subtitleSingular' : 'header.subtitle', {
        count: totalCount,
        tabName: currentTab ? t(currentTab.nameKey).toLowerCase() : undefined,
      })}
      searchPlaceholder={t('header.searchPlaceholder')}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      selectedCount={selectedCount}
      onClearSelection={onClearSelection}
      primaryAction={
        !showBulkActions && isReady && can('custom_attribute_definitions', 'create')
          ? {
              label: t('header.newAttribute'),
              icon: <Plus className="h-4 w-4" />,
              onClick: onNewAttribute,
            }
          : undefined
      }
      bulkActions={
        showBulkActions && isReady && can('custom_attribute_definitions', 'delete')
          ? [
              {
                label: t('header.bulkDelete'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: onBulkDelete,
                variant: 'destructive' as const,
              },
            ]
          : []
      }
    />
  );
}
