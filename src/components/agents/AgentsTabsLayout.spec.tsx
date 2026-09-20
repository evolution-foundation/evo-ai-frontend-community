import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentsTabsLayout from './AgentsTabsLayout';
import { resolveFirstAllowedTab } from './agentsTabs';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

let allowedResources: string[] = [];
let permissionsReady = true;

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) =>
      action === 'read' && allowedResources.includes(resource),
    isReady: permissionsReady,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

const ALL_RESOURCES = ['ai_agents', 'ai_custom_tools', 'ai_custom_mcp_servers'];

const TAB_LABELS = {
  agents: 'container.tabs.agents',
  customTools: 'container.tabs.customTools',
  customMcpServers: 'container.tabs.customMcpServers',
};

const renderLayout = (
  tab: 'agents' | 'customTools' | 'customMcpServers' = 'agents',
  pathname = '/agents/list',
) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <AgentsTabsLayout tab={tab}>
        <div>conteudo-da-aba</div>
      </AgentsTabsLayout>
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockClear();
  allowedResources = [...ALL_RESOURCES];
  permissionsReady = true;
});

describe('resolveFirstAllowedTab', () => {
  const can = (resource: string) => allowedResources.includes(resource);

  it('resolves the agents tab when everything is granted', () => {
    expect(resolveFirstAllowedTab(can, true)?.route).toBe('/agents/list');
  });

  it('skips straight to the first tab the user may actually read', () => {
    allowedResources = ['ai_custom_mcp_servers'];
    expect(resolveFirstAllowedTab(can, true)?.route).toBe('/agents/custom-mcp-servers');
  });

  it('resolves nothing before the permissions finished loading', () => {
    expect(resolveFirstAllowedTab(can, false)).toBeNull();
  });

  it('resolves nothing when no tab is readable', () => {
    allowedResources = [];
    expect(resolveFirstAllowedTab(can, true)).toBeNull();
  });
});

describe('AgentsTabsLayout', () => {
  it('renders the 3 tabs in the canonical order', () => {
    renderLayout();
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      TAB_LABELS.agents,
      TAB_LABELS.customTools,
      TAB_LABELS.customMcpServers,
    ]);
    expect(screen.getByText('conteudo-da-aba')).toBeTruthy();
  });

  // Decision 1 (TL, 2026-07-31): no read → the tab is hidden, not disabled.
  it('hides the tab whose resource the user cannot read', () => {
    allowedResources = ['ai_agents', 'ai_custom_mcp_servers'];
    renderLayout();
    expect(screen.queryByText(TAB_LABELS.customTools)).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  // A fixed "Agentes de IA" title on top of Ferramentas/MCPs lies about where you are.
  it.each([
    ['agents', 'container.tabs.agents', 'container.subtitles.agents'],
    ['customTools', 'container.tabs.customTools', 'container.subtitles.customTools'],
    [
      'customMcpServers',
      'container.tabs.customMcpServers',
      'container.subtitles.customMcpServers',
    ],
  ] as const)('titles the page after the %s tab, not after the screen', (tab, title, subtitle) => {
    renderLayout(tab, `/agents/${tab}`);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(subtitle)).toBeTruthy();
  });

  it('navigates to the tab route when another chip is picked', async () => {
    renderLayout();
    await userEvent.click(screen.getByText(TAB_LABELS.customTools));
    expect(navigateMock).toHaveBeenCalledWith('/agents/custom-tools');
  });

  it('sends /agents to the first allowed tab instead of a blind /agents/list', () => {
    allowedResources = ['ai_custom_tools', 'ai_custom_mcp_servers'];
    renderLayout('agents', '/agents');
    expect(navigateMock).toHaveBeenCalledWith('/agents/custom-tools', { replace: true });
  });

  it('sends /agents to /agents/list when the agents tab is readable', () => {
    renderLayout('agents', '/agents');
    expect(navigateMock).toHaveBeenCalledWith('/agents/list', { replace: true });
  });

  // Direct URL or bookmark: bounce before the screen loads and 403s.
  it('redirects out of a tab route the user may not read', () => {
    allowedResources = ['ai_custom_mcp_servers'];
    renderLayout('customTools', '/agents/custom-tools');
    expect(navigateMock).toHaveBeenCalledWith('/agents/custom-mcp-servers', { replace: true });
    expect(screen.queryByText('conteudo-da-aba')).toBeNull();
  });

  it('keeps the user on a tab route they are allowed to read', () => {
    renderLayout('customTools', '/agents/custom-tools');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText('conteudo-da-aba')).toBeTruthy();
  });

  // AC 4b: with no destination a redirect would bounce forever.
  it('stops on a terminal state — no tabs, no navigation — when nothing is readable', () => {
    allowedResources = [];
    renderLayout('agents', '/agents');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('container.noAccess.title')).toBeTruthy();
    expect(screen.queryByText('conteudo-da-aba')).toBeNull();
  });

  // Deciding against half-loaded permissions evicts the user from their own tab.
  it('holds instead of deciding while the permissions are still loading', () => {
    permissionsReady = false;
    renderLayout('customTools', '/agents/custom-tools');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText('container.noAccess.title')).toBeNull();
  });

  // Without an explicit `flex-none` the TabsTrigger base wins and the chips stretch.
  it('sizes each chip by its content instead of stretching it across the bar', () => {
    renderLayout();
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.className).toContain('flex-none');
      expect(tab.className).not.toContain('flex-1');
    }
  });

  // Embedded in the shell `--muted` equals `--card`, so `hover:bg-muted` is a no-op.
  it('highlights an inactive chip with a token that differs from the bar surface', () => {
    renderLayout();
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.className).toContain('hover:bg-accent');
      expect(tab.className).not.toContain('hover:bg-muted');
    }
  });
});
