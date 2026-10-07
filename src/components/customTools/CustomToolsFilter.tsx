import { useLanguage } from '@/hooks/useLanguage';
import BaseFilter from '@/components/base/BaseFilter';
import {
  BaseFilter as CustomToolFilter,
  DEFAULT_CUSTOM_TOOL_FILTER,
} from '@/types/core';
import { buildCustomToolFilterTypes } from './customToolFilterTypes';

interface CustomToolsFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CustomToolFilter[];
  onFiltersChange: (filters: CustomToolFilter[]) => void;
  onApplyFilters: (filters: CustomToolFilter[]) => void;
  onClearFilters: () => void;
  tagOptions: string[];
}

export default function CustomToolsFilter({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  tagOptions,
}: CustomToolsFilterProps) {
  const { t } = useLanguage('customTools');

  return (
    <BaseFilter
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={buildCustomToolFilterTypes(tagOptions)}
      defaultFilter={DEFAULT_CUSTOM_TOOL_FILTER}
      title={t('filter.title')}
      description={t('filter.description')}
      applyButtonText={t('filter.apply')}
      clearButtonText={t('filter.clear')}
      addFilterText={t('filter.addFilter')}
    />
  );
}
