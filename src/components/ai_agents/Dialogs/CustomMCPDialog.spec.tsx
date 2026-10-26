import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomMCPDialog from './CustomMCPDialog';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const server = (id: string, name: string) => ({
  id,
  name,
  description: '',
  url: `https://${id}.example.com`,
  timeout: 30,
  retry_count: 3,
  tags: [] as string[],
  headers: {},
  tools: [] as string[],
});

const mockListCustomMcpServersPage = vi.fn();
vi.mock('@/services/agents', () => ({
  listCustomMcpServersPage: (...args: unknown[]) => mockListCustomMcpServersPage(...args),
}));

const renderDialog = (initialSelectedIds: string[], onSave = vi.fn()) => {
  render(
    <CustomMCPDialog
      open
      onOpenChange={vi.fn()}
      onSave={onSave}
      initialSelectedIds={initialSelectedIds}
    />
  );
  return onSave;
};

describe('CustomMCPDialog', () => {
  beforeEach(() => {
    mockListCustomMcpServersPage.mockReset();
    mockListCustomMcpServersPage.mockResolvedValue({
      servers: [server('mcp-a', 'MCP A'), server('mcp-b', 'MCP B')],
      total: 2,
    });
  });

  // `onSave` replaces the whole selection, so unchecking everything unlinks everything.
  it('confirms an empty selection so every server can be unlinked', async () => {
    const onSave = renderDialog(['mcp-a']);
    await waitFor(() => expect(screen.getByText('MCP A')).toBeTruthy());

    await userEvent.click(screen.getByText('MCP A'));
    await userEvent.click(screen.getByText('dialogs.customMcp.saveSelection'));

    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('confirms the checked servers as the whole selection', async () => {
    const onSave = renderDialog([]);
    await waitFor(() => expect(screen.getByText('MCP B')).toBeTruthy());

    await userEvent.click(screen.getByText('MCP B'));
    await userEvent.click(screen.getByText('dialogs.customMcp.saveSelection'));

    expect(onSave).toHaveBeenCalledWith(['mcp-b']);
  });

  it('reaches the server past the first page through the search and saves it', async () => {
    mockListCustomMcpServersPage.mockImplementation(
      async ({ skip, limit }: { skip: number; limit: number }) => ({
        servers: Array.from({ length: Math.max(0, Math.min(limit, 101 - skip)) }, (_, i) =>
          server(`mcp-${skip + i + 1}`, `MCP ${skip + i + 1}`),
        ),
        total: 101,
      }),
    );
    const onSave = renderDialog([]);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('MCP 1')).toBeTruthy());
    await user.type(screen.getByPlaceholderText('dialogs.customMcp.searchPlaceholder'), 'MCP 101');
    await user.click(screen.getByText('MCP 101'));
    await user.click(screen.getByText('dialogs.customMcp.saveSelection'));

    expect(mockListCustomMcpServersPage).toHaveBeenCalledWith({ skip: 100, limit: 100 });
    expect(onSave).toHaveBeenCalledWith(['mcp-101']);
  });
});
