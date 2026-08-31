import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MCPServersSection from './MCPServersSection';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useMCPIntegrations', () => ({
  useMCPIntegrations: () => ({
    available: {},
    isCheckingCredentials: false,
    reloadAllConfigs: vi.fn(),
    isConnected: () => false,
  }),
}));

vi.mock('@/constants/mcpIntegrations', () => ({
  getAvailableMCPs: () => [],
}));

vi.mock('@/components/integrations/IntegrationDialogs', () => ({
  IntegrationDialogs: () => null,
}));

vi.mock('@/components/ai_agents/CustomMCPServersSection', () => ({
  default: ({ showAddButton }: { showAddButton?: boolean }) => (
    <div data-testid="referenced-list" data-show-add-button={String(showAddButton)} />
  ),
}));

const dialogSpy = vi.fn();
vi.mock('@/components/ai_agents/Dialogs/CustomMCPDialog', () => ({
  default: (props: { open: boolean; hideCreateNew?: boolean }) => {
    dialogSpy(props);
    return props.open ? <div data-testid="custom-mcp-picker" /> : null;
  },
}));

const renderSection = (customMCPServerIds: string[] = [], onCustomMCPServersChange = vi.fn()) => {
  render(
    <MCPServersSection
      mcpServers={[]}
      customMCPServerIds={customMCPServerIds}
      onMCPServersChange={vi.fn()}
      onCustomMCPServersChange={onCustomMCPServersChange}
      agentId="agent-1"
    />
  );
  return onCustomMCPServersChange;
};

describe('MCPServersSection', () => {
  it('always renders the referenced custom MCP list (no visibility toggle)', () => {
    renderSection();
    expect(screen.getByTestId('referenced-list')).toBeTruthy();
    expect(screen.getByTestId('referenced-list').dataset.showAddButton).toBe('false');
  });

  it('opens the custom MCP picker from the "Adicionar Custom MCP" button', async () => {
    renderSection();
    expect(screen.queryByTestId('custom-mcp-picker')).toBeNull();

    await userEvent.click(screen.getByText('customMCPServers.add'));

    expect(screen.getByTestId('custom-mcp-picker')).toBeTruthy();
  });

  it('hides the "create new MCP" shortcut so the unsaved agent form is not discarded', () => {
    renderSection();
    expect(dialogSpy).toHaveBeenCalledWith(expect.objectContaining({ hideCreateNew: true }));
  });

  // The picker returns the whole selection; merging would make unchecking a no-op.
  it('applies the picker selection as-is, so unchecking a server removes it', () => {
    const onCustomMCPServersChange = renderSection(['mcp-a', 'mcp-b']);

    const { onSave } = dialogSpy.mock.calls.at(-1)![0];
    onSave(['mcp-a']);

    expect(onCustomMCPServersChange).toHaveBeenCalledWith(['mcp-a']);
  });
});
