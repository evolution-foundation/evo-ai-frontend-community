import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock dependencies before importing the component
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/chat/messages/MessageBubble', () => ({
  default: ({ message }: { message: { id: string } }) => <div data-testid={`bubble-${message.id}`} />,
}));

vi.mock('@/components/chat/messages/SystemMessage', () => ({
  default: ({ message }: { message: { id: string } }) => <div data-testid={`system-${message.id}`} />,
}));

vi.mock('@/components/chat/messages/PostPreview', () => ({
  default: () => <div data-testid="post-preview" />,
}));

import MessageList from './MessageList';
import { Message, MESSAGE_TYPE } from '@/types/chat/api';

const NEW_MESSAGE_KEY = 'messages.messageList.newMessage';
const BASE_TS = 1_700_000_000;

let idCounter = 0;
const makeMessage = (overrides: Partial<Message> = {}): Message => {
  idCounter += 1;
  return {
    id: `msg-${idCounter}`,
    content: `content ${idCounter}`,
    content_attributes: {},
    content_type: 'text',
    conversation_id: 'conv-1',
    created_at: BASE_TS + idCounter,
    external_source_ids: {},
    message_type: MESSAGE_TYPE.INCOMING,
    private: false,
    sender: { id: 'contact-1', name: 'Contact', type: 'contact' },
    source_id: null,
    status: 'delivered',
    attachments: [],
    ...overrides,
  } as Message;
};

const ownPendingMessage = () =>
  makeMessage({
    message_type: MESSAGE_TYPE.OUTGOING,
    status: 'progress',
    sender: { id: 'agent-1', name: 'Agent', type: 'user' },
  });

const renderList = (messages: Message[]) => {
  const props = {
    hasMoreMessages: true,
    isLoadingMore: false,
    isInitialLoading: false,
    onLoadMore: vi.fn(),
    onRetryMessage: vi.fn(),
    onReplyToMessage: vi.fn(),
    onCopyMessage: vi.fn(),
    onDeleteMessage: vi.fn(async () => {}),
  };
  const view = render(<MessageList {...props} messages={messages} />);
  const scroller = view.container.querySelector('.overflow-y-scroll') as HTMLDivElement;
  // jsdom has no layout: pin the scroll metrics the component reads.
  Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });
  scroller.scrollTo = vi.fn((options: ScrollToOptions) => {
    scroller.scrollTop = options.top ?? 0;
  }) as unknown as typeof scroller.scrollTo;
  const setMessages = (next: Message[]) => view.rerender(<MessageList {...props} messages={next} />);
  return { scroller, setMessages };
};

// Sets scrollTop and fires the handler so isNearBottomRef tracks the position.
const scrollTo = (scroller: HTMLElement, top: number) => {
  scroller.scrollTop = top;
  fireEvent.scroll(scroller);
};

describe('MessageList auto-scroll (CRM-165)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls to the end when a message arrives with the view near the bottom', () => {
    const initial = [makeMessage(), makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 950); // 1000 - 950 - 400 < 100 → near bottom

    setMessages([...initial, makeMessage()]);

    expect(scroller.scrollTop).toBe(600); // scrollHeight - clientHeight
    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });

  it('does not scroll while reading history — raises the new-message indicator instead', () => {
    const initial = [makeMessage(), makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150); // far from the bottom

    setMessages([...initial, makeMessage()]);

    expect(scroller.scrollTop).toBe(150);
    expect(screen.getByText(NEW_MESSAGE_KEY)).toBeTruthy();
  });

  it('treats a bot outgoing reply as an arrival: never hijacks history reading', () => {
    const initial = [makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150);

    setMessages([
      ...initial,
      makeMessage({
        message_type: MESSAGE_TYPE.OUTGOING,
        status: 'sent',
        sender: { id: 'bot-1', name: 'Bot', type: 'agent_bot' },
      }),
    ]);

    expect(scroller.scrollTop).toBe(150);
    expect(screen.getByText(NEW_MESSAGE_KEY)).toBeTruthy();
  });

  it('always scrolls for the user own in-flight send, even from history', () => {
    const initial = [makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150);

    setMessages([...initial, ownPendingMessage()]);

    expect(scroller.scrollTop).toBe(600);
    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });

  it('detects an incoming message that lands before an in-flight send tail', () => {
    const first = makeMessage();
    const pending = ownPendingMessage();
    const { scroller, setMessages } = renderList([first, pending]);
    scrollTo(scroller, 950); // near bottom

    // The store sorts status 'progress' last: the new incoming lands BEFORE the tail.
    setMessages([first, makeMessage(), pending]);

    expect(scroller.scrollTop).toBe(600);
  });

  it('does not raise the indicator for system events', () => {
    const initial = [makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150);

    setMessages([...initial, makeMessage({ message_type: MESSAGE_TYPE.ACTIVITY })]);

    expect(scroller.scrollTop).toBe(150);
    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });

  it('does not treat a deletion of the newest message as an arrival', () => {
    const older = makeMessage();
    const newest = makeMessage();
    const { scroller, setMessages } = renderList([older, newest]);
    scrollTo(scroller, 150);

    setMessages([older]);

    expect(scroller.scrollTop).toBe(150);
    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });

  it('clears the indicator and scrolls to the end when the badge is clicked', () => {
    const initial = [makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150);
    setMessages([...initial, makeMessage()]);

    fireEvent.click(screen.getByText(NEW_MESSAGE_KEY));

    expect(scroller.scrollTop).toBe(1000); // scrollTo({ top: scrollHeight })
    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });

  it('exposes the badge as a keyboard-actionable button', () => {
    const initial = [makeMessage()];
    const { scroller, setMessages } = renderList(initial);
    scrollTo(scroller, 150);
    setMessages([...initial, makeMessage()]);

    const badge = screen.getByText(NEW_MESSAGE_KEY);
    expect(badge.getAttribute('role')).toBe('button');
    expect(badge.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(badge, { key: 'Enter' });

    expect(screen.queryByText(NEW_MESSAGE_KEY)).toBeNull();
  });
});
