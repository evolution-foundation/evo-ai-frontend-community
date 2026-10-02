import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageList, { type MessageItem } from './MessageList';

// Mock useLanguage
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '1 min ago',
}));
vi.mock('date-fns/locale', () => ({
  ptBR: {},
  pt: {},
  enUS: {},
  es: {},
  fr: {},
  it: {},
}));

// Mock shared attachment components
vi.mock('@/components/shared/attachments', () => ({
  SharedImageBubble: () => <div data-testid="image-bubble" />,
  SharedAudioBubble: () => <div data-testid="audio-bubble" />,
  SharedVideoBubble: () => <div data-testid="video-bubble" />,
  SharedFileBubble: () => <div data-testid="file-bubble" />,
  getAttachmentType: () => 'file',
}));

// Mock ReplyToMessage
vi.mock('./ReplyToMessage', () => ({
  ReplyToMessage: () => <div data-testid="reply-to" />,
}));

// Mock EmailCollectInput
const MockEmailCollectInput = vi.fn(({ alreadySubmitted }: { alreadySubmitted?: boolean }) => (
  <div data-testid="email-collect" data-already-submitted={String(!!alreadySubmitted)} />
));
vi.mock('./EmailCollectInput', () => ({
  EmailCollectInput: (props: Record<string, unknown>) => MockEmailCollectInput(props),
}));

describe('MessageList', () => {
  const baseMessage: MessageItem = {
    id: 'msg-1',
    type: 'in',
    text: 'Hello world',
    ts: Date.now(),
    status: 'sent',
  };

  it('renders text messages', () => {
    render(<MessageList items={[baseMessage]} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders EmailCollectInput for input_email content type', () => {
    const emailCollectMsg: MessageItem = {
      ...baseMessage,
      id: 'email-1',
      contentType: 'input_email',
      text: 'Please provide your email',
    };

    render(<MessageList items={[emailCollectMsg]} />);
    expect(screen.getByTestId('email-collect')).toBeTruthy();
    expect(screen.getByText('Please provide your email')).toBeTruthy();
  });

  it('passes alreadySubmitted=true when submittedEmail is present', () => {
    const emailCollectMsg: MessageItem = {
      ...baseMessage,
      id: 'email-2',
      contentType: 'input_email',
      submittedEmail: 'user@example.com',
    };

    render(<MessageList items={[emailCollectMsg]} />);
    const el = screen.getByTestId('email-collect');
    expect(el.getAttribute('data-already-submitted')).toBe('true');
  });

  it('passes alreadySubmitted=false when no submittedEmail', () => {
    const emailCollectMsg: MessageItem = {
      ...baseMessage,
      id: 'email-3',
      contentType: 'input_email',
    };

    render(<MessageList items={[emailCollectMsg]} />);
    const el = screen.getByTestId('email-collect');
    expect(el.getAttribute('data-already-submitted')).toBe('false');
  });

  it('renders outgoing messages on the right', () => {
    const outMsg: MessageItem = {
      ...baseMessage,
      id: 'out-1',
      type: 'out',
      text: 'My reply',
    };

    const { container } = render(<MessageList items={[outMsg]} />);
    const wrapper = container.querySelector('.justify-end');
    expect(wrapper).toBeTruthy();
  });

  it('renders rich text content and strips unsafe tags', () => {
    const richTextMsg: MessageItem = {
      ...baseMessage,
      id: 'rich-1',
      text: '<p>Texto <strong>formatado</strong></p><script>alert(1)</script>',
    };

    const { container } = render(<MessageList items={[richTextMsg]} />);
    expect(screen.getByText('formatado')).toBeTruthy();
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
  });
});
