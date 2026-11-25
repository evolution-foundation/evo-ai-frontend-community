import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatArea from './ChatArea';
import type { Conversation, Message } from '@/types/chat/api';

const react = vi.hoisted(() => vi.fn());
const apply = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ can: vi.fn() }));
const messagesApi = vi.hoisted(() => ({ setMyReaction: vi.fn(), canLoadMore: () => false, isLoadingMore: () => false, isMessagesLoading: () => false, getMessagesError: () => null, state: { replyToMessage: null } }));
vi.mock('@/hooks/chat/useMessageReaction', () => ({ useMessageReaction: (fn: unknown) => { apply(fn); return react; } }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: perms.can }) }));
vi.mock('@/contexts/chat/ChatContext', () => ({ useChatContext: () => ({ messages: messagesApi, websocket: { sendTypingOn: vi.fn(), sendTypingOff: vi.fn(), getTypingUsers: () => [] }, typing: { getTypingUsers: () => [] }, filters: { state: {} }, conversations: {} }) }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/chat/useConversationModerations', () => ({ useConversationModerations: () => ({ pendingResponseModerations: [], loadModerations: vi.fn(), messageModerationsMap: new Map() }) }));
vi.mock('@/store/appDataStore', () => ({ useAppDataStore: () => ({ inboxes: [], fetchInboxes: vi.fn(), isLoadingInboxes: false }) }));
vi.mock('../message-input', () => ({ MessageInput: () => null }));
vi.mock('../typing-indicator/TypingIndicator', () => ({ default: () => null }));
vi.mock('../banner', () => ({ Banner: () => null, ConversationNoteBanner: () => null }));
vi.mock('../banner/PendingResponseBanner', () => ({ default: () => null }));
vi.mock('../messages/ForwardDialog', () => ({ default: ({ conversationId, message }: { conversationId: string; message: Message }) => <div role="dialog">{conversationId}:{message.id}</div> }));
vi.mock('../messages/MessageList', () => ({
  default: ({ messages, onReactToMessage, onForwardMessage }: { messages: Message[]; onReactToMessage?: (m: Message, emoji: string) => void; onForwardMessage?: (m: Message) => void }) =>
    onReactToMessage ? <><button type="button" onClick={() => onReactToMessage(messages[0], '👍')}>reagir</button>{onForwardMessage && <button type="button" onClick={() => onForwardMessage(messages[0])}>encaminhar</button>}</> : <p>sem reação</p>,
}));

const message = { id: 'm1' } as Message;
const area = (provider: string) => (
  <ChatArea
    selectedConversationId="c1"
    selectedConversation={{ id: 'c1', can_reply: true, inbox: { channel_type: 'Channel::Whatsapp', provider } } as unknown as Conversation}
    selectedMessages={[message]}
    onSendMessage={vi.fn()}
    onLoadMore={vi.fn()}
    onRetryMessage={vi.fn()}
  />
);

describe('ChatArea reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    perms.can.mockReturnValue(true);
  });

  it('sends reactions for the selected conversation and updates the message store', () => {
    render(area('evolution'));
    fireEvent.click(screen.getByRole('button', { name: 'reagir' }));
    expect(react).toHaveBeenCalledWith('c1', message, '👍');
    apply.mock.calls[0][0]('c1', 'm1', null);
    expect(messagesApi.setMyReaction).toHaveBeenCalledWith('c1', 'm1', null);
  });

  it('hides reacting on unsupported providers and without permission', () => {
    const { unmount } = render(area('zapi'));
    expect(screen.getByText('sem reação')).toBeInTheDocument();
    unmount();
    perms.can.mockReturnValue(false);
    render(area('evolution'));
    expect(screen.getByText('sem reação')).toBeInTheDocument();
  });

  it('opens the forward picker for that message, only where it is supported', () => {
    const { unmount } = render(area('evolution'));
    fireEvent.click(screen.getByRole('button', { name: 'encaminhar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('c1:m1');
    unmount();
    render(area('zapi'));
    expect(screen.queryByRole('button', { name: 'encaminhar' })).toBeNull();
  });
});
