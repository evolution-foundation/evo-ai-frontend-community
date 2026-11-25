import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageBubble from './MessageBubble';
import type { Message } from '@/types/chat/api';

vi.mock('@/hooks/useLanguage', async () => {
  const chat = (await import('@/i18n/locales/pt-BR/chat.json')).default;
  const t = (key: string) => {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], chat);
    return typeof value === 'string' ? value : key;
  };
  return { useLanguage: () => ({ t }) };
});

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
