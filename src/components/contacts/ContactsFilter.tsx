import { useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import BaseFilter from '@/components/base/BaseFilter';
import {
  BaseFilter as ContactFilter,
  CONTACT_FILTER_TYPES,
  DEFAULT_CONTACT_FILTER,
} from '@/types/core';
import { useContactFilterOptions } from '@/hooks/contacts/useContactFilterOptions';

interface ContactsFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ContactFilter[];
  onFiltersChange: (filters: ContactFilter[]) => void;
  onApplyFilters: (filters: ContactFilter[]) => void;
  onClearFilters: () => void;
}

export default function ContactsFilter({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: ContactsFilterProps) {
  const { t } = useLanguage('contacts');
  const { labels } = useContactFilterOptions({ enabled: open });

  const enrichedFilterTypes = useMemo(
    () =>
      CONTACT_FILTER_TYPES.map(filterType =>
        filterType.attributeKey === 'labels' ? { ...filterType, options: labels } : filterType,
      ),
    [labels],
  );

  return (
    <BaseFilter
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={enrichedFilterTypes}
      defaultFilter={DEFAULT_CONTACT_FILTER}
      title={t('filter.title')}
      description={t('filter.description')}
      applyButtonText={t('filter.apply')}
      clearButtonText={t('filter.clear')}
      addFilterText={t('filter.addFilter')}
      translationNamespace="contacts"
    />
  );
}
