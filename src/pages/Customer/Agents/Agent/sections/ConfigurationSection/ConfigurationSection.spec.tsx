import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfigurationSection from './index';
import { Agent } from '@/types/agents';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/agents/configuration/ModelApiPanel', () => ({
  ModelApiPanel: () => <div data-testid="model-api-panel" />,
}));
vi.mock('@/components/agents/configuration/BehaviorPanel', () => ({
  BehaviorPanel: () => <div data-testid="behavior-panel" />,
}));
vi.mock('@/components/agents/configuration/MessageHandlingPanel', () => ({
  MessageHandlingPanel: () => <div data-testid="message-handling-panel" />,
}));
vi.mock('@/components/agents/configuration/InactivityActionsTab', () => ({
  InactivityActionsTab: () => <div data-testid="inactivity-actions" />,
}));
vi.mock('@/components/agents/configuration/TransferRulesModal', () => ({
  TransferRulesModal: () => null,
}));
vi.mock('@/components/agents/configuration/PipelineRulesModal', () => ({
  PipelineRulesModal: () => null,
}));
vi.mock('@/components/agents/configuration/ContactEditModal', () => ({
  default: () => null,
}));

const CARD_TITLES = {
  modelAndApi: 'edit.configuration.sections.modelAndApi.title',
  behavior: 'edit.configuration.sections.behavior.title',
  messageHandling: 'edit.configuration.sections.messageHandling.title',
};

const behaviorSettings = {
  transferToHuman: false,
  useEmojis: false,
  allowReminders: false,
  allowPipelineManipulation: false,
  allowContactEdit: false,
  allowManageLabels: false,
  allowProductSales: false,
  timezone: 'America/Sao_Paulo',
  sendAsReply: false,
};

const llmConfigData = {
  model: 'gpt-4o',
  api_key_id: 'key-1',
  instruction: '',
  output_key: '',
  advanced_config: {
    message_wait_time: 5,
    message_signature: '',
    enable_text_segmentation: false,
    max_characters_per_segment: 300,
    min_segment_size: 50,
    character_delay_ms: 0.05,
  },
};

const renderSection = (agentType: string) =>
  render(
    <ConfigurationSection
      agent={{ id: 'agent-1', type: agentType } as Agent}
      llmConfigData={agentType === 'llm' ? llmConfigData : null}
      a2aConfigData={null}
      externalConfigData={null}
      apiKeys={[]}
      behaviorSettings={behaviorSettings}
      inactivityActions={[]}
      transferRules={[]}
      pipelineRules={[]}
      contactEditConfig={{ enabled: false, editableFields: [], instructions: '' }}
      onLLMConfigChange={vi.fn()}
      onA2AConfigChange={vi.fn()}
      onExternalConfigChange={vi.fn()}
      onBehaviorSettingsChange={vi.fn()}
      onInactivityActionsChange={vi.fn()}
      onTransferRulesChange={vi.fn()}
      onPipelineRulesChange={vi.fn()}
      onContactEditConfigChange={vi.fn()}
      onApiKeysReload={vi.fn()}
    />
  );

describe('ConfigurationSection', () => {
  it('renders exactly the 3 cards, in order, for an llm agent', () => {
    renderSection('llm');
    const headers = screen.getAllByRole('button').map(button => button.textContent);
    expect(headers).toHaveLength(3);
    expect(headers[0]).toContain(CARD_TITLES.modelAndApi);
    expect(headers[1]).toContain(CARD_TITLES.behavior);
    expect(headers[2]).toContain(CARD_TITLES.messageHandling);
  });

  it('starts with every card collapsed', () => {
    renderSection('llm');
    screen.getAllByRole('button').forEach(button => {
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });
    expect(screen.queryByTestId('model-api-panel')).toBeNull();
    expect(screen.queryByTestId('behavior-panel')).toBeNull();
    expect(screen.queryByTestId('message-handling-panel')).toBeNull();
  });

  it('expands a single card without touching the others', async () => {
    renderSection('llm');
    await userEvent.click(screen.getByText(CARD_TITLES.modelAndApi));

    expect(screen.getByTestId('model-api-panel')).toBeTruthy();
    expect(screen.queryByTestId('behavior-panel')).toBeNull();
    expect(screen.queryByTestId('message-handling-panel')).toBeNull();
  });

  it('keeps inactivity actions out of the behavior card', async () => {
    renderSection('llm');
    await userEvent.click(screen.getByText(CARD_TITLES.behavior));

    expect(screen.getByTestId('behavior-panel')).toBeTruthy();
    expect(screen.queryByTestId('inactivity-actions')).toBeNull();
  });

  it('serves inactivity actions from its own secondary tab', async () => {
    renderSection('llm');
    expect(screen.queryByTestId('inactivity-actions')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: /inactivityActions/ }));

    expect(screen.getByTestId('inactivity-actions')).toBeTruthy();
    // Switching tabs must not drag the cards along.
    expect(screen.queryByText(CARD_TITLES.modelAndApi)).toBeNull();
  });

  // Only LLM agents have inactivity actions, so the other types get no secondary bar.
  it('omits the secondary tab bar for agent types without inactivity actions', () => {
    renderSection('task');
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('hides the model and behavior cards for agent types that do not support them', () => {
    renderSection('task');
    const headers = screen.getAllByRole('button').map(button => button.textContent);
    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain(CARD_TITLES.messageHandling);
  });
});
