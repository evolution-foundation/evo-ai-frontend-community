import { describe, expect, it } from 'vitest';
import {
  EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS,
  buildCustomMcpServerFilterParams,
  mergeFacetOptions,
} from './customMcpServersFilterFacets';
import type { CustomMcpServer } from '@/types/ai';

const server = (tags: string[] | null, timeout: number) =>
  ({ tags, timeout }) as unknown as CustomMcpServer;

describe('mergeFacetOptions', () => {
  it('keeps options seen on earlier pages, deduped, timeouts in numeric order', () => {
    const first = mergeFacetOptions(EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS, [
      server(['git', 'dev'], 120),
    ]);
    const second = mergeFacetOptions(first, [server(['dev'], 30), server(null, 9)]);

    expect(second).toEqual({ tags: ['dev', 'git'], timeout: ['9', '30', '120'] });
  });

  // The backend matches tags with LOWER(): two spellings would be two identical options.
  it('treats tags that differ only in case as one option', () => {
    const options = mergeFacetOptions(EMPTY_CUSTOM_MCP_SERVER_FACET_OPTIONS, [
      server(['Dev'], 30),
      server(['dev', 'DEV'], 30),
    ]);

    expect(options.tags).toEqual(['Dev']);
  });
});

describe('buildCustomMcpServerFilterParams', () => {
  it('sends nothing without a selection', () => {
    expect(buildCustomMcpServerFilterParams({ tags: [], timeout: [] })).toEqual({});
  });

  it('distributes tags x timeout into AND pairs joined by OR', () => {
    const params = buildCustomMcpServerFilterParams({ tags: ['a', 'b'], timeout: ['30'] });

    expect(params).toEqual({
      'filters[0][attribute_key]': 'tags',
      'filters[0][filter_operator]': 'equal_to',
      'filters[0][values]': 'a',
      'filters[1][attribute_key]': 'timeout',
      'filters[1][filter_operator]': 'equal_to',
      'filters[1][values]': '30',
      'filters[1][query_operator]': 'and',
      'filters[2][attribute_key]': 'tags',
      'filters[2][filter_operator]': 'equal_to',
      'filters[2][values]': 'b',
      'filters[2][query_operator]': 'or',
      'filters[3][attribute_key]': 'timeout',
      'filters[3][filter_operator]': 'equal_to',
      'filters[3][values]': '30',
      'filters[3][query_operator]': 'and',
    });
  });

  it('ORs values of a single facet', () => {
    const params = buildCustomMcpServerFilterParams({ tags: [], timeout: ['30', '60'] });

    expect(params).toEqual({
      'filters[0][attribute_key]': 'timeout',
      'filters[0][filter_operator]': 'equal_to',
      'filters[0][values]': '30',
      'filters[1][attribute_key]': 'timeout',
      'filters[1][filter_operator]': 'equal_to',
      'filters[1][values]': '60',
      'filters[1][query_operator]': 'or',
    });
  });
});
