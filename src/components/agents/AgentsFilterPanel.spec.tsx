import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentsFilterPanel from './AgentsFilterPanel';
import {
  EMPTY_AGENT_FACETS,
  buildAgentFilterParams,
  buildModelOptions,
  countSelectedFacets,
  mergeModelOptions,
} from './agentsFilterFacets';
import type { Agent } from '@/types/agents';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

const AGENTS = [
  { id: '1', name: 'A', type: 'llm', model: 'openai/gpt-4o' },
  { id: '2', name: 'B', type: 'external', model: 'openai/gpt-4o' },
  { id: '3', name: 'C', type: 'sequential', model: 'anthropic/claude' },
  { id: '4', name: 'D', type: 'a2a', model: '' },
] as unknown as Agent[];

const renderPanel = (overrides: Partial<Parameters<typeof AgentsFilterPanel>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    selection: EMPTY_AGENT_FACETS,
    onSelectionChange: vi.fn(),
    onClear: vi.fn(),
    modelOptions: ['gpt-4o', 'claude'],
    ...overrides,
  };
  render(<AgentsFilterPanel {...props} />);
  return props;
};

beforeEach(() => vi.clearAllMocks());

describe('agentsFilterFacets', () => {
  // The value must survive as stored: `equal_to` compares against the model column.
  it('derives model options from the loaded agents, provider prefix intact', () => {
    expect(buildModelOptions(AGENTS)).toEqual(['anthropic/claude', 'openai/gpt-4o']);
  });

  it('accumulates options across pages instead of replacing them', () => {
    const known = mergeModelOptions([], AGENTS);
    expect(mergeModelOptions(known, [{ model: 'openai/o3' }] as unknown as Agent[])).toEqual([
      'anthropic/claude',
      'openai/gpt-4o',
      'openai/o3',
    ]);
  });

  it('counts both axes for the button badge', () => {
    expect(countSelectedFacets({ type: ['native'], model: ['openai/gpt-4o'] })).toBe(2);
  });
});

// The endpoint glues clauses flat and AND binds tighter than OR, so the intersection has
// to leave the browser already distributed. These are the shapes that reach SQL.
describe('buildAgentFilterParams', () => {
  const clausesOf = (params: Record<string, string>) => {
    const total = Object.keys(params).filter(k => k.endsWith('[attribute_key]')).length;
    return Array.from({ length: total }, (_, i) => ({
      key: params[`filters[${i}][attribute_key]`],
      value: params[`filters[${i}][values]`],
      glue: params[`filters[${i}][query_operator]`],
      operator: params[`filters[${i}][filter_operator]`],
    }));
  };

  it('sends nothing when no facet is selected', () => {
    expect(buildAgentFilterParams(EMPTY_AGENT_FACETS)).toEqual({});
  });

  it('expands Avançado into its four raw types, OR-glued', () => {
    const clauses = clausesOf(buildAgentFilterParams({ type: ['advanced'], model: [] }));
    expect(clauses.map(c => c.value)).toEqual(['a2a', 'sequential', 'parallel', 'loop']);
    expect(clauses.every(c => c.key === 'type' && c.operator === 'equal_to')).toBe(true);
    expect(clauses.slice(1).every(c => c.glue === 'or')).toBe(true);
  });

  it('omits the glue of the first clause, which the server drops anyway', () => {
    const params = buildAgentFilterParams({ type: ['native'], model: [] });
    expect(params['filters[0][query_operator]']).toBeUndefined();
  });

  it('ORs a single axis instead of intersecting it with itself', () => {
    const clauses = clausesOf(buildAgentFilterParams({ type: ['native', 'external'], model: [] }));
    expect(clauses.map(c => c.value)).toEqual(['llm', 'external']);
    expect(clauses[1].glue).toBe('or');
  });

  // `(llm|external) AND (gpt-4o|claude)` has no grouping in the transport, so it travels
  // as the four AND-pairs, OR between pairs.
  it('distributes the two axes into AND pairs joined by OR', () => {
    const clauses = clausesOf(
      buildAgentFilterParams({
        type: ['native', 'external'],
        model: ['openai/gpt-4o', 'anthropic/claude'],
      }),
    );
    expect(clauses).toHaveLength(8);
    expect(clauses.map(c => `${c.value}${c.glue ? `/${c.glue}` : ''}`)).toEqual([
      'llm',
      'openai/gpt-4o/and',
      'llm/or',
      'anthropic/claude/and',
      'external/or',
      'openai/gpt-4o/and',
      'external/or',
      'anthropic/claude/and',
    ]);
  });

  it('pairs every raw type of a group with every model', () => {
    const clauses = clausesOf(
      buildAgentFilterParams({ type: ['advanced'], model: ['openai/gpt-4o'] }),
    );
    expect(clauses).toHaveLength(8);
    expect(clauses.filter(c => c.key === 'model')).toHaveLength(4);
  });
});

describe('AgentsFilterPanel', () => {
  it('renders the two sections from the prototype, open by default', () => {
    renderPanel();
    expect(screen.getByText('filters.sections.type')).toBeTruthy();
    expect(screen.getByText('filters.sections.model')).toBeTruthy();
    expect(screen.getByText('filters.types.native')).toBeTruthy();
    expect(screen.getByText('filters.types.external')).toBeTruthy();
    expect(screen.getByText('filters.types.advanced')).toBeTruthy();
  });

  // Label is stripped for reading; the value that travels keeps the provider prefix.
  it('shows the model without its provider but reports the stored value back', async () => {
    const props = renderPanel({ modelOptions: ['openai/gpt-4o'] });
    expect(screen.getByText('gpt-4o')).toBeTruthy();
    expect(screen.queryByText('openai/gpt-4o')).toBeNull();

    await userEvent.click(screen.getByText('gpt-4o'));
    expect(props.onSelectionChange).toHaveBeenCalledWith({ type: [], model: ['openai/gpt-4o'] });
  });

  it('says so when a section has no option instead of rendering an empty box', () => {
    renderPanel({ modelOptions: [] });
    expect(screen.getByText('filters.empty')).toBeTruthy();
  });

  it('collapses a section when its header is clicked', async () => {
    renderPanel();
    await userEvent.click(screen.getByText('filters.sections.type'));
    expect(screen.queryByText('filters.types.native')).toBeNull();
    expect(screen.getByText('filters.sections.model')).toBeTruthy();
  });

  it('reports the toggled option back to the parent', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByText('filters.types.advanced'));
    expect(props.onSelectionChange).toHaveBeenCalledWith({ type: ['advanced'], model: [] });
  });

  it('unchecks an option that is already selected', async () => {
    const props = renderPanel({ selection: { type: ['native'], model: [] } });
    await userEvent.click(screen.getByText('filters.types.native'));
    expect(props.onSelectionChange).toHaveBeenCalledWith({ type: [], model: [] });
  });

  it('marks the selected option as checked for assistive tech', () => {
    renderPanel({ selection: { type: ['native'], model: [] } });
    const checked = screen.getAllByRole('checkbox').filter(el => el.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });

  it('clears every axis from the footer', async () => {
    const props = renderPanel({ selection: { type: ['native'], model: ['gpt-4o'] } });
    await userEvent.click(screen.getByText('filters.clear'));
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', () => {
    renderPanel({ open: false });
    expect(screen.queryByText('filters.title')).toBeNull();
  });

  it('closes on a click outside', () => {
    const props = renderPanel();
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a click inside the panel', () => {
    const props = renderPanel();
    fireEvent.mouseDown(screen.getByText('filters.sections.type'));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const props = renderPanel();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
