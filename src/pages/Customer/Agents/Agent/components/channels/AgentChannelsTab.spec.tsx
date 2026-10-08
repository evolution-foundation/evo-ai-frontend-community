import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentChannelsTab from './AgentChannelsTab';
import type { Agent } from '@/types/agents';
import type { AgentBotInboxBinding, Inbox } from '@/types/channels/inbox';

const { t } = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t, currentLanguage: 'pt-BR' }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('sonner', () => ({ toast }));

const permissions = vi.hoisted(() => ({ canUpdate: true }));
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) =>
      resource === 'inboxes' && action === 'update' ? permissions.canUpdate : true,
    isReady: true,
  }),
}));

vi.mock('@/components/channels', () => ({
  ChannelIcon: () => <span data-testid="channel-icon" />,
}));

const service = vi.hoisted(() => ({
  listBotInboxes: vi.fn(),
  getAll: vi.fn(),
  linkInboxBot: vi.fn(),
  updateInboxBinding: vi.fn(),
}));
vi.mock('@/services/channels/agentBotsService', () => ({ default: service }));

const inboxesList = vi.hoisted(() => vi.fn());
const inboxGetById = vi.hoisted(() => vi.fn());
vi.mock('@/services/channels/inboxesService', () => ({
  default: { list: inboxesList, getById: inboxGetById, getFacebookPosts: vi.fn(async () => []) },
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn(async () => ({ data: [] })) },
}));

const BOT_ID = 'bot-1';
const agent = {
  id: 'agent-1',
  name: 'Vendas',
  type: 'llm',
  client_id: 'c',
  created_at: '2026-10-01T00:00:00Z',
  evolution_bot_id: BOT_ID,
  config: { message_wait_time: 5 },
} as Agent;

const inbox = (id: string, name: string, extra: Partial<Inbox> = {}): Inbox =>
  ({ id, name, channel_id: `ch-${id}`, channel_type: 'Channel::Api', ...extra }) as Inbox;

const binding = (
  inboxId: string,
  name: string,
  status: 'active' | 'inactive',
): AgentBotInboxBinding => ({
  id: `binding-${inboxId}`,
  agent_bot_id: BOT_ID,
  inbox_id: inboxId,
  status,
  configuration: { allowed_conversation_statuses: ['pending'], allowed_label_ids: [] },
  inbox: inbox(inboxId, name),
});

const renderTab = async () => {
  render(<AgentChannelsTab agent={agent} />);
  await screen.findByText('edit.channels.actions.link');
};

const card = (inboxId: string) => screen.getByTestId(`agent-channel-card-${inboxId}`);

const openModal = async () => {
  await userEvent.click(screen.getByRole('button', { name: /edit\.channels\.actions\.link/ }));
  return screen.findByRole('dialog');
};

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  service.getAll.mockResolvedValue([]);
  permissions.canUpdate = true;
  service.linkInboxBot.mockResolvedValue(undefined);
  service.listBotInboxes.mockResolvedValue([
    binding('in-active', 'WhatsApp Vendas', 'active'),
    binding('in-paused', 'Site', 'inactive'),
  ]);
  inboxesList.mockResolvedValue({ data: [] });
  // By default the channel is still as the modal listed it.
  inboxGetById.mockImplementation(async (id: string) => {
    const listed = (await inboxesList()).data as Inbox[];
    return { data: listed.find(item => item.id === id) ?? inbox(id, id) };
  });
});

describe('AgentChannelsTab', () => {
  it("lists the agent's bindings, active and inactive, with the right badge", async () => {
    await renderTab();

    expect(service.listBotInboxes).toHaveBeenCalledWith(BOT_ID);
    const active = await screen.findByTestId('agent-channel-card-in-active');
    expect(within(active).getByText('WhatsApp Vendas')).toBeInTheDocument();
    expect(within(active).getByText('edit.channels.status.active')).toBeInTheDocument();
    expect(within(active).getByRole('button', { name: /edit\.channels\.actions\.unlink/ })).toBeInTheDocument();

    const paused = card('in-paused');
    expect(within(paused).getByText('edit.channels.status.inactive')).toBeInTheDocument();
    expect(within(paused).getByRole('button', { name: /edit\.channels\.actions\.reactivate/ })).toBeInTheDocument();
  });

  it('links a free channel: the modal closes, a toast shows and the new card is highlighted', async () => {
    const free = inbox('in-free', 'Instagram');
    inboxesList.mockResolvedValue({ data: [free, inbox('in-active', 'WhatsApp Vendas')] });
    await renderTab();

    const dialog = await openModal();
    // Channels already bound to this agent are not offered again.
    await within(dialog).findByText('Instagram');
    expect(within(dialog).queryByText('WhatsApp Vendas')).toBeNull();

    service.listBotInboxes.mockResolvedValue([
      binding('in-active', 'WhatsApp Vendas', 'active'),
      binding('in-paused', 'Site', 'inactive'),
      binding('in-free', 'Instagram', 'active'),
    ]);
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(service.linkInboxBot).toHaveBeenCalledWith('in-free', BOT_ID, null);
    expect(toast.success).toHaveBeenCalledWith('edit.channels.success.linked');
    const linked = await screen.findByTestId('agent-channel-card-in-free');
    expect(linked).toHaveAttribute('data-highlighted', 'true');
    expect(card('in-active')).not.toHaveAttribute('data-highlighted');
  });

  it('asks before transferring a channel served by another agent, and transfers on confirm', async () => {
    const taken = inbox('in-taken', 'Telegram', {
      agent_bot: { id: 'bot-2', name: 'Suporte', status: 'active' },
    });
    inboxesList.mockResolvedValue({ data: [taken] });
    await renderTab();

    const dialog = await openModal();
    expect(await within(dialog).findByText('edit.channels.linkModal.servedBy')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('edit.channels.transfer.description')).toBeInTheDocument();
    expect(service.linkInboxBot).not.toHaveBeenCalled();

    await userEvent.click(within(confirm).getByRole('button', { name: /edit\.channels\.transfer\.confirm/ }));
    await waitFor(() => expect(service.linkInboxBot).toHaveBeenCalledWith('in-taken', BOT_ID, 'bot-2'));
  });

  it('changes nothing when the transfer is cancelled', async () => {
    const taken = inbox('in-taken', 'Telegram', {
      agent_bot: { id: 'bot-2', name: 'Suporte', status: 'active' },
    });
    inboxesList.mockResolvedValue({ data: [taken] });
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Telegram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));
    const confirm = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirm).getByRole('button', { name: /edit\.channels\.transfer\.cancel/ }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(service.linkInboxBot).not.toHaveBeenCalled();
    expect(service.updateInboxBinding).not.toHaveBeenCalled();
    // The link modal stays open on the same list.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('unlinks by deactivating and reactivates the same binding', async () => {
    service.updateInboxBinding
      .mockResolvedValueOnce({ ...binding('in-active', 'WhatsApp Vendas', 'inactive') })
      .mockResolvedValueOnce({ ...binding('in-active', 'WhatsApp Vendas', 'active') });
    await renderTab();
    const target = await screen.findByTestId('agent-channel-card-in-active');

    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.actions\.unlink/ }));
    expect(service.updateInboxBinding).toHaveBeenCalledWith('in-active', BOT_ID, { status: 'inactive' });
    expect(await within(target).findByText('edit.channels.status.inactive')).toBeInTheDocument();
    expect(service.linkInboxBot).not.toHaveBeenCalled();

    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.actions\.reactivate/ }));
    expect(service.updateInboxBinding).toHaveBeenLastCalledWith('in-active', BOT_ID, { status: 'active' });
    expect(await within(target).findByText('edit.channels.status.active')).toBeInTheDocument();
  });

  it('saves the advanced settings of a card to its binding', async () => {
    service.updateInboxBinding.mockImplementation(async (_inboxId, _botId, { configuration }) => ({
      ...binding('in-active', 'WhatsApp Vendas', 'active'),
      configuration,
    }));
    await renderTab();
    const target = await screen.findByTestId('agent-channel-card-in-active');

    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.advanced\.title/ }));
    // The default (pending only) is visible before anything is touched.
    const pending = within(target).getByRole('checkbox', {
      name: /settings\.agentBotConfiguration\.statusOptions\.pending/,
    });
    expect(pending).toBeChecked();

    await userEvent.click(
      within(target).getByRole('checkbox', { name: /settings\.agentBotConfiguration\.statusOptions\.open/ }),
    );
    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.advanced\.save/ }));

    await waitFor(() =>
      expect(service.updateInboxBinding).toHaveBeenCalledWith('in-active', BOT_ID, {
        configuration: expect.objectContaining({ allowed_conversation_statuses: ['pending', 'open'] }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('edit.channels.success.saved');
  });

  // The modal list is a snapshot: a channel taken after it opened still asks first.
  it('asks before linking a channel that was free when the modal opened but is taken now', async () => {
    inboxesList.mockResolvedValue({ data: [inbox('in-free', 'Instagram')] });
    inboxGetById.mockResolvedValue({
      data: inbox('in-free', 'Instagram', { agent_bot: { id: 'bot-2', name: 'Suporte', status: 'active' } }),
    });
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Instagram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(service.linkInboxBot).not.toHaveBeenCalled();
  });

  it('refreshes the list instead of editing when the channel moved to another agent', async () => {
    const conflict = Object.assign(new Error('conflict'), {
      isAxiosError: true,
      response: { status: 409 },
    });
    service.updateInboxBinding.mockRejectedValueOnce(conflict);
    await renderTab();
    const target = await screen.findByTestId('agent-channel-card-in-active');

    service.listBotInboxes.mockResolvedValue([binding('in-paused', 'Site', 'inactive')]);
    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.actions\.unlink/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('edit.channels.errors.moved'));
    await waitFor(() => expect(screen.queryByTestId('agent-channel-card-in-active')).toBeNull());
  });

  it('says the load failed instead of showing an empty list', async () => {
    service.listBotInboxes.mockRejectedValue(new Error('403'));
    render(<AgentChannelsTab agent={agent} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('edit.channels.errors.load');
    expect(screen.queryByText('edit.channels.empty.title')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit\.channels\.actions\.link/ })).toBeNull();
  });

  it('shows the empty state with "connect new channel" when no channel is available', async () => {
    inboxesList.mockResolvedValue({ data: [inbox('in-active', 'WhatsApp Vendas')] });
    await renderTab();

    const dialog = await openModal();
    expect(await within(dialog).findByText('edit.channels.linkModal.emptyTitle')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.connectNew/ }));
    expect(navigate).toHaveBeenCalledWith('/channels/new');
  });

  it('links nothing when the channel cannot be checked again', async () => {
    inboxesList.mockResolvedValue({ data: [inbox('in-free', 'Instagram')] });
    inboxGetById.mockRejectedValue(new Error('network'));
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Instagram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('edit.channels.errors.refreshChannel'));
    expect(service.linkInboxBot).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('confirms against the agent the channel has now, not the one listed', async () => {
    inboxesList.mockResolvedValue({
      data: [inbox('in-taken', 'Telegram', { agent_bot: { id: 'bot-2', name: 'Suporte', status: 'active' } })],
    });
    inboxGetById.mockResolvedValue({
      data: inbox('in-taken', 'Telegram', { agent_bot: { id: 'bot-3', name: 'Pós-venda', status: 'active' } }),
    });
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Telegram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));
    const confirm = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirm).getByRole('button', { name: /edit\.channels\.transfer\.confirm/ }));

    await waitFor(() => expect(service.linkInboxBot).toHaveBeenCalledWith('in-taken', BOT_ID, 'bot-3'));
  });

  it('says an inactive link gets replaced instead of claiming the channel is served', async () => {
    inboxesList.mockResolvedValue({
      data: [inbox('in-idle', 'Telegram', { agent_bot: { id: 'bot-2', name: 'Suporte', status: 'inactive' } })],
    });
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Telegram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('edit.channels.transfer.descriptionInactive')).toBeInTheDocument();
    expect(within(confirm).queryByText('edit.channels.transfer.description')).toBeNull();
  });

  it('keeps the modal open and refreshes it when the channel changed hands at the last moment', async () => {
    const conflict = Object.assign(new Error('conflict'), { isAxiosError: true, response: { status: 409 } });
    service.linkInboxBot.mockRejectedValueOnce(conflict);
    inboxesList.mockResolvedValue({ data: [inbox('in-free', 'Instagram')] });
    await renderTab();

    const dialog = await openModal();
    await within(dialog).findByText('Instagram');
    const listCalls = inboxesList.mock.calls.length;
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('edit.channels.errors.channelChanged'));
    expect(inboxesList.mock.calls.length).toBeGreaterThan(listCalls);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps an unsaved edit in a card when the list reloads', async () => {
    inboxesList.mockResolvedValue({ data: [inbox('in-free', 'Instagram')] });
    await renderTab();
    const target = await screen.findByTestId('agent-channel-card-in-active');
    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.advanced\.title/ }));
    const open = () =>
      within(card('in-active')).getByRole('checkbox', {
        name: /settings\.agentBotConfiguration\.statusOptions\.open/,
      });
    await userEvent.click(open());
    expect(open()).toBeChecked();

    // Linking another channel reloads every binding as new objects, same content.
    service.listBotInboxes.mockResolvedValue([
      binding('in-active', 'WhatsApp Vendas', 'active'),
      binding('in-paused', 'Site', 'inactive'),
      binding('in-free', 'Instagram', 'active'),
    ]);
    const dialog = await openModal();
    await within(dialog).findByText('Instagram');
    await userEvent.click(within(dialog).getByRole('button', { name: /edit\.channels\.linkModal\.link/ }));
    await screen.findByTestId('agent-channel-card-in-free');

    expect(open()).toBeChecked();
  });

  it('is read-only without inboxes.update', async () => {
    permissions.canUpdate = false;
    render(<AgentChannelsTab agent={agent} />);
    const target = await screen.findByTestId('agent-channel-card-in-active');

    expect(screen.queryByRole('button', { name: /edit\.channels\.actions\.link/ })).toBeNull();
    expect(within(target).queryByRole('button', { name: /edit\.channels\.actions\.unlink/ })).toBeNull();
    expect(
      within(card('in-paused')).queryByRole('button', { name: /edit\.channels\.actions\.reactivate/ }),
    ).toBeNull();

    await userEvent.click(within(target).getByRole('button', { name: /edit\.channels\.advanced\.title/ }));
    expect(
      within(target).getByRole('checkbox', { name: /settings\.agentBotConfiguration\.statusOptions\.open/ }),
    ).toBeDisabled();
    expect(within(target).queryByRole('button', { name: /edit\.channels\.advanced\.save/ })).toBeNull();
  });
});
