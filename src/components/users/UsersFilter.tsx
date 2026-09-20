import BaseFilter from '@/components/base/BaseFilter';
import { USER_FILTER_TYPES, DEFAULT_USER_FILTER } from '@/types/users';
import { BaseFilter as UserFilter, FilterType } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';

interface UsersFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: UserFilter[];
  /** Overrides the built-in catalog — used to fill the role options with the
   * account's actual roles. Falls back to the static catalog. */
  filterTypes?: FilterType[];
  onFiltersChange: (filters: UserFilter[]) => void;
  onApplyFilters: (filters: UserFilter[]) => void;
  onClearFilters: () => void;
}

export default function UsersFilter({
  open,
  onOpenChange,
  filters,
  filterTypes = USER_FILTER_TYPES,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: UsersFilterProps) {
  const { t } = useLanguage('users');

  return (
    <BaseFilter
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={filterTypes}
      defaultFilter={DEFAULT_USER_FILTER}
      title={t('filter.title')}
      description={t('filter.description')}
      applyButtonText={t('filter.applyFilters')}
      clearButtonText={t('filter.clearFilters')}
      addFilterText={t('filter.addFilter')}
    />
  );
}
