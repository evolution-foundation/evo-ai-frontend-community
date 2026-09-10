import { useLanguage } from '@/hooks/useLanguage';
import { Plus } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PipelinesHeaderProps {
  totalCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewPipeline: () => void;
  /** Optional override; defaults to the pipelines.create permission (EVO-2030). */
  canCreate?: boolean;
  /** Optional title override — used by the Empresa/Pessoal scoped submenu views. */
  title?: string;
}

export default function PipelinesHeader({
  totalCount,
  searchValue,
  onSearchChange,
  onNewPipeline,
  canCreate,
  title,
}: PipelinesHeaderProps) {
  const { t } = useLanguage('pipelines');
  const { can, isReady } = usePermissions();
  const showCreate = canCreate ?? (isReady && can('pipelines', 'create'));

  const subtitle =
    totalCount > 0
      ? t('pipelinesHeader.subtitle', {
          count: totalCount,
          plural: totalCount !== 1 ? 's' : '',
        })
      : t('pipelinesHeader.organize');

  return (
    <BaseHeader
      title={title ?? t('pipelinesHeader.title')}
      subtitle={subtitle}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('pipelinesHeader.searchPlaceholder')}
      searchDataTour="pipelines-search"
      primaryAction={{
        label: t('pipelinesHeader.newPipeline'),
        icon: <Plus className="h-4 w-4" />,
        onClick: onNewPipeline,
        show: showCreate,
        dataTour: 'pipelines-new-button',
      }}
    />
  );
}
