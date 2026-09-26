import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Inbox } from '@/types/channels/inbox';
import ChatArea from './ChatArea';

let mockInboxes: Inbox[] = [];
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({
    inboxes: mockInboxes,
    fetchInboxes: vi.fn().mockResolvedValue(undefined),
    isLoadingInboxes: false,
  }),
}));

const mockMessagesContext = {
  onReplyToMessage: vi.fn(),
  onCopyMessage: vi.fn(),
  onDeleteMessage: vi.fn(),
  onCancelReply: vi.fn(),
  isMessagesLoading: () => false,
  getMessagesError: () => null,
  loadMessages: vi.fn(),
  canLoadMore: () => false,
  isLoadingMore: () => false,
  state: { replyToMessage: null },
};
const mockWebsocketContext = {
  sendTypingOn: vi.fn(),
  sendTypingOff: vi.fn(),
  getTypingUsers: () => [],
};
vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({ messages: mockMessagesContext, websocket: mockWebsocketContext }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@/hooks/chat/useConversationModerations', () => ({
  useConversationModerations: () => ({
    pendingResponseModerations: [],
    loadModerations: vi.fn(),
    messageModerationsMap: {},
  }),
}));

// Real content isn't under test here — stub every message-area subcomponent so
// the archived-inbox banner/composer wiring is what the assertions exercise.
vi.mock('../messages/MessageList', () => ({ default: () => <div data-testid="message-list" /> }));
vi.mock('../loading-states', () => ({ MessageSkeleton: () => null }));
vi.mock('../empty-states', () => ({ NoMessages: () => <div data-testid="no-messages" /> }));
vi.mock('../typing-indicator/TypingIndicator', () => ({ default: () => null }));
vi.mock('../banner/PendingResponseBanner', () => ({ default: () => null }));
vi.mock('../banner', () => ({
  Banner: ({ bannerMessage }: { bannerMessage: string }) => (
    <div data-testid="restriction-banner">{bannerMessage}</div>
  ),
  ConversationNoteBanner: () => null,
}));
vi.mock('../message-input', () => ({
  MessageInput: ({ isDisabled, placeholder }: { isDisabled: boolean; placeholder: string }) => (
    <div data-testid="message-input" data-disabled={isDisabled} data-placeholder={placeholder} />
  ),
}));

const makeInbox = (overrides: Partial<Inbox> = {}): Inbox =>
  ({
    id: 'inbox-1',
    name: 'WhatsApp',
    channel_type: 'Channel::Whatsapp',
    provider: 'evolution',
    ...overrides,
  }) as Inbox;

const makeConversation = (inboxId = 'inbox-1', provider = 'evolution') =>
  ({
    id: 'conv-1',
    inbox_id: inboxId,
    can_reply: true,
    meta: {},
    inbox: { id: inboxId, channel_type: 'Channel::Whatsapp', provider },
  }) as never;

const ARCHIVED_BANNER_TEXT =
  'Este canal foi arquivado. Reative-o ou mova a conversa para outro canal para continuar.';

const baseProps = {
  selectedConversationId: 'conv-1',
  selectedConversation: makeConversation(),
  selectedMessages: [{ id: 'm1' }] as never,
  onSendMessage: vi.fn(),
  onLoadMore: vi.fn(),
  onRetryMessage: vi.fn(),
};

describe('ChatArea archived-inbox read-only banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInboxes = [];
  });

  it('does not show the restriction banner or disable the composer for an active inbox', () => {
    mockInboxes = [makeInbox()];

    render(<ChatArea {...baseProps} />);

    expect(screen.queryByTestId('restriction-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toHaveAttribute('data-disabled', 'false');
  });

  it('shows the archived-channel banner and disables the composer when the inbox is archived', () => {
    mockInboxes = [makeInbox({ archived_at: '2026-01-01T00:00:00Z' })];

    render(<ChatArea {...baseProps} />);

    expect(screen.getByTestId('restriction-banner')).toHaveTextContent(
      ARCHIVED_BANNER_TEXT,
    );
    expect(screen.getByTestId('message-input')).toHaveAttribute('data-disabled', 'true');
    // The composer's placeholder must use its own archived-specific key, not
    // the "24-hour messaging window" one — that text is wrong for an
    // archived channel and would confuse the agent about why they can't type.
    expect(screen.getByTestId('message-input')).toHaveAttribute(
      'data-placeholder',
      'messageInput.archivedPlaceholder',
    );
  });

  // WAHA is self-hosted/session-based like Evolution: it reports its session
  // state through provider_connection, so a disconnected WAHA channel must get
  // the same "connect the number" banner instead of silently accepting sends.
  it('shows the disconnected banner for a WAHA channel whose session is closed', () => {
    mockInboxes = [
      makeInbox({
        provider: 'waha',
        provider_connection: { connection: 'close' },
      } as never),
    ];

    render(
      <ChatArea {...baseProps} selectedConversation={makeConversation('inbox-1', 'waha')} />,
    );

    expect(screen.getByTestId('restriction-banner')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toHaveAttribute('data-disabled', 'true');
  });

  it('takes the archived message over the disconnected one when both apply', () => {
    mockInboxes = [
      makeInbox({
        archived_at: '2026-01-01T00:00:00Z',
        provider_connection: { connection: 'close', error: 'boom' },
      } as never),
    ];

    render(<ChatArea {...baseProps} />);

    expect(screen.getByTestId('restriction-banner')).toHaveTextContent(
      ARCHIVED_BANNER_TEXT,
    );
  });
});
