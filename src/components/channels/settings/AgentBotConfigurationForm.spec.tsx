import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentBotConfigurationForm from './AgentBotConfigurationForm';

const { t } = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t, currentLanguage: 'pt-BR' }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const getById = vi.hoisted(() => vi.fn());
vi.mock('@/services/channels/inboxesService', () => ({ default: { getById } }));

const getAccessibleAgents = vi.hoisted(() => vi.fn());
vi.mock('@/services/agents', () => ({ getAccessibleAgents }));

beforeEach(() => {
  vi.clearAllMocks();
});

// The binding is edited from the agent's Channels tab; the channel only shows it.
describe('AgentBotConfigurationForm (read-only)', () => {
  it('shows who answers the channel and leads to that agent’s Channels tab', async () => {
    getById.mockResolvedValue({
      data: { id: 'inbox-1', agent_bot: { id: 'bot-1', name: 'Vendas', status: 'active' } },
    });
    getAccessibleAgents.mockResolvedValue({
      data: [
        { id: 'agent-other', name: 'Vendas', evolution_bot_id: 'bot-9' },
        { id: 'agent-1', name: 'Vendas', evolution_bot_id: 'bot-1' },
      ],
    });
    render(<AgentBotConfigurationForm inboxId="inbox-1" />);

    expect(await screen.findByText('Vendas')).toBeInTheDocument();
    expect(screen.getByText('settings.agentBotConfiguration.status.active')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();

    await userEvent.click(
      await screen.findByRole('button', { name: /settings\.agentBotConfiguration\.readOnly\.openAgent$/ }),
    );
    expect(navigate).toHaveBeenCalledWith('/agents/agent-1/edit?tab=channels');
  });

  it('flags an inactive binding', async () => {
    getById.mockResolvedValue({
      data: { id: 'inbox-1', agent_bot: { id: 'bot-1', name: 'Vendas', status: 'inactive' } },
    });
    getAccessibleAgents.mockResolvedValue({ data: [] });
    render(<AgentBotConfigurationForm inboxId="inbox-1" />);

    expect(
      await screen.findByText('settings.agentBotConfiguration.status.inactive'),
    ).toBeInTheDocument();
    expect(screen.getByText('settings.agentBotConfiguration.readOnly.inactiveNote')).toBeInTheDocument();
  });

  it('offers a shortcut to link an agent when nobody answers the channel', async () => {
    getById.mockResolvedValue({ data: { id: 'inbox-1', agent_bot: null } });
    render(<AgentBotConfigurationForm inboxId="inbox-1" />);

    expect(await screen.findByText('settings.agentBotConfiguration.readOnly.noAgent')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /settings\.agentBotConfiguration\.readOnly\.linkAgent/ }),
    );
    expect(navigate).toHaveBeenCalledWith('/agents/list');
    expect(getAccessibleAgents).not.toHaveBeenCalled();
  });
});
