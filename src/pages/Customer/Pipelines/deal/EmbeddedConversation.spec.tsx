import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmbeddedConversation from './EmbeddedConversation';

const chat = vi.hoisted(() => ({ getConversation: vi.fn(), getMessages: vi.fn(), markConversationAsRead: vi.fn(), sendMessage: vi.fn() }));
const perms = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock('@/hooks/useLanguage', async () => { const { pipelinesT } = await import('@/test/pipelinesI18n'); return { useLanguage: () => ({ t: pipelinesT }) }; });
vi.mock('@/services/chat/chatService', () => ({ default: chat }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: perms.can }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/chat/messages/MessageList', () => ({
  default: ({ messages }: { messages: Array<{ id: string; content: string }> }) => <ul>{messages.map(m => <li key={m.id}>{m.content}</li>)}</ul>,
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
});
