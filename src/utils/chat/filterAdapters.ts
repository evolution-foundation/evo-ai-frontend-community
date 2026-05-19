import { BaseFilter } from '@/types/core';
import { ConversationFilter } from '@/types/chat/api';

// Campos onde "all" significa "sem filtro" (não deve ser enviado à API)
const ALL_VALUE_FIELDS = ['assignee_type', 'status'];

/**
 * Verifica se um filtro com valor "all" é um no-op (não deve ser enviado à API)
 */
function isAllValueNoOp(filter: BaseFilter): boolean {
  const values = Array.isArray(filter.values) ? filter.values : [filter.values];
  const hasAllValue = values.some(v => String(v).toLowerCase() === 'all');
  return hasAllValue && ALL_VALUE_FIELDS.includes(filter.attributeKey);
}

/**
 * Converte filtros do BaseFilter (usado na UI) para ConversationFilter (usado na API)
 * Filtros com valor "all" em campos de tipo seleção são ignorados (são no-ops)
 */
export function convertBaseFiltersToConversationFilters(
  baseFilters: BaseFilter[],
): ConversationFilter[] {
  return baseFilters
    .filter(filter => !isAllValueNoOp(filter))
    .map(filter => ({
      attribute_key: filter.attributeKey,
      filter_operator: filter.filterOperator as any,
      values: Array.isArray(filter.values) ? filter.values : [filter.values],
      query_operator: filter.queryOperator,
    }));
}

/**
 * Converte filtros do ConversationFilter (usado na API) para BaseFilter (usado na UI)
 */
export function convertConversationFiltersToBaseFilters(
  conversationFilters: ConversationFilter[],
): BaseFilter[] {
  return conversationFilters.map(filter => ({
    attributeKey: filter.attribute_key,
    filterOperator: filter.filter_operator,
    values: Array.isArray(filter.values) ? filter.values.join(',') : filter.values[0] || '',
    queryOperator: filter.query_operator,
    attributeModel: 'standard' as const,
  }));
}

/**
 * Verifica se um filtro do BaseFilter é válido (tem valores quando necessário)
 */
export function isValidBaseFilter(filter: BaseFilter): boolean {
  const needsValue = !['is_present', 'is_not_present'].includes(filter.filterOperator);
  return !needsValue || (!!filter.values && filter.values.toString().trim() !== '');
}

/**
 * Remove filtros inválidos de uma lista de BaseFilter
 */
export function removeInvalidBaseFilters(filters: BaseFilter[]): BaseFilter[] {
  return filters.filter(isValidBaseFilter);
}
