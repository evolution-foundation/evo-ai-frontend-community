import { CustomMcpServer } from '@/types/ai';

export type CustomMcpServerFacetKey = 'tags' | 'timeout';

export interface CustomMcpServerFacetSelection {
  tags: string[];
  timeout: string[];
}

export const EMPTY_CUSTOM_MCP_SERVER_FACETS: CustomMcpServerFacetSelection = {
  tags: [],
  timeout: [],
};

export interface CustomMcpServerFacetOptions {
  tags: string[];
  timeout: string[];
}

export const EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS: CustomMcpServerFacetOptions = {
  tags: [],
  timeout: [],
};

/**
 * There is no endpoint listing a tenant's tags or timeouts, so the options are what the
 * loaded pages revealed. They accumulate: an option vanishing mid-session strands its
 * own filter (same rule as the Agents tab's model options).
 */
export const mergeFacetOptions = (
  known: CustomMcpServerFacetOptions,
  servers: CustomMcpServer[],
): CustomMcpServerFacetOptions => {
  // Keyed case-insensitively: the backend matches tags with LOWER(), so "Dev" and "dev"
  // would be two options returning the same rows. The first spelling seen wins.
  const tags = new Map(known.tags.map(tag => [tag.toLowerCase(), tag]));
  const timeout = new Set(known.timeout);
  for (const server of servers) {
    for (const tag of server.tags ?? []) {
      if (tag && !tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
    }
    if (server.timeout !== null && server.timeout !== undefined) {
      timeout.add(String(server.timeout));
    }
  }
  return {
    tags: [...tags.values()].sort((a, b) => a.localeCompare(b)),
    timeout: [...timeout].sort((a, b) => Number(a) - Number(b)),
  };
};

export const countSelectedFacets = (selection: CustomMcpServerFacetSelection): number =>
  selection.tags.length + selection.timeout.length;

interface FilterClause {
  key: CustomMcpServerFacetKey;
  value: string;
  glue: 'and' | 'or';
}

/**
 * The list endpoint glues clauses FLAT (`custom_mcp_server_filter.go`) and SQL binds AND
 * tighter than OR, so `(tag A|B) AND (timeout X|Y)` has to travel already distributed:
 * one clause pair per combination, AND inside the pair, OR between pairs.
 */
export const buildCustomMcpServerFilterParams = (
  selection: CustomMcpServerFacetSelection,
): Record<string, string> => {
  const { tags, timeout } = selection;
  const clauses: FilterClause[] = [];

  if (tags.length > 0 && timeout.length > 0) {
    for (const tag of tags) {
      for (const value of timeout) {
        clauses.push({ key: 'tags', value: tag, glue: 'or' });
        clauses.push({ key: 'timeout', value, glue: 'and' });
      }
    }
  } else {
    for (const tag of tags) clauses.push({ key: 'tags', value: tag, glue: 'or' });
    for (const value of timeout) clauses.push({ key: 'timeout', value, glue: 'or' });
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
  selection: CustomMcpServerFacetSelection,
  key: CustomMcpServerFacetKey,
  value: string,
): CustomMcpServerFacetSelection => {
  const current = selection[key];
  return {
    ...selection,
    [key]: current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value],
  };
};
