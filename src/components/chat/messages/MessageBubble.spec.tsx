import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';
import type { Message } from '@/types/chat/api';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useLanguage', async () => {
  const chat = (await import('@/i18n/locales/pt-BR/chat.json')).default;
  const t = (key: string) => {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], chat);
    return typeof value === 'string' ? value : key;
  };
  return { useLanguage: () => ({ t }) };
});

vi.mock('@/components/chat/message-input/EmojiPicker', () => ({
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) => (
    <button type="button" onClick={() => onEmojiSelect('🎉')}>seletor completo</button>
  ),
}));

const message = (extra: Partial<Message> = {}) =>
  ({
    id: 'm1',
    content: 'Olá!',
    content_type: 'text',
    message_type: 'incoming',
    status: 'sent',
    private: false,
    created_at: '1764000000',
    conversation_id: 'c1',
    attachments: [],
    content_attributes: {},
    ...extra,
  }) as unknown as Message;

const openActions = () =>
  fireEvent.keyDown(screen.getByRole('button', { name: 'Mais ações' }), { key: 'Enter' });

describe('MessageBubble actions button', () => {
  it('opens the actions from the keyboard and replies to that message', async () => {
    const onReply = vi.fn();
    const target = message();
    render(<MessageBubble message={target} isOwn={false} onReply={onReply} />);
    openActions();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Responder' }));
    expect(onReply).toHaveBeenCalledWith(target);
  });

  it('hides delete when there is no real handler', async () => {
    render(<MessageBubble message={message()} isOwn={false} onReply={vi.fn()} />);
    openActions();
    expect(await screen.findByRole('menuitem', { name: 'Copiar mensagem' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Excluir mensagem' })).toBeNull();
  });

  it('offers delete when a handler exists', async () => {
    render(<MessageBubble message={message()} isOwn onDelete={vi.fn()} />);
    openActions();
    expect(await screen.findByRole('menuitem', { name: 'Excluir mensagem' })).toBeInTheDocument();
  });

  it.each([
    ['a failed message', { status: 'failed' as const }],
    ['a message still being sent', { status: 'progress' as const }],
    ['a private note', { private: true }],
  ])('does not offer reply for %s', async (_label, extra) => {
    render(<MessageBubble message={message(extra)} isOwn onReply={vi.fn()} />);
    openActions();
    expect(await screen.findByRole('menuitem', { name: 'Copiar mensagem' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Responder' })).toBeNull();
  });

  it('has no actions button on deleted messages', () => {
    render(<MessageBubble message={message({ content_attributes: { deleted: true } })} isOwn={false} onReply={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Mais ações' })).toBeNull();
  });

  it('keeps the actions button in the post (Facebook style) layout', () => {
    render(<MessageBubble message={message()} isOwn={false} isFacebookStyle onReply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument();
  });
});

describe('MessageBubble reactions', () => {
  const reactable = (extra: Partial<Message> = {}) => message({ source_id: 'wa1', ...extra });
  const mine = { emoji: '👍', from: 'me', user_id: 'u1', at: 2 };
  const contact = { emoji: '❤️', from: 'contact', user_id: null, at: 1 };
  const withReactions = (reactions: unknown[]) => reactable({ content_attributes: { reactions } });
  const chooseReact = async () => {
    openActions();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reagir' }));
  };

  it('offers the six quick emojis from the actions menu', async () => {
    const onReact = vi.fn();
    const target = reactable();
    render(<MessageBubble message={target} isOwn={false} onReact={onReact} />);
    await chooseReact();
    for (const emoji of ['👍', '❤️', '😂', '😮', '😢', '🙏']) {
      expect(await screen.findByRole('button', { name: emoji })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: '😂' }));
    expect(onReact).toHaveBeenCalledWith(target, '😂');
    expect(screen.queryByRole('button', { name: '😂' })).toBeNull();
  });

  it('also opens from the button beside the bubble and offers the full picker', async () => {
    const onReact = vi.fn();
    const target = reactable();
    render(<MessageBubble message={target} isOwn={false} onReact={onReact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reagir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mais emojis' }));
    fireEvent.click(screen.getByRole('button', { name: 'seletor completo' }));
    expect(onReact).toHaveBeenCalledWith(target, '🎉');
  });

  it('removes my reaction when I pick the same emoji again', async () => {
    const onReact = vi.fn();
    const target = withReactions([mine]);
    render(<MessageBubble message={target} isOwn={false} onReact={onReact} />);
    await chooseReact();
    fireEvent.click(await screen.findByRole('button', { name: '👍', pressed: true }));
    expect(onReact).toHaveBeenCalledWith(target, '');
  });

  it('shows chips with counts and removes my own on click', () => {
    const onReact = vi.fn();
    const target = withReactions([contact, mine, { ...contact, emoji: '😂', from: 'contact' }]);
    render(<MessageBubble message={withReactions([{ ...contact, emoji: '👍' }, mine])} isOwn={false} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    render(<MessageBubble message={target} isOwn onReact={onReact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover minha reação 👍' }));
    expect(onReact).toHaveBeenCalledWith(target, '');
    expect(screen.queryByRole('button', { name: /❤️/ })).toBeNull();
    expect(screen.getByText('❤️')).toBeInTheDocument();
  });

  it('keeps chips read only without a handler', () => {
    render(<MessageBubble message={withReactions([mine])} isOwn={false} />);
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover minha reação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reagir' })).toBeNull();
  });

  it.each([
    ['a message not yet on WhatsApp', { source_id: null }],
    ['a private note', { private: true }],
  ])('does not offer reacting on %s', async (_label, extra) => {
    render(<MessageBubble message={reactable(extra)} isOwn onReact={vi.fn()} />);
    openActions();
    expect(await screen.findByRole('menuitem', { name: 'Copiar mensagem' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reagir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reagir' })).toBeNull();
  });
});

describe('MessageBubble shared contacts', () => {
  const ana = { name: 'Ana Sintética', phones: ['+55 11 90000-0001', '+551130000000'], organization: 'Clínica Exemplo' };
  const beto = { name: 'Beto Sintético', phones: [], organization: null };
  const contacts = (shared: unknown[], content = 'Ana Sintética, Beto Sintético') =>
    message({ content, content_attributes: { shared_contacts: shared } as Message['content_attributes'] });
  const writeText = vi.fn();
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  it('shows one card per contact with initials, name, company and phones instead of the text', () => {
    render(<MessageBubble message={contacts([ana, beto])} isOwn={false} />);
    const cards = screen.getAllByTestId('shared-contact');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('AS');
    expect(cards[0]).toHaveTextContent('Ana Sintética');
    expect(cards[0]).toHaveTextContent('Clínica Exemplo');
    expect(cards[0]).toHaveTextContent('+55 11 90000-0001');
    expect(cards[0]).toHaveTextContent('+551130000000');
    expect(cards[1]).toHaveTextContent('Beto Sintético');
    expect(within(cards[1]).queryByRole('button')).toBeNull();
    expect(screen.queryByText('Ana Sintética, Beto Sintético')).toBeNull();
  });

  it('copies the chosen number', async () => {
    render(<MessageBubble message={contacts([ana])} isOwn />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar número +551130000000' }));
    expect(writeText).toHaveBeenCalledWith('+551130000000');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Número copiado'));
  });

  it('warns when the number cannot be copied', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<MessageBubble message={contacts([ana])} isOwn={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar número +551130000000' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar o número.'));
  });

  it('shows a masked number without offering to copy it', () => {
    render(<MessageBubble message={contacts([{ ...ana, phones: ['+*********0001'] }])} isOwn={false} />);
    expect(screen.getByText('+*********0001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar número/ })).toBeNull();
  });

  it('handles a contact that only has a phone', () => {
    render(<MessageBubble message={contacts([{ name: '', phones: ['+551130000000'], organization: null }], 'Contact')} isOwn={false} />);
    expect(screen.getByTestId('shared-contact')).toHaveTextContent('Contato sem nome');
    expect(screen.queryByText('Contact')).toBeNull();
  });

  it('keeps the text when there is no shared_contacts', () => {
    render(<MessageBubble message={message({ content: 'Ana Sintética' })} isOwn={false} />);
    expect(screen.getByText('Ana Sintética')).toBeInTheDocument();
    expect(screen.queryByTestId('shared-contact')).toBeNull();
  });

  it('hides the card on deleted messages', () => {
    render(<MessageBubble message={message({ content_attributes: { deleted: true, shared_contacts: [ana] } as Message['content_attributes'] })} isOwn={false} />);
    expect(screen.queryByTestId('shared-contact')).toBeNull();
  });
});

describe('MessageBubble forwarding', () => {
  it('forwards the message from the actions menu', async () => {
    const onForward = vi.fn();
    const target = message();
    render(<MessageBubble message={target} isOwn={false} onForward={onForward} />);
    openActions();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Encaminhar' }));
    expect(onForward).toHaveBeenCalledWith(target);
  });

  it('hides forwarding for what cannot be sent', async () => {
    render(<MessageBubble message={message({ private: true })} isOwn onForward={vi.fn()} />);
    openActions();
    expect(await screen.findByRole('menuitem', { name: 'Copiar mensagem' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Encaminhar' })).toBeNull();
  });

  it('labels a forwarded copy', () => {
    const { rerender } = render(<MessageBubble message={message({ content_attributes: { forwarded: true } })} isOwn />);
    expect(screen.getByText('Encaminhada')).toBeInTheDocument();
    rerender(<MessageBubble message={message()} isOwn />);
    expect(screen.queryByText('Encaminhada')).toBeNull();
  });
});

describe('MessageBubble formatted content', () => {
  const chatText = 'Olá! Seja bem-vindo. Aqui é a equipe que vai conduzir seu atendimento.';
  const fragment = `<p><strong>${chatText}</strong></p>`;

  it('renders long formatted chat messages inside the themed bubble', () => {
    render(<MessageBubble message={message({ content: fragment, message_type: 'outgoing' })} isOwn />);

    const content = screen.getByText(chatText, { selector: 'strong' });
    expect(content.closest('.rich-content')).toBeInTheDocument();
    expect(content.closest('.text-primary-foreground')).toBeInTheDocument();
    expect(content.closest('.email-html-content-wrapper')).toBeNull();
  });

  it.each([
    { content: fragment, content_type: 'incoming_email' },
    { content: `<!DOCTYPE html><html><body>${fragment}</body></html>` },
  ] as Partial<Message>[])('keeps email HTML in the email wrapper', (email) => {
    render(<MessageBubble message={message(email)} isOwn />);

    expect(screen.getByText(chatText).closest('.email-html-content-wrapper')).toBeInTheDocument();
  });
});
