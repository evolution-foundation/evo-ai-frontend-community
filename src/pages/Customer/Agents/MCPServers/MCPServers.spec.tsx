import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
vi.mock('@/components/mcpServers/MCPServersHeader', () => ({ default: () => null }));
vi.mock('@/components/mcpServers/MCPServersTable', () => ({ default: () => null }));
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

  it('asks for the next slice keeping the chosen page size', async () => {
    render(<MCPServers />);

    await userEvent.click(await screen.findByTestId('per-page-50'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(listMCPServersPage).toHaveBeenCalledTimes(3));
    expect(listMCPServersPage.mock.calls[2][0]).toMatchObject({ skip: 50, limit: 50 });
  });
});
