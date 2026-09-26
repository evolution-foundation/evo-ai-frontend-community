// RULING (see ledger): this project uses Vitest — `vi.mock`/`vi.fn`/`vi.mocked`,
// not `jest.mock`/`jest.fn`/`as jest.Mock`.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AgentEditPage from './AgentEditPage';
import { getAgent, updateAgent } from '@/services/agents';
import api from '@/services/core/api';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/agents', () => ({
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
  listApiKeys: vi.fn().mockResolvedValue([]),
  getAccessibleAgents: vi.fn().mockResolvedValue({ data: [] }),
  getAgentIntegrations: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/agents/integrationService', () => ({
  default: {
    getIntegration: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/users/usersService', () => ({
  default: {
    getUsers: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/teams/teamsService', () => ({
  default: {
    getTeams: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// The page renders a lot of nested sections; none of them are relevant to the
// config-save payload this spec verifies, so they are stubbed out to a bare
// element that just proves the page rendered.
vi.mock('./sections/ProfileSection', () => ({ default: () => <div data-testid="profile-section" /> }));
vi.mock('./sections/ProductsSection', () => ({ default: () => <div /> }));
vi.mock('./sections/ConfigurationSection', () => ({ default: () => <div /> }));
vi.mock('./components/AgentToolsAccordion', () => ({
  default: ({ onKnowledgeBaseChange }: { onKnowledgeBaseChange: (id: string) => void }) => (
    <button onClick={() => onKnowledgeBaseChange('kb-456')}>attach-knowledge-base</button>
  ),
}));
// The real Tabs primitive (Radix) drives its Presence animations off jsdom's
// stubbed layout/animation APIs, which never settle and pins the test in an
// endless act() re-render loop unrelated to this spec's config-save assertion.
// Replace it with a bare passthrough that renders every TabsContent child.
vi.mock('./components/AgentDetailTabs', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@evoapi/design-system', async () => {
  const actual = await vi.importActual<typeof import('@evoapi/design-system')>(
    '@evoapi/design-system',
  );
  return {
    ...actual,
    TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});
vi.mock('./components/AgentChannelsShell', () => ({ default: () => <div /> }));
vi.mock('@/components/agents/AgentTestChat', () => ({ default: () => null }));

// The real header renders behind a `?` icon-only save button; stubbing it to a
// plain button keeps this spec focused on what handleSave sends, not on the
// header's own markup/disabled-state rules (covered elsewhere).
vi.mock('./sections/AgentEditHeader', () => ({
  default: ({ onSave }: { onSave: () => void }) => (
    <button onClick={onSave}>save-agent</button>
  ),
}));

const baseAgent = {
  id: 'agent-1',
  name: 'My Agent',
  description: 'desc',
  role: 'role',
  goal: 'goal',
  client_id: 'client-1',
  type: 'llm',
  model: 'gpt-4',
  api_key_id: 'key-1',
  instruction: 'do things',
  created_at: '2026-01-01T00:00:00Z',
  config: {
    // Simulates an agent that already has a knowledge base attached via the
    // separate attach endpoint (handleKnowledgeBaseChange), before any edit-and-save.
    knowledge_base_id: 'kb-123',
    knowledge_tags: ['pricing'],
  },
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/agents/agent-1']}>
      <Routes>
        <Route path="/agents/:id" element={<AgentEditPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AgentEditPage handleSave', () => {
  beforeEach(() => {
    vi.mocked(getAgent).mockResolvedValue(baseAgent as any);
    vi.mocked(updateAgent).mockResolvedValue(baseAgent as any);
  });

  it('includes the attached knowledge_base_id in the config payload sent on save', async () => {
    renderPage();

    await screen.findByTestId('profile-section');

    await userEvent.click(screen.getByText('save-agent'));

    await waitFor(() => expect(updateAgent).toHaveBeenCalled());

    const [, payload] = vi.mocked(updateAgent).mock.calls[0];
    expect(payload.config).toMatchObject({ knowledge_base_id: 'kb-123' });
  });

  it('includes the current knowledge_tags when attaching a knowledge base', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    renderPage();

    await screen.findByTestId('profile-section');

    await userEvent.click(screen.getByText('attach-knowledge-base'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/ai_agents/agent-1/knowledge_base', {
        knowledge_base_id: 'kb-456',
        knowledge_tags: ['pricing'],
      }),
    );
  });
});
