import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmbeddedConversation from './EmbeddedConversation';

const chat = vi.hoisted(() => ({ getConversation: vi.fn(), getMessages: vi.fn(), markConversationAsRead: vi.fn(), sendMessage: vi.fn() }));
const perms = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock('@/hooks/useLanguage', async () => {
  const { pipelinesT } = await import('@/test/pipelinesI18n');
  const chatLocale = (await import('@/i18n/locales/pt-BR/chat.json')).default;
  const chatT = (key: string) => {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], chatLocale);
    return typeof value === 'string' ? value : key;
  };
  return { useLanguage: (namespace: string) => ({ t: namespace === 'chat' ? chatT : pipelinesT }) };
});
vi.mock('@/services/chat/chatService', () => ({ default: chat }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: perms.can }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/chat/messages/MessageList', () => ({
  default: ({ messages, onReplyToMessage, onDeleteMessage }: { messages: Array<{ id: string; content: string }>; onReplyToMessage?: (m: unknown) => void; onDeleteMessage?: unknown }) => (
    <ul data-testid="list" data-can-delete={String(Boolean(onDeleteMessage))}>
      {messages.map(m => (
        <li key={m.id}>
          <span>{m.content}</span>
          {onReplyToMessage && <button type="button" onClick={() => onReplyToMessage(m)}>responder {m.id}</button>}
        </li>
      ))}
    </ul>
  ),
}));

describe('EmbeddedConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    perms.can.mockReturnValue(true);
    chat.getConversation.mockResolvedValue({ id: 'c1', can_reply: true });
    chat.getMessages.mockResolvedValue({ success: true, data: [{ id: 'm1', content: 'Olá!' }] });
    chat.markConversationAsRead.mockResolvedValue(undefined);
  });

  it('marks as read on open when spy mode is off', async () => {
    render(<EmbeddedConversation conversationId="c1" spyDefault={false} />);
    expect(await screen.findByText('Olá!')).toBeInTheDocument();
    await waitFor(() => expect(chat.markConversationAsRead).toHaveBeenCalledTimes(1));
    expect(chat.markConversationAsRead).toHaveBeenCalledWith('c1');
  });

  it('spy mode opens without marking as read, and persists the choice', async () => {
    render(<EmbeddedConversation conversationId="c1" spyDefault={false} />);
    await screen.findByText('Olá!');
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo espião' }));
    expect(screen.getByText(/não é marcada como lida/)).toBeInTheDocument();
    expect(localStorage.getItem('evo.dealConversation.spy')).toBe('1');
  });

  it('does not mark as read when spy mode is on from the start', async () => {
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await screen.findByText('Olá!');
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(chat.markConversationAsRead).not.toHaveBeenCalled();
  });

  it('sends a text message with Enter and appends it', async () => {
    chat.sendMessage.mockResolvedValue({ id: 'm2', content: 'Tudo bem?' });
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await screen.findByText('Olá!');
    const box = screen.getByLabelText('Mensagem');
    fireEvent.change(box, { target: { value: 'Tudo bem?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalledWith('c1', expect.objectContaining({ content: 'Tudo bem?', message_type: 'outgoing', private: false })));
    expect(await screen.findByText('Tudo bem?')).toBeInTheDocument();
  });

  it('blocks sending without permission or outside the reply window', async () => {
    perms.can.mockReturnValue(false);
    const { unmount } = render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await screen.findByText('Olá!');
    expect(screen.queryByLabelText('Mensagem')).toBeNull();
    expect(screen.getByText(/não tem permissão/)).toBeInTheDocument();
    unmount();
    perms.can.mockReturnValue(true);
    chat.getConversation.mockResolvedValue({ id: 'c1', can_reply: false });
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    expect(await screen.findByText(/Fora da janela de resposta/)).toBeInTheDocument();
  });

  it('shows a retry when messages fail to load', async () => {
    chat.getMessages.mockRejectedValueOnce(new Error('x'));
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Olá!')).toBeInTheDocument();
  });

  const cancelName = { name: 'Cancelar resposta' };
  const type = (value: string) => fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value } });
  const pressEnter = () => fireEvent.keyDown(screen.getByLabelText('Mensagem'), { key: 'Enter' });
  const reply = async () => fireEvent.click(await screen.findByRole('button', { name: 'responder m1' }));

  it('sends with the quoted message and clears the quote', async () => {
    chat.sendMessage.mockResolvedValue({ id: 'm2', content: 'Claro' });
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await reply();
    expect(screen.getByRole('button', cancelName)).toBeInTheDocument();
    type('Claro');
    pressEnter();
    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalledWith('c1', expect.objectContaining({ content_attributes: { in_reply_to: 'm1' } })));
    await waitFor(() => expect(screen.queryByRole('button', cancelName)).toBeNull());
  });

  it('cancel removes the quote and keeps the draft', async () => {
    chat.sendMessage.mockResolvedValue({ id: 'm2', content: 'Claro' });
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await reply();
    type('Claro');
    fireEvent.click(screen.getByRole('button', cancelName));
    expect(screen.queryByRole('button', cancelName)).toBeNull();
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Claro');
    pressEnter();
    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalledTimes(1));
    expect(chat.sendMessage.mock.calls[0][1].content_attributes).toBeUndefined();
  });

  it('keeps draft and quote when sending fails', async () => {
    chat.sendMessage.mockRejectedValue(new Error('x'));
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await reply();
    type('Claro');
    pressEnter();
    await waitFor(() => expect(chat.sendMessage).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(screen.getByRole('button', cancelName)).toBeInTheDocument();
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Claro');
  });

  it('drops the quote when the conversation changes', async () => {
    const { rerender } = render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await reply();
    rerender(<EmbeddedConversation conversationId="c2" spyDefault />);
    await screen.findByRole('button', { name: 'responder m1' });
    expect(screen.queryByRole('button', cancelName)).toBeNull();
  });

  it('a send that finishes after the conversation changed does not touch the new one', async () => {
    let finish: (value: unknown) => void = () => undefined;
    chat.sendMessage.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { rerender } = render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await reply();
    type('Claro');
    pressEnter();
    chat.getMessages.mockResolvedValue({ success: true, data: [{ id: 'n1', content: 'Outra conversa' }] });
    rerender(<EmbeddedConversation conversationId="c2" spyDefault />);
    fireEvent.click(await screen.findByRole('button', { name: 'responder n1' }));
    type('rascunho novo');
    finish({ id: 'm2', content: 'Claro' });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(screen.queryByText('Claro')).toBeNull();
    expect(screen.getByLabelText('Mensagem')).toHaveValue('rascunho novo');
    expect(screen.getByRole('button', cancelName)).toBeInTheDocument();
  });

  it('offers no delete, and no reply when it cannot send', async () => {
    perms.can.mockReturnValue(false);
    render(<EmbeddedConversation conversationId="c1" spyDefault />);
    await screen.findByText('Olá!');
    expect(screen.getByTestId('list')).toHaveAttribute('data-can-delete', 'false');
    expect(screen.queryByRole('button', { name: 'responder m1' })).toBeNull();
  });
});
