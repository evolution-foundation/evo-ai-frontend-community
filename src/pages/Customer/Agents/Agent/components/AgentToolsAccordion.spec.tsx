import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AgentToolsAccordion from './AgentToolsAccordion';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ai_agents/Forms/SubAgentsForm', () => ({
  default: () => <div data-testid="sub-agents-form" />,
}));
vi.mock('../sections/ToolsSection', () => ({
  default: () => <div data-testid="tools-section" />,
}));
vi.mock('../sections/IntegrationsSection', () => ({
  default: () => <div data-testid="integrations-section" />,
}));
vi.mock('../sections/MCPServersSection', () => ({
  default: () => <div data-testid="mcp-servers-section" />,
}));

const BLOCK_TITLES = {
  subAgents: 'edit.menu.subAgents',
  tools: 'edit.menu.tools',
  integrations: 'edit.menu.integrations',
  mcpServers: 'edit.menu.mcpServers',
};

const renderAccordion = (agentType: string) =>
  render(
    <AgentToolsAccordion
      agentId="agent-1"
      agentType={agentType}
      subAgentsData={{ sub_agents: [] }}
      onSubAgentsChange={vi.fn()}
      agentTools={[]}
      agentToolsData={[]}
      customTools={{ http_tools: [] }}
      onAgentToolsChange={vi.fn()}
      onCustomToolsChange={vi.fn()}
      integrations={{}}
      onIntegrationsChange={vi.fn()}
      mcpServers={[]}
      customMCPServerIds={[]}
      onMCPServersChange={vi.fn()}
      onCustomMCPServersChange={vi.fn()}
    />
  );

describe('AgentToolsAccordion', () => {
  it('renders the 4 collapsible blocks, in order, for an llm agent', () => {
    renderAccordion('llm');
    const headers = screen.getAllByRole('button').map(button => button.textContent);
    expect(headers).toEqual([
      BLOCK_TITLES.subAgents,
      BLOCK_TITLES.tools,
      BLOCK_TITLES.integrations,
      BLOCK_TITLES.mcpServers,
    ]);
  });

  it('toggles a block without collapsing the others', async () => {
    renderAccordion('llm');
    // Sub Agents opens by default so the tab does not start visually empty.
    expect(screen.getByTestId('sub-agents-form')).toBeTruthy();
    expect(screen.queryByTestId('integrations-section')).toBeNull();

    await userEvent.click(screen.getByText(BLOCK_TITLES.integrations));

    expect(screen.getByTestId('integrations-section')).toBeTruthy();
    expect(screen.getByTestId('sub-agents-form')).toBeTruthy();
  });

  it('shows only Sub Agentes for flow orchestrators', () => {
    renderAccordion('sequential');
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      BLOCK_TITLES.subAgents,
    ]);
  });

  it('omits Sub Agentes for a2a agents, keeping the 3 tool blocks', () => {
    renderAccordion('a2a');
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual([
      BLOCK_TITLES.tools,
      BLOCK_TITLES.integrations,
      BLOCK_TITLES.mcpServers,
    ]);
  });
});
