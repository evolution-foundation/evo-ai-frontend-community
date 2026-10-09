import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentChannelCard from './AgentChannelCard';
import type { AgentBotInboxBinding, Inbox } from '@/types/channels/inbox';
import type { AgentConfig } from '@/types/agents';

// Interpolated values are appended, so the numbers the card shows can be asserted.
const { t } = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${Object.values(options).join(',')}` : key,
}));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t, currentLanguage: 'pt-BR' }),
}));

vi.mock('@/components/channels', () => ({
  ChannelIcon: () => <span data-testid="channel-icon" />,
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: { getFacebookPosts: vi.fn(async () => []) },
}));

const LABEL = { id: 'label-vip', title: 'VIP', color: '#ff0000' };

const bindingFor = (
  inbox: Partial<Inbox>,
  allowedLabelIds: string[] = [],
): AgentBotInboxBinding => ({
  id: 'binding-1',
  agent_bot_id: 'bot-1',
  inbox_id: 'in-1',
  status: 'active',
  configuration: { allowed_conversation_statuses: ['pending'], allowed_label_ids: allowedLabelIds },
  inbox: {
    id: 'in-1',
    channel_id: 'ch-1',
    name: 'canal',
    channel_type: 'Channel::Api',
    ...inbox,
  } as Inbox,
});

const renderCard = (
  binding: AgentBotInboxBinding,
  props: {
    agentConfig?: AgentConfig;
    labelsUnavailable?: boolean;
    labels?: (typeof LABEL)[];
  } = {},
) => {
  const onSaveConfiguration = vi.fn(async () => undefined);
  render(
    <AgentChannelCard
      binding={binding}
      agentBots={[]}
      labels={[LABEL]}
      highlighted={false}
      busy={false}
      canEdit
      onUnlink={vi.fn()}
      onReactivate={vi.fn()}
      onSaveConfiguration={onSaveConfiguration}
      {...props}
    />,
  );
  return { onSaveConfiguration, card: screen.getByTestId('agent-channel-card-in-1') };
};

const openAdvanced = (card: HTMLElement) =>
  userEvent.click(within(card).getByRole('button', { name: /edit\.channels\.advanced\.title/ }));

describe('AgentChannelCard', () => {
  it('names the channel by the name the user gave it, not the stored slug', () => {
    const { card } = renderCard(
      bindingFor({ name: 'whatsapp-vendas', display_name: 'WhatsApp Vendas' }),
    );

    expect(within(card).getByText('WhatsApp Vendas')).toBeInTheDocument();
    expect(within(card).queryByText('whatsapp-vendas')).toBeNull();
  });

  it.each([
    [
      'WhatsApp Cloud',
      {
        channel_type: 'Channel::Whatsapp',
        provider: 'whatsapp_cloud',
        phone_number: '+5511911112222',
      },
      '+5511911112222',
    ],
    [
      'WhatsApp Evolution',
      {
        channel_type: 'Channel::Whatsapp',
        provider: 'evolution',
        phone_number: '+5511933334444',
        provider_config: { instance_name: 'inst-1' },
      },
      '+5511933334444',
    ],
    ['SMS', { channel_type: 'Channel::Sms', phone_number: '+5511955556666' }, '+5511955556666'],
    ['e-mail', { channel_type: 'Channel::Email', email: '[EMAIL_REDACTED]' }, '[EMAIL_REDACTED]'],
  ] as const)('shows the address of a %s channel under its name', (_type, inbox, identifier) => {
    const { card } = renderCard(bindingFor({ display_name: 'Canal', ...inbox }));

    expect(within(card).getByTestId('channel-identifier')).toHaveTextContent(identifier);
  });

  it.each(['Channel::FacebookPage', 'Channel::Instagram', 'Channel::Telegram'])(
    'shows only the name of a %s channel',
    channelType => {
      const { card } = renderCard(bindingFor({ display_name: 'Canal', channel_type: channelType }));

      expect(within(card).getByText('Canal')).toBeInTheDocument();
      expect(within(card).queryByTestId('channel-identifier')).toBeNull();
    },
  );

  // A deleted allowed label still blocks the agent; an empty list would read as "answers everyone".
  it('keeps a deleted allowed label visible and lets it be removed', async () => {
    const { card, onSaveConfiguration } = renderCard(bindingFor({}, [LABEL.id, 'label-gone']));
    await openAdvanced(card);

    const deleted = within(card).getByText(
      'settings.agentBotConfiguration.advanced.labels.deleted',
    );
    expect(within(card).getByText('VIP')).toBeInTheDocument();

    await userEvent.click(within(deleted).getByRole('button'));
    expect(
      within(card).queryByText('settings.agentBotConfiguration.advanced.labels.deleted'),
    ).toBeNull();

    await userEvent.click(
      within(card).getByRole('button', { name: /edit\.channels\.advanced\.save/ }),
    );
    expect(onSaveConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ allowed_label_ids: [LABEL.id] }),
    );
  });

  it('says the labels failed to load instead of calling one deleted or offering none', async () => {
    const { card } = renderCard(bindingFor({}, ['label-unknown']), {
      labelsUnavailable: true,
      labels: [],
    });
    await openAdvanced(card);

    expect(
      within(card).queryByText('settings.agentBotConfiguration.advanced.labels.deleted'),
    ).toBeNull();
    expect(within(card).getByRole('alert')).toHaveTextContent(
      'settings.agentBotConfiguration.advanced.labels.loadFailed',
    );
    expect(
      within(card).queryByText('settings.agentBotConfiguration.advanced.labels.noLabels'),
    ).toBeNull();
  });

  it("shows the Configuration tab's defaults when the agent has no debounce or segmentation size", async () => {
    const { card } = renderCard(bindingFor({}), {
      agentConfig: { enable_text_segmentation: true } as AgentConfig,
    });
    await openAdvanced(card);

    expect(within(card).getByText('edit.channels.agentLevel.seconds:5')).toBeInTheDocument();
    expect(
      within(card).getByText('edit.channels.agentLevel.segmentationOn:300'),
    ).toBeInTheDocument();
  });
});
