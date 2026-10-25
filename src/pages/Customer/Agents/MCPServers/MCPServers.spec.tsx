import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCPServers from './MCPServers';
import { MCPServer } from '@/types/ai';

const server = { id: 'mcp-1', name: 'Github' } as unknown as MCPServer;
const listMCPServersPage = vi.fn();

vi.mock('@/services/agents/mcpServerService', () => ({
  listMCPServersPage: (...args: unknown[]) => listMCPServersPage(...args),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

vi.mock('@/hooks/rbac/usePermissionGatedLoad', async () => {
  const { useEffect } = await import('react');
  return {
    usePermissionGatedLoad: ({ load }: { load: () => void }) => {
      useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/mcpServers', () => ({
  MCPServerCard: ({ server }: { server: MCPServer }) => <span>{server.name}</span>,
}));
// A named icon, so the spec can reach the table view's toggle.
vi.mock('lucide-react', async importOriginal => ({
  ...(await importOriginal<typeof import('lucide-react')>()),
  List: () => <span>table-view</span>,
}));
vi.mock('@/components/mcpServers/MCPServersHeader', () => ({
  default: ({
    selectedCount,
    searchValue,
    onSearchChange,
  }: {
    selectedCount: number;
    searchValue: string;
    onSearchChange: (value: string) => void;
  }) => (
    <div>
      <span data-testid="selected-count">{selectedCount}</span>
      <input
        data-testid="search"
        value={searchValue}
        onChange={event => onSearchChange(event.target.value)}
      />
    </div>
  ),
}));
vi.mock('@/components/mcpServers/MCPServersTable', () => ({
  default: ({
    servers,
    onSelectionChange,
  }: {
    servers: MCPServer[];
    onSelectionChange: (servers: MCPServer[]) => void;
  }) => (
    <button data-testid="select-all" onClick={() => onSelectionChange(servers)}>
      select-all
    </button>
  ),
}));
vi.mock('@/components/mcpServers/MCPServerDetails', () => ({ default: () => null }));
vi.mock('@/components/mcpServers/MCPServersPagination', () => ({
  default: ({
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    onPerPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
  }) => (
    <div>
      <span data-testid="pagination">{`${currentPage}/${totalPages}/${totalCount}`}</span>
      <button data-testid="page-2" onClick={() => onPageChange(2)}>
        page-2
      </button>
      {/* Like BasePagination off page 1: the new size, then a jump back to page 1. */}
      <button
        data-testid="per-page-50"
        onClick={() => {
          onPerPageChange(50);
          if (currentPage > 1) onPageChange(1);
        }}
      >
        per-page-50
      </button>
    </div>
  ),
}));

describe('MCPServers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMCPServersPage.mockResolvedValue({ servers: [server], total: 45 });
  });

  it('counts pages by the backend total, not by the rows on screen', async () => {
    render(<MCPServers />);

    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));
    expect(listMCPServersPage).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 20 }));
  });

  it('keeps the new page size when the pager also jumps back to page 1', async () => {
    render(<MCPServers />);

    await userEvent.click(await screen.findByTestId('page-2'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45'));
    await userEvent.click(screen.getByTestId('per-page-50'));

    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));
    expect(listMCPServersPage.mock.lastCall![0]).toMatchObject({ skip: 0, limit: 50 });
  });

  it('ignores an older page answering after a newer one', async () => {
    let answerPage2: (page: unknown) => void = () => {};
    render(<MCPServers />);
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));

    listMCPServersPage.mockImplementationOnce(() => new Promise(resolve => (answerPage2 = resolve)));
    await userEvent.click(screen.getByTestId('page-2'));
    await userEvent.click(screen.getByTestId('per-page-50'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));

    answerPage2({ servers: [server], total: 45 });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45');
  });

  it('keeps the footer on the rows still shown when a page request fails', async () => {
    render(<MCPServers />);
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));

    listMCPServersPage.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByTestId('page-2'));

    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45');
  });

  it('asks for the next slice keeping the chosen page size', async () => {
    render(<MCPServers />);

    await userEvent.click(await screen.findByTestId('per-page-50'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(3));
    expect(listMCPServersPage.mock.calls[2][0]).toMatchObject({ skip: 50, limit: 50 });
  });

  it('asks for the size on screen again after a size change fails', async () => {
    render(<MCPServers />);
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));

    listMCPServersPage.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByTestId('per-page-50'));
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('loading.servers')).not.toBeInTheDocument());

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(3));
    expect(listMCPServersPage.mock.calls[2][0]).toMatchObject({ skip: 20, limit: 20 });
  });

  it('drops the selection when another page loads', async () => {
    render(<MCPServers />);

    await userEvent.click(await screen.findByText('table-view'));
    await userEvent.click(await screen.findByTestId('select-all'));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(screen.getByTestId('selected-count')).toHaveTextContent('0'));
  });

  it('sends one search request once typing settles', async () => {
    render(<MCPServers />);
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(1));

    const input = screen.getByTestId('search');
    fireEvent.change(input, { target: { value: 'g' } });
    fireEvent.change(input, { target: { value: 'gi' } });
    fireEvent.change(input, { target: { value: 'git' } });

    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(listMCPServersPage.mock.calls[1][0]).toMatchObject({ skip: 0, limit: 20, search: 'git' });
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(listMCPServersPage).toHaveBeenCalledTimes(2);
  });

  it('keeps the search when the page or the page size changes', async () => {
    listMCPServersPage.mockResolvedValue({ servers: [server], total: 25 });
    render(<MCPServers />);
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'git' } });
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(2), { timeout: 2000 });
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/2/25'));

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(3));
    expect(listMCPServersPage.mock.calls[2][0]).toMatchObject({ skip: 20, limit: 20, search: 'git' });

    await userEvent.click(screen.getByTestId('per-page-50'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/25'));
    expect(listMCPServersPage.mock.lastCall![0]).toMatchObject({ skip: 0, limit: 50, search: 'git' });
  });

  it('goes back to the whole list on page 1 when the search is cleared', async () => {
    render(<MCPServers />);
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByTestId('search'), { target: { value: 'git' } });
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(2), { timeout: 2000 });
    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45'));

    fireEvent.change(screen.getByTestId('search'), { target: { value: '' } });
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(4), { timeout: 2000 });
    expect(listMCPServersPage.mock.calls[3][0]).toMatchObject({ skip: 0, limit: 20, search: '' });
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));
  });

  it('keeps the footer on the rows still shown while a search waits or fails', async () => {
    render(<MCPServers />);
    await userEvent.click(await screen.findByTestId('page-2'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45'));

    listMCPServersPage.mockRejectedValueOnce(new Error('offline'));
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'git' } });
    expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45');

    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(3), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByText('loading.servers')).not.toBeInTheDocument());
    expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45');
  });
});
