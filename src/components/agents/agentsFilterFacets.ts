import { Agent } from '@/types/agents';

export type AgentFacetKey = 'type' | 'model';

export interface AgentFacetSelection {
  type: string[];
  model: string[];
}

export const EMPTY_AGENT_FACETS: AgentFacetSelection = { type: [], model: [] };

/** "Advanced" groups the orchestrators and a2a: users filter by nature, not by enum. */
export interface AgentTypeFacet {
  value: string;
  labelKey: string;
  types: string[];
}

export const AGENT_TYPE_FACETS: AgentTypeFacet[] = [
  { value: 'native', labelKey: 'filters.types.native', types: ['llm'] },
  { value: 'external', labelKey: 'filters.types.external', types: ['external'] },
  {
    value: 'advanced',
    labelKey: 'filters.types.advanced',
    types: ['a2a', 'sequential', 'parallel', 'loop'],
  },
];

/** `openai/gpt-4o` → `gpt-4o`: the provider prefix distinguishes nothing as a LABEL. */
export const modelValue = (model?: string | null): string =>
  (model || '').split('/').pop() || '';

/**
 * Options carry the model as STORED, prefix and all — `equal_to` compares against the
 * column, so a stripped `gpt-4o` would never match a row holding `openai/gpt-4o`.
 * Stripping is the panel's job, at render time.
 */
export const buildModelOptions = (agents: Agent[]): string[] =>
  [...new Set(agents.map(agent => agent.model || '').filter(Boolean))].sort();

/** Options accumulate across pages: an option vanishing mid-session strands its own filter. */
export const mergeModelOptions = (known: string[], agents: Agent[]): string[] =>
  [...new Set([...known, ...buildModelOptions(agents)])].sort();

export const countSelectedFacets = (selection: AgentFacetSelection): number =>
  selection.type.length + selection.model.length;

const rawTypesFor = (selected: string[]): string[] =>
  selected.flatMap(value => AGENT_TYPE_FACETS.find(facet => facet.value === value)?.types ?? []);

interface FilterClause {
  key: AgentFacetKey;
  value: string;
  glue: 'and' | 'or';
}

/**
 * The list endpoint glues clauses FLAT (`agent_filter.go:42-52`) and SQL binds AND tighter
 * than OR, so `(type A|B) AND (model X|Y)` has to travel already distributed: one clause
 * pair per combination, AND inside the pair, OR between pairs. The glue of clause 0 is
 * dropped server-side, which is why the first pair may claim `or` harmlessly.
 */
export const buildAgentFilterParams = (
  selection: AgentFacetSelection,
): Record<string, string> => {
  const types = rawTypesFor(selection.type);
  const models = selection.model;
  const clauses: FilterClause[] = [];

  if (types.length > 0 && models.length > 0) {
    for (const type of types) {
      for (const model of models) {
        clauses.push({ key: 'type', value: type, glue: 'or' });
        clauses.push({ key: 'model', value: model, glue: 'and' });
      }
    }
  } else {
    for (const type of types) clauses.push({ key: 'type', value: type, glue: 'or' });
    for (const model of models) clauses.push({ key: 'model', value: model, glue: 'or' });
  }

  return clauses.reduce<Record<string, string>>((params, clause, index) => {
    const prefix = `filters[${index}]`;
    params[`${prefix}[attribute_key]`] = clause.key;
    params[`${prefix}[filter_operator]`] = 'equal_to';
    params[`${prefix}[values]`] = clause.value;
    if (index > 0) {
      params[`${prefix}[query_operator]`] = clause.glue;
    }
    return params;
  }, {});
};

export const toggleFacetValue = (
  selection: AgentFacetSelection,
  key: AgentFacetKey,
  value: string,
): AgentFacetSelection => {
  const current = selection[key];
  return {
    ...selection,
    [key]: current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value],
  };
};
