import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CustomMCPServers from './CustomMCPServers';
import type { CustomMcpServer } from '@/types/ai';

const serverA = {
  id: 'mcp-1',
  name: 'Github MCP',
  description: 'Repositórios',
  url: 'https://mcp.github.example/sse',
  timeout: 30,
  tags: ['dev', 'git'],
  tools: [{ name: 'a' }, { name: 'b' }],
  created_at: '2026-09-01T00:00:00Z',
} as unknown as CustomMcpServer;
const serverB = {
  id: 'mcp-2',
  name: 'Drive MCP',
  description: '',
  url: 'https://mcp.drive.example/sse',
  timeout: 60,
  tags: ['docs'],
  tools: null,
  created_at: '2026-09-02T00:00:00Z',
} as unknown as CustomMcpServer;

const listCustomMcpServers = vi.fn();
// `meta.pagination.total` of the list response; undefined = one page holds the whole base.
let listTotal: number | undefined;
const deleteCustomMcpServer = vi.fn();
const testCustomMcpServer = vi.fn();
const success = vi.fn();
const error = vi.fn();

vi.mock('@/services/agents/customMcpServerService', () => ({
  listCustomMcpServersPage: async (...args: unknown[]) => {
    const servers = await listCustomMcpServers(...args);
    return { servers, total: listTotal ?? servers.length };
  },
  deleteCustomMcpServer: (...args: unknown[]) => deleteCustomMcpServer(...args),
  testCustomMcpServer: (...args: unknown[]) => testCustomMcpServer(...args),
  getCustomMcpServer: vi.fn(),
  createCustomMcpServer: vi.fn(),
  updateCustomMcpServer: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => success(...args),
    error: (...args: unknown[]) => error(...args),
    info: vi.fn(),
  },
}));

let canDelete = true;
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (_resource: string, action: string) => action !== 'delete' || canDelete,
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Options-aware echo: an interpolated value that went missing or got swapped fails the spec.
    t: (key: string, opts?: Record<string, unknown>) => {
      const named = Object.keys(opts ?? {}).sort();
      return named.length > 0
        ? `${key}#${named.map(name => `${name}=${String(opts![name])}`).join(',')}`
        : key;
    },
    currentLanguage: 'en',
  }),
}));

vi.mock('@/tours', () => ({ AgentsCustomMCPsTour: () => null }));
vi.mock('@/components/agents', () => ({
  AgentsTabsLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/agents/custom-mcp-servers']}>
      <CustomMCPServers />
    </MemoryRouter>,
  );

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
const filterPanel = () =>
  document.querySelector('[data-custom-mcp-filter-root]') as HTMLElement;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

const testResponse = (toolsCount: number) => ({
  server: serverA,
  test_result: { success: true, tools_count: toolsCount, error: '', message: '', response_time: 0 },
});

describe('CustomMCPServers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTotal = undefined;
    canDelete = true;
    listCustomMcpServers.mockResolvedValue([serverA, serverB]);
    deleteCustomMcpServer.mockResolvedValue(undefined);
  });

  it('opens straight on the table, with no cards/table toggle', async () => {
    renderPage();

    expect(await screen.findByText('Github MCP')).toBeInTheDocument();
    expect(screen.getByText('table.columns.server')).toBeInTheDocument();
    expect(screen.getByText('table.columns.timeout')).toBeInTheDocument();
    expect(rowOf('Github MCP')).toHaveTextContent('30s');
    expect(rowOf('Drive MCP')).toHaveTextContent('60s');
    expect(document.querySelector('[data-tour="agents-custom-mcps-view-toggle"]')).toBeNull();
  });

  describe('test dialog', () => {
    it('shows the tools discovered by the handshake, not the stale DB count', async () => {
      testCustomMcpServer.mockResolvedValue({
        server: { ...serverA, tools: [{}, {}] },
        test_result: { success: true, tools_count: 7, error: '', message: '', response_time: 0.1 },
      });
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.click(within(rowOf('Github MCP')).getByText('actions.test'));

      const dialog = await screen.findByRole('dialog');
      expect(await within(dialog).findByText('testDialog.titleSuccess')).toBeInTheDocument();
      expect(within(dialog).getByText('testDialog.toolsDiscovered#count=7')).toBeInTheDocument();
      expect(testCustomMcpServer).toHaveBeenCalledWith('mcp-1');
      expect(success).not.toHaveBeenCalled();
    });

    it('shows the server error in the error box when the test fails', async () => {
      testCustomMcpServer.mockResolvedValue({
        server: serverB,
        test_result: {
          success: false,
          error: 'dial tcp: lookup mcp.drive.example: no such host',
          message: '',
          response_time: 0,
        },
      });
      renderPage();

      await screen.findByText('Drive MCP');
      await userEvent.click(within(rowOf('Drive MCP')).getByText('actions.test'));

      const dialog = await screen.findByRole('dialog');
      expect(await within(dialog).findByText('testDialog.titleError')).toBeInTheDocument();
      expect(within(dialog).getByText('testDialog.errorLabel')).toBeInTheDocument();
      expect(within(dialog).getByText(/no such host/)).toBeInTheDocument();
      expect(error).not.toHaveBeenCalled();
    });

    it('keeps the newest run when the same server is re-tested before the first answers', async () => {
      const first = deferred<ReturnType<typeof testResponse>>();
      testCustomMcpServer
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(testResponse(9));
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.click(within(rowOf('Github MCP')).getByText('actions.test'));
      await userEvent.click(await screen.findByText('testDialog.close'));
      await userEvent.click(within(rowOf('Github MCP')).getByText('actions.test'));

      const dialog = await screen.findByRole('dialog');
      expect(await within(dialog).findByText('testDialog.toolsDiscovered#count=9')).toBeInTheDocument();

      first.resolve(testResponse(1));
      await new Promise(r => setTimeout(r, 0));
      expect(within(dialog).getByText('testDialog.toolsDiscovered#count=9')).toBeInTheDocument();
      expect(within(dialog).queryByText('testDialog.toolsDiscovered#count=1')).toBeNull();
    });

    it('reports a request that never reached the server as a failure too', async () => {
      testCustomMcpServer.mockRejectedValue(new Error('Network Error'));
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.click(within(rowOf('Github MCP')).getByText('actions.test'));

      const dialog = await screen.findByRole('dialog');
      expect(await within(dialog).findByText('testDialog.titleError')).toBeInTheDocument();
      expect(within(dialog).getByText('errors.testError')).toBeInTheDocument();
    });
  });

  it('bulk-deletes the selection behind a confirmation and reports a partial failure', async () => {
    deleteCustomMcpServer.mockImplementation((id: string) =>
      id === 'mcp-2' ? Promise.reject(new Error('409')) : Promise.resolve(undefined),
    );
    renderPage();

    await screen.findByText('Github MCP');
    const [selectAll] = screen.getAllByRole('checkbox');
    await userEvent.click(selectAll);
    await userEvent.click(screen.getByText('header.bulkDelete'));

    expect(await screen.findByText('bulkDeleteDialog.description#count=2')).toBeInTheDocument();
    expect(deleteCustomMcpServer).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(deleteCustomMcpServer).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('bulkDeleteDialog.partialError#failed=1,total=2'),
    );
    expect(success).not.toHaveBeenCalled();
    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(2));
  });

  it('confirms a fully successful bulk delete and refetches', async () => {
    renderPage();

    await screen.findByText('Github MCP');
    const [selectAll] = screen.getAllByRole('checkbox');
    await userEvent.click(selectAll);
    await userEvent.click(screen.getByText('header.bulkDelete'));
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(success).toHaveBeenCalledWith('bulkDeleteDialog.success#count=2'));
    expect(deleteCustomMcpServer).toHaveBeenCalledWith('mcp-1');
    expect(deleteCustomMcpServer).toHaveBeenCalledWith('mcp-2');
    expect(error).not.toHaveBeenCalled();
    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(2));
  });

  it('paginates by the backend total, keeping the search on the next page', async () => {
    listTotal = 45;
    renderPage();

    await screen.findByText('Github MCP');

    await userEvent.type(screen.getByPlaceholderText('header.searchPlaceholder'), 'mcp');
    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(2), { timeout: 2000 });
    await userEvent.click(await screen.findByRole('button', { name: '3' }));

    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(3));
    expect(listCustomMcpServers.mock.lastCall![0]).toEqual(
      expect.objectContaining({ skip: 40, limit: 20, search: 'mcp' }),
    );
  });

  it('drops the selection when the page changes', async () => {
    listTotal = 45;
    renderPage();

    await screen.findByText('Github MCP');
    await userEvent.click(within(rowOf('Github MCP')).getByRole('checkbox'));
    expect(screen.getByText('header.bulkDelete')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => expect(screen.queryByText('header.bulkDelete')).toBeNull());
  });

  it('removes a server deleted from its row menu from the bulk selection', async () => {
    renderPage();

    await screen.findByText('Github MCP');
    await userEvent.click(within(rowOf('Github MCP')).getByRole('checkbox'));
    await userEvent.click(within(rowOf('Drive MCP')).getByRole('checkbox'));

    listCustomMcpServers.mockResolvedValue([serverB]);
    await userEvent.click(
      rowOf('Github MCP').querySelector('[aria-haspopup="menu"]') as HTMLElement,
    );
    await userEvent.click(await screen.findByText('table.actions.delete'));
    await userEvent.click(await screen.findByText('deleteDialog.confirm'));
    await waitFor(() => expect(deleteCustomMcpServer).toHaveBeenCalledWith('mcp-1'));
    await waitFor(() => expect(screen.queryByText('Github MCP')).toBeNull());

    await userEvent.click(screen.getByText('header.bulkDelete'));
    expect(await screen.findByText('bulkDeleteDialog.description#count=1')).toBeInTheDocument();
  });

  it('steps back a page when the row menu deletes the last row of the page', async () => {
    listTotal = 21;
    renderPage();

    await screen.findByText('Github MCP');
    listCustomMcpServers.mockResolvedValue([serverA]);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(screen.queryByText('Drive MCP')).toBeNull());

    await userEvent.click(
      (await screen.findByText('Github MCP'))
        .closest('tr')!
        .querySelector('[aria-haspopup="menu"]') as HTMLElement,
    );
    await userEvent.click(await screen.findByText('table.actions.delete'));
    await userEvent.click(await screen.findByText('deleteDialog.confirm'));

    await waitFor(() => expect(deleteCustomMcpServer).toHaveBeenCalledWith('mcp-1'));
    await waitFor(() =>
      expect(listCustomMcpServers.mock.lastCall![0]).toEqual(
        expect.objectContaining({ skip: 0, limit: 20 }),
      ),
    );
  });

  it('steps back a page when a bulk delete empties the page', async () => {
    listTotal = 21;
    renderPage();

    await screen.findByText('Github MCP');
    listCustomMcpServers.mockResolvedValue([serverB]);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(screen.queryByText('Github MCP')).toBeNull());

    await screen.findByText('Drive MCP');
    const [selectAll] = screen.getAllByRole('checkbox');
    await userEvent.click(selectAll);
    await userEvent.click(screen.getByText('header.bulkDelete'));
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(success).toHaveBeenCalledWith('bulkDeleteDialog.success#count=1'));
    await waitFor(() =>
      expect(listCustomMcpServers.mock.lastCall![0]).toEqual(
        expect.objectContaining({ skip: 0, limit: 20 }),
      ),
    );
  });

  it('hides the bulk Delete from whoever lacks the delete permission', async () => {
    canDelete = false;
    renderPage();

    await screen.findByText('Github MCP');
    await userEvent.click(within(rowOf('Github MCP')).getByRole('checkbox'));

    expect(screen.getByText('base.header.selected#count=1')).toBeInTheDocument();
    expect(screen.queryByText('header.bulkDelete')).toBeNull();
  });

  it('ignores a list response that arrives after a newer one', async () => {
    renderPage();

    await screen.findByText('Github MCP');
    const stale = deferred<CustomMcpServer[]>();
    listCustomMcpServers.mockReturnValueOnce(stale.promise);
    await userEvent.click(screen.getByText('base.header.filters'));
    await userEvent.click(within(filterPanel()).getByRole('checkbox', { name: 'docs' }));
    await userEvent.click(within(filterPanel()).getByRole('checkbox', { name: 'docs' }));
    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(3));
    await screen.findByText('Github MCP');

    await act(async () => {
      stale.resolve([serverB]);
    });
    expect(screen.getByText('Github MCP')).toBeInTheDocument();
  });

  it('keeps the chosen page size when a search reloads the list', async () => {
    listTotal = 45;
    renderPage();

    await screen.findByText('Github MCP');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: '50' }));
    await waitFor(() =>
      expect(listCustomMcpServers.mock.lastCall![0]).toEqual(expect.objectContaining({ limit: 50 })),
    );

    await userEvent.type(screen.getByPlaceholderText('header.searchPlaceholder'), 'g');
    await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(3), { timeout: 2000 });
    expect(listCustomMcpServers.mock.lastCall![0]).toEqual(
      expect.objectContaining({ skip: 0, limit: 50, search: 'g' }),
    );
  });

  it('says nothing matched, instead of "create your first server", when search narrows to zero', async () => {
    renderPage();

    await screen.findByText('Github MCP');
    listCustomMcpServers.mockResolvedValue([]);
    await userEvent.type(screen.getByPlaceholderText('header.searchPlaceholder'), 'zzz');

    expect(await screen.findByText('table.noResults', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByText('emptyState.title')).toBeNull();
  });

  describe('filter panel', () => {
    it('ANDs a tag with a timeout, distributed the way the flat backend glue needs', async () => {
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.click(screen.getByText('base.header.filters'));
      await userEvent.click(within(filterPanel()).getByRole('checkbox', { name: 'docs' }));
      await userEvent.click(
        within(filterPanel()).getByRole('checkbox', { name: 'filters.timeoutValue#timeout=60' }),
      );

      await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(3));
      expect(listCustomMcpServers.mock.lastCall![1]).toEqual({
        'filters[0][attribute_key]': 'tags',
        'filters[0][filter_operator]': 'equal_to',
        'filters[0][values]': 'docs',
        'filters[1][attribute_key]': 'timeout',
        'filters[1][filter_operator]': 'equal_to',
        'filters[1][values]': '60',
        'filters[1][query_operator]': 'and',
      });
    });

    // The debounce callback must read the facets when it fires, not when the user typed.
    it('keeps a facet ticked while the search debounce is pending', async () => {
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.type(screen.getByPlaceholderText('header.searchPlaceholder'), 'g');
      await userEvent.click(screen.getByText('base.header.filters'));
      await userEvent.click(within(filterPanel()).getByRole('checkbox', { name: 'git' }));

      // Initial load, the facet click, then the debounced search: the last one decides the rows.
      await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(3), {
        timeout: 2000,
      });
      expect(listCustomMcpServers.mock.lastCall![0]).toEqual(
        expect.objectContaining({ search: 'g' }),
      );
      expect(listCustomMcpServers.mock.lastCall![1]).toEqual(
        expect.objectContaining({ 'filters[0][values]': 'git' }),
      );
    });

    it('offers only Tags and Timeout, built from the loaded servers, and filters server-side', async () => {
      renderPage();

      await screen.findByText('Github MCP');
      await userEvent.click(screen.getByText('base.header.filters'));

      expect(screen.getByText('filters.sections.tags')).toBeInTheDocument();
      expect(screen.getByText('filters.sections.timeout')).toBeInTheDocument();
      // The table rows carry checkboxes too: read only the ones inside the panel.
      const panel = filterPanel();
      const options = within(panel)
        .getAllByRole('checkbox')
        .map(el => el.textContent);
      expect(options).toEqual([
        'dev',
        'docs',
        'git',
        'filters.timeoutValue#timeout=30',
        'filters.timeoutValue#timeout=60',
      ]);

      await userEvent.click(screen.getByRole('checkbox', { name: 'docs' }));

      await waitFor(() => expect(listCustomMcpServers).toHaveBeenCalledTimes(2));
      expect(listCustomMcpServers).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0 }),
        {
          'filters[0][attribute_key]': 'tags',
          'filters[0][filter_operator]': 'equal_to',
          'filters[0][values]': 'docs',
        },
      );
    });

    it('shows "no options" in both sections when there is no data', async () => {
      listCustomMcpServers.mockResolvedValue([]);
      renderPage();

      await screen.findByText('emptyState.title');
      await userEvent.click(screen.getByText('base.header.filters'));

      expect(screen.getAllByText('filters.empty')).toHaveLength(2);
    });
  });
});
