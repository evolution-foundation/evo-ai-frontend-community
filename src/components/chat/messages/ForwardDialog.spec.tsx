import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ForwardDialog from './ForwardDialog';
import type { Message } from '@/types/chat/api';

const search = vi.hoisted(() => vi.fn());
const forward = vi.hoisted(() => vi.fn());
const store = vi.hoisted(() => ({ fetchInboxes: vi.fn(), inboxes: [{ id: 'wa', provider: 'evolution' }, { id: 'cloud', provider: 'whatsapp_cloud' }] }));
vi.mock('@/services/chat/searchService', () => ({ default: { searchConversations: search } }));
vi.mock('@/services/chat/chatService', () => ({ default: { forwardMessage: forward } }));
vi.mock('@/store/appDataStore', () => ({ useAppDataStore: () => store }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useLanguage', async () => {
  const chat = (await import('@/i18n/locales/pt-BR/chat.json')).default;
  const t = (key: string, params: Record<string, unknown> = {}) => {
    const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], chat);
    return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name])) : key;
  };
  return { useLanguage: () => ({ t }) };
});

const result = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `c${n}`,
  display_id: n,
  contact: { id: n, name: `Contato ${n}`, phone_number: `+55119999900${n}` },
  inbox: { id: 'wa', name: 'Comercial', channel_type: 'Channel::Whatsapp' },
  ...extra,
});
const message = { id: 'm1', content: 'Olá!' } as Message;
const props = { conversationId: 'origem', message, onClose: vi.fn(), onForwarded: vi.fn() };
const pick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`^${name}\\b`) }));
const confirm = () => screen.getByRole('button', { name: /^Encaminhar/ });

describe('ForwardDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue({ conversations: [1, 2, 3, 4, 5, 6].map(n => result(n)) });
    forward.mockResolvedValue([{ id: 'copy', conversation_id: 'c1' }]);
  });

  it('lists only WhatsApp Evolution conversations', async () => {
    search.mockResolvedValue({
      conversations: [
        result(1),
        result(2, { inbox: { id: 'cloud', name: 'Oficial', channel_type: 'Channel::Whatsapp' } }),
        result(3, { inbox: { id: 'mail', name: 'E-mail', channel_type: 'Channel::Email' } }),
      ],
    });
    render(<ForwardDialog {...props} />);
    expect(await screen.findByRole('checkbox', { name: /^Contato 1\b/ })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(store.fetchInboxes).toHaveBeenCalled();
  });

  it('searches what is typed and keeps the earlier selection', async () => {
    render(<ForwardDialog {...props} />);
    await screen.findByRole('checkbox', { name: /^Contato 1\b/ });
    pick('Contato 1');
    search.mockResolvedValue({ conversations: [result(9)] });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nove' } });
    await screen.findByRole('checkbox', { name: /^Contato 9\b/ });
    expect(search).toHaveBeenLastCalledWith({ q: 'nove' }, expect.anything());
    pick('Contato 9');
    fireEvent.click(confirm());
    await waitFor(() => expect(forward).toHaveBeenCalledWith('origem', 'm1', ['c1', 'c9']));
  });

  it('needs one destination and stops at five', async () => {
    render(<ForwardDialog {...props} />);
    await screen.findByRole('checkbox', { name: /^Contato 1\b/ });
    expect(confirm()).toBeDisabled();
    [1, 2, 3, 4, 5].forEach(n => pick(`Contato ${n}`));
    expect(screen.getByRole('checkbox', { name: /^Contato 6\b/ })).toBeDisabled();
    expect(screen.getByText('5 de 5 selecionadas')).toBeInTheDocument();
    pick('Contato 1');
    expect(screen.getByRole('checkbox', { name: /^Contato 6\b/ })).toBeEnabled();
  });

  it('shows the result, hands back the created copies and closes', async () => {
    render(<ForwardDialog {...props} />);
    await screen.findByRole('checkbox', { name: /^Contato 1\b/ });
    pick('Contato 1');
    pick('Contato 2');
    const button = confirm();
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(forward).toHaveBeenCalledTimes(1);
    expect(props.onForwarded).toHaveBeenCalledWith([{ id: 'copy', conversation_id: 'c1' }]);
    expect(toast.success).toHaveBeenCalledWith('Encaminhando para Contato 1, Contato 2.');
  });

  it.each([
    ['unsupported_content', 'Este conteúdo não pode ser encaminhado.'],
    ['invalid_target', 'Uma das conversas não está disponível. Escolha outra.'],
    ['creation_failed', 'Não deu para criar o envio (pode ser o limite por minuto). Nada foi enviado.'],
    ['qualquer', 'Não foi possível encaminhar. Tente de novo.'],
  ])('explains the refusal %s and keeps the selection', async (details, text) => {
    forward.mockRejectedValue({ response: { data: { error: { details } } } });
    render(<ForwardDialog {...props} />);
    await screen.findByRole('checkbox', { name: /^Contato 1\b/ });
    pick('Contato 1');
    fireEvent.click(confirm());
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.getByRole('checkbox', { name: /^Contato 1\b/ })).toBeChecked();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('says when nothing is found or the search fails', async () => {
    search.mockResolvedValueOnce({ conversations: [] });
    const { unmount } = render(<ForwardDialog {...props} />);
    expect(await screen.findByText('Nenhuma conversa de WhatsApp encontrada.')).toBeInTheDocument();
    unmount();
    search.mockRejectedValueOnce(new Error('x'));
    render(<ForwardDialog {...props} />);
    expect(await screen.findByText('Não foi possível buscar as conversas.')).toBeInTheDocument();
  });
});
