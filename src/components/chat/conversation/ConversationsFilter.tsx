import { useMemo } from 'react';
import BaseFilter from '@/components/base/BaseFilter';
import {
  BaseFilter as ConversationFilterType,
  CONVERSATION_FILTER_TYPES,
  DEFAULT_CONVERSATION_FILTER,
} from '@/types/core';
import { useFilterOptions } from '@/hooks/chat/useFilterOptions';
import { useLanguage } from '@/hooks/useLanguage';

interface ConversationsFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ConversationFilterType[];
  onFiltersChange: (filters: ConversationFilterType[]) => void;
  onApplyFilters: (filters: ConversationFilterType[]) => void;
  onClearFilters: () => void;
}

export default function ConversationsFilter({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: ConversationsFilterProps) {
  const { t } = useLanguage('chat');

  // ⚡ OTIMIZAÇÃO: Carregar dados apenas quando modal é aberto
  const filterOptions = useFilterOptions({ enabled: open });

  // ✅ Mesclar opções dinâmicas com os tipos de filtro
  const enrichedFilterTypes = useMemo(() => {
    return CONVERSATION_FILTER_TYPES.map(filterType => {
      switch (filterType.attributeKey) {
        case 'inbox_id':
          return {
            ...filterType,
            options: filterOptions.inboxes,
          };
        case 'team_id':
          return {
            ...filterType,
            options: filterOptions.teams,
          };
        case 'labels':
          return {
            ...filterType,
            options: filterOptions.labels,
          };
        case 'pipeline_id':
          return {
            ...filterType,
            options: filterOptions.pipelines,
          };
        case 'contact_id':
          return {
            ...filterType,
            options: filterOptions.contacts,
          };
        default:
          return filterType;
      }
    });
  }, [
    filterOptions.inboxes,
    filterOptions.teams,
    filterOptions.labels,
    filterOptions.pipelines,
    filterOptions.contacts,
  ]);

  return (
    <BaseFilter
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={enrichedFilterTypes} // ✅ Usa tipos enriquecidos com opções dinâmicas
      defaultFilter={DEFAULT_CONVERSATION_FILTER}
      title={t('conversationsFilter.title')}
      description={t('conversationsFilter.description')}
      applyButtonText={t('conversationsFilter.applyFilters')}
      clearButtonText={t('conversationsFilter.clearFilters')}
      addFilterText={t('conversationsFilter.addFilter')}
      translationNamespace="chat"
    />
  );
}
