import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentBotConfigurationForm from './AgentBotConfigurationForm';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/channels/agentBotsService', () => ({
  default: {
    getAll: vi.fn(),
    getInboxAgentBot: vi.fn(),
    getInboxAgentBotConfiguration: vi.fn(),
    setInboxAgentBot: vi.fn(),
    disconnectInboxBot: vi.fn(),
  },
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: {
    getLabels: vi.fn(),
  },
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: {
    getById: vi.fn(),
    getFacebookPosts: vi.fn(),
  },
}));

import AgentBotsService from '@/services/channels/agentBotsService';
import { labelsService } from '@/services/contacts/labelsService';
import InboxesService from '@/services/channels/inboxesService';

const bot = { id: 'bot-1', name: 'Bot One', description: '', outgoing_url: '' };
const savedConfiguration = {
  allowed_conversation_statuses: ['pending'],
  allowed_label_ids: ['lbl-1'],
  ignored_label_ids: ['lbl-2'],
};

describe('AgentBotConfigurationForm', () => {
  const defaultProps = { inboxId: 'inbox-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InboxesService.getById).mockResolvedValue({
      data: { channel_type: 'Channel::WebWidget' },
    } as never);
    vi.mocked(AgentBotsService.getAll).mockResolvedValue([bot] as never);
    vi.mocked(AgentBotsService.getInboxAgentBot).mockResolvedValue(null as never);
    vi.mocked(AgentBotsService.getInboxAgentBotConfiguration).mockResolvedValue(null as never);
    vi.mocked(AgentBotsService.setInboxAgentBot).mockResolvedValue(undefined as never);
    vi.mocked(labelsService.getLabels).mockResolvedValue({
      data: [
        { id: 'lbl-1', title: 'VIP', color: '#111111' },
        { id: 'lbl-2', title: 'Spam', color: '#222222' },
      ],
    } as never);
  });

  // The save is driven by the ChannelSettings sticky footer through the
  // registerSave registry, mirroring the other snapshot tabs.
  const lastHandle = (mock: ReturnType<typeof vi.fn>) => {
    const handles = mock.mock.calls
      .map(call => call[0])
      .filter(arg => arg && typeof arg === 'object');
    return handles[handles.length - 1];
  };

  it('registers a non-savable handle when no bot is selected, even after loading', async () => {
    const registerSave = vi.fn();
    render(<AgentBotConfigurationForm {...defaultProps} registerSave={registerSave} />);

    // Let the initial load settle so the assertion covers the post-load state,
    // not just the synchronous mount registration.
    await waitFor(() => expect(labelsService.getLabels).toHaveBeenCalled());
    await act(async () => {});

    const handle = lastHandle(registerSave);
    expect(handle).toBeTruthy();
    expect(handle.canSave).toBe(false);
    expect(typeof handle.save).toBe('function');
  });

  it('registers a savable handle once a bot is connected and data is loaded', async () => {
    vi.mocked(AgentBotsService.getInboxAgentBot).mockResolvedValue(bot as never);
    const registerSave = vi.fn();
    render(<AgentBotConfigurationForm {...defaultProps} registerSave={registerSave} />);

    await waitFor(() => expect(lastHandle(registerSave)?.canSave).toBe(true));
  });

  it('save() sends the full configuration including label scoping', async () => {
    vi.mocked(AgentBotsService.getInboxAgentBot).mockResolvedValue(bot as never);
    vi.mocked(AgentBotsService.getInboxAgentBotConfiguration).mockResolvedValue(
      savedConfiguration as never,
    );
    const registerSave = vi.fn();
    render(<AgentBotConfigurationForm {...defaultProps} registerSave={registerSave} />);

    await waitFor(() => expect(lastHandle(registerSave)?.canSave).toBe(true));
    await act(() => lastHandle(registerSave).save());

    expect(AgentBotsService.setInboxAgentBot).toHaveBeenCalledWith(
      'inbox-1',
      'bot-1',
      expect.objectContaining({
        allowed_label_ids: ['lbl-1'],
        ignored_label_ids: ['lbl-2'],
        allowed_conversation_statuses: ['pending'],
      }),
    );
  });

  it('blocks the footer save while the bot is being disconnected', async () => {
    vi.mocked(AgentBotsService.getInboxAgentBot).mockResolvedValue(bot as never);
    let releaseDisconnect = () => {};
    vi.mocked(AgentBotsService.disconnectInboxBot).mockReturnValue(
      new Promise<boolean>(resolve => {
        releaseDisconnect = () => resolve(true);
      }) as never,
    );
    const registerSave = vi.fn();
    render(<AgentBotConfigurationForm {...defaultProps} registerSave={registerSave} />);

    await waitFor(() => expect(lastHandle(registerSave)?.canSave).toBe(true));
    fireEvent.click(
      screen.getByRole('button', {
        name: /settings\.agentBotConfiguration\.buttons\.disconnect$/,
      }),
    );

    // setInboxAgentBot and disconnectInboxBot write the same agent_bot_inbox
    // row, so the footer must stay locked until the disconnect settles.
    await waitFor(() => expect(lastHandle(registerSave)?.canSave).toBe(false));

    await act(async () => {
      releaseDisconnect();
    });
    expect(AgentBotsService.setInboxAgentBot).not.toHaveBeenCalled();
  });

  it('unregisters the handle on unmount', async () => {
    const registerSave = vi.fn();
    const { unmount } = render(
      <AgentBotConfigurationForm {...defaultProps} registerSave={registerSave} />,
    );
    await waitFor(() => expect(lastHandle(registerSave)).toBeTruthy());

    unmount();
    expect(registerSave).toHaveBeenLastCalledWith(null);
  });
});
