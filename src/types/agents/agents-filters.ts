import { BaseFilter, FilterType, OPERATOR_TYPES_1, OPERATOR_TYPES_3 } from '@/types/core';

// Advanced-filter attributes exposed on the Agents list screen. Keys must match
// the whitelist the core-service applies (pkg/agent/repository/agent_filter.go).
export const AGENT_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'Nome',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'description',
    attributeI18nKey: 'Descrição',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'type',
    attributeI18nKey: 'Tipo',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { label: 'LLM', value: 'llm' },
      { label: 'A2A', value: 'a2a' },
      { label: 'Sequential', value: 'sequential' },
      { label: 'Parallel', value: 'parallel' },
      { label: 'Loop', value: 'loop' },
      { label: 'Workflow', value: 'workflow' },
      { label: 'Task', value: 'task' },
      { label: 'External', value: 'external' },
    ],
  },
  {
    attributeKey: 'model',
    attributeI18nKey: 'Modelo',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'Data de Criação',
    inputType: 'date',
    dataType: 'date',
    // Date column: only equality operators (the Go backend matches by DATE());
    // substring/ILIKE operators are invalid on a timestamp and would 500.
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
  },
];

export const DEFAULT_AGENT_FILTER: BaseFilter = {
  attributeKey: 'name',
  filterOperator: 'equal_to',
  values: '',
  queryOperator: 'and',
  attributeModel: 'standard',
};
