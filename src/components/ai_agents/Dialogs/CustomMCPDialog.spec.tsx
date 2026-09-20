import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('@/services/agents', () => ({
  listCustomMcpServers: vi.fn(async () => [server('mcp-a', 'MCP A'), server('mcp-b', 'MCP B')]),
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
});
