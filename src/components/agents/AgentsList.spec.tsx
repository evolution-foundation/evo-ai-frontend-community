import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentsHeader from './AgentsHeader';
import AgentsTable from './AgentsTable';
import AgentsFilterPanel from './AgentsFilterPanel';
import { EMPTY_AGENT_FACETS } from './agentsFilterFacets';
import type { Agent } from '@/types/agents';

let allowedResources: string[] = [];

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string) => allowedResources.includes(resource),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

const AGENTS = [
  { id: 'a-1', name: 'Suporte', description: 'Atende o cliente', type: 'llm', model: 'gpt-4o' },
  { id: 'a-2', name: 'Vendas', description: 'Qualifica leads', type: 'external', model: '' },
] as unknown as Agent[];

const renderHeader = (onFilter = vi.fn(), selectedCount = 0) => {
  render(
    <AgentsHeader
      hideTitle
      totalCount={2}
      selectedCount={selectedCount}
      searchValue=""
      onSearchChange={vi.fn()}
      onNewAgent={vi.fn()}
      onManageApiKeys={vi.fn()}
      onBulkDelete={vi.fn()}
      onClearSelection={vi.fn()}
      onFilter={onFilter}
      showFilters
    />,
  );
  return onFilter;
};

const renderTable = (selectedAgents: Agent[] = [], onSelectionChange = vi.fn()) => {
  render(
    <AgentsTable
      agents={AGENTS}
      selectedAgents={selectedAgents}
      onSelectionChange={onSelectionChange}
      onEditAgent={vi.fn()}
      onDeleteAgent={vi.fn()}
    />,
  );
  return onSelectionChange;
};

beforeEach(() => {
  allowedResources = ['ai_agents'];
});

describe('AgentsHeader', () => {
  it('opens the filter panel from the Filtros button', async () => {
    const onFilter = renderHeader();
    await userEvent.click(screen.getByText('base.header.filters'));
    expect(onFilter).toHaveBeenCalledTimes(1);
  });

  // The container owns the title now; a second one on the page is the bug this story fixes.
  it('renders no title of its own when the tab container already shows one', () => {
    renderHeader();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('offers the two canonical bar actions', () => {
    renderHeader();
    expect(screen.getByText('createAgent')).toBeTruthy();
    expect(screen.getByText('apiKeys.manage')).toBeTruthy();
  });

  it('keeps the primary action on the search row instead of a row of its own', () => {
    renderHeader();
    const filtersBtn = screen.getByText('base.header.filters').closest('button')!;
    const primaryBtn = screen.getByText('createAgent').closest('button')!;
    const secondaryBtn = screen.getByText('apiKeys.manage').closest('button')!;

    // Walk up to the common ancestor instead of counting levels: the Filters button sits
    // inside an anchor wrapper, so a fixed depth would break here.
    const searchInput = screen.getByPlaceholderText('search.placeholder');
    let searchRow: HTMLElement | null = filtersBtn;
    while (searchRow && !(searchRow.contains(searchInput) && searchRow.contains(primaryBtn))) {
      searchRow = searchRow.parentElement;
    }
    expect(searchRow).toBeTruthy();
    expect(searchRow!.contains(secondaryBtn)).toBe(true);
    expect(searchRow!.querySelector('h1')).toBeNull();
    expect(secondaryBtn.compareDocumentPosition(primaryBtn) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  // PADRAO-DE-DESIGN §3.14: the bulk bar is the green one, not the neutral surface.
  it('paints the bulk-selection bar with the canonical primary tone', () => {
    renderHeader(vi.fn(), 2);
    const counter = screen.getByText('base.header.selected');
    expect(counter.className).toContain('text-primary');
    expect(counter.parentElement?.parentElement?.className).toContain('bg-primary/10');
  });
});

describe('AgentsTable', () => {
  it('reports every row picked through multi-selection', async () => {
    const onSelectionChange = renderTable();
    const [, firstRow] = screen.getAllByRole('checkbox');
    await userEvent.click(firstRow);
    expect(onSelectionChange).toHaveBeenCalledWith([AGENTS[0]]);
  });

  it('adds to the current selection instead of replacing it', async () => {
    const onSelectionChange = renderTable([AGENTS[0]]);
    const [, , secondRow] = screen.getAllByRole('checkbox');
    await userEvent.click(secondRow);
    expect(onSelectionChange).toHaveBeenCalledWith([AGENTS[0], AGENTS[1]]);
  });

  it('selects every row from the header checkbox', async () => {
    const onSelectionChange = renderTable();
    const [selectAll] = screen.getAllByRole('checkbox');
    await userEvent.click(selectAll);
    expect(onSelectionChange).toHaveBeenCalledWith(AGENTS);
  });

  // A bordered box with a header and no rows reads as broken, not as "nothing here".
  it('says the list is empty instead of showing a header over nothing', () => {
    render(
      <AgentsTable
        agents={[]}
        selectedAgents={[]}
        onSelectionChange={vi.fn()}
        onEditAgent={vi.fn()}
        onDeleteAgent={vi.fn()}
      />,
    );
    expect(screen.getByText('table.emptyMessage')).toBeTruthy();
  });

  it('lets the caller say WHY it is empty when a filter narrowed it', () => {
    render(
      <AgentsTable
        agents={[]}
        selectedAgents={[]}
        onSelectionChange={vi.fn()}
        onEditAgent={vi.fn()}
        onDeleteAgent={vi.fn()}
        emptyMessage="table.noResults"
      />,
    );
    expect(screen.getByText('table.noResults')).toBeTruthy();
    expect(screen.queryByText('table.emptyMessage')).toBeNull();
  });

  // Flex divs instead of <table> cost the semantics BaseTable gave for free.
  it('keeps table semantics for assistive tech', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    // 1 header row + 2 agents.
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('cell').length).toBeGreaterThan(0);
  });

  it('reports the sort direction of the active column', () => {
    render(
      <AgentsTable
        agents={AGENTS}
        selectedAgents={[]}
        onSelectionChange={vi.fn()}
        onEditAgent={vi.fn()}
        onDeleteAgent={vi.fn()}
        sortBy="name"
        sortOrder="desc"
        onSort={vi.fn()}
      />,
    );
    const [, name] = screen.getAllByRole('columnheader');
    expect(name.getAttribute('aria-sort')).toBe('descending');
  });

  // The chip used to be pt-BR hardcoded next to a translated filter panel.
  it('takes the type chip label from the catalog, not from a hardcoded string', () => {
    renderTable();
    expect(screen.getByText('table.types.llm')).toBeTruthy();
    expect(screen.getByText('table.types.external')).toBeTruthy();
    expect(screen.queryByText('Nativo')).toBeNull();
  });

  it('announces the select-all checkbox as select-all, not as the Nome column', () => {
    renderTable();
    const [selectAll] = screen.getAllByRole('checkbox');
    expect(selectAll.getAttribute('aria-label')).toBe('table.selectAll');
  });

  it('opens the row ⋯ menu with Editar, Copiar ID and Excluir', async () => {
    allowedResources = ['ai_agents'];
    renderTable();
    await userEvent.click(screen.getAllByRole('button', { name: '' })[0]);
    expect(screen.getByText('dropdown.edit')).toBeTruthy();
    expect(screen.getByText('dropdown.copyId')).toBeTruthy();
    expect(screen.getByText('dropdown.delete')).toBeTruthy();
  });

  // AC 9 — a menu that survives a click outside traps the user.
  it('closes the row ⋯ menu on a click outside', async () => {
    renderTable();
    await userEvent.click(screen.getAllByRole('button', { name: '' })[0]);
    expect(screen.getByText('dropdown.copyId')).toBeTruthy();

    // Radix locks `pointer-events` on the body while the menu is open, so drive the
    // dismissable layer directly instead of through userEvent's pointer guard.
    fireEvent.pointerDown(document.body, { bubbles: true, button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.queryByText('dropdown.copyId')).toBeNull());
  });
});

// Same wiring as Agents.tsx: the button toggles state, the panel closes on outside click.
const FilterHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <AgentsHeader
      hideTitle
      totalCount={0}
      selectedCount={0}
      searchValue=""
      onSearchChange={vi.fn()}
      onNewAgent={vi.fn()}
      onManageApiKeys={vi.fn()}
      onBulkDelete={vi.fn()}
      onClearSelection={vi.fn()}
      onFilter={() => setOpen(o => !o)}
      showFilters
      filterPanel={
        <AgentsFilterPanel
          open={open}
          onClose={() => setOpen(false)}
          selection={EMPTY_AGENT_FACETS}
          onSelectionChange={vi.fn()}
          onClear={vi.fn()}
          modelOptions={['gpt-4o']}
        />
      }
    />
  );
};

describe('AgentsHeader + AgentsFilterPanel — toggle do botão Filtros', () => {
  // Regression: closing on the button's own `mousedown` let the following `click` reopen it.
  it('closes the panel on a second click of the Filtros button', async () => {
    render(<FilterHarness />);
    const button = screen.getByText('base.header.filters').closest('button')!;

    await userEvent.click(button);
    expect(screen.queryByText('filters.title')).toBeTruthy();

    await userEvent.click(button);
    expect(screen.queryByText('filters.title')).toBeNull();
  });

  it('still closes on a click outside the anchor', async () => {
    render(<FilterHarness />);
    await userEvent.click(screen.getByText('base.header.filters'));
    expect(screen.queryByText('filters.title')).toBeTruthy();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('filters.title')).toBeNull());
  });
});

describe('AgentsHeader — medidas do protótipo', () => {
  // Without `h-auto` the fixed height of `size="sm"` wins and the button overshoots.
  it.each(['apiKeys.manage', 'base.header.filters'])('sizes %s like the prototype tbtn', label => {
    renderHeader();
    const btn = screen.getByText(label).closest('button')!;
    expect(btn.className).toContain('h-auto');
    expect(btn.className).toContain('rounded-[9px]');
    expect(btn.className).toContain('px-[15px]');
    expect(btn.className).toContain('text-[13.5px]');
  });

  it('sizes the green button like the prototype primary', () => {
    renderHeader();
    const btn = screen.getByText('createAgent').closest('button')!;
    expect(btn.className).toContain('h-auto');
    expect(btn.className).toContain('rounded-[9px]');
    expect(btn.className).toContain('px-[18px]');
    expect(btn.className).toContain('text-[13.5px]');
  });
});
