import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DealConversationButton from './DealConversationButton';
import type { DealConversationStatus, DealConversationSummary } from '@/types/analytics/pipelines';

const mocks = vi.hoisted(() => ({ getDealConversationStatus: vi.fn(), startDealConversation: vi.fn() }));
vi.mock('@/services/pipelines', () => ({ pipelinesService: mocks }));
vi.mock('@/hooks/useLanguage', async () => { const { pipelinesT } = await import('@/test/pipelinesI18n'); return { useLanguage: () => ({ t: pipelinesT }) }; });
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inbox = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `Número ${id}`, phone_number: '+5511999990000', connected: true, ...extra });
const status = (over: Partial<DealConversationStatus> = {}): DealConversationStatus => ({
  deal_id: 'd1', pipeline_id: 'p1', has_active: false, conversation: null, can_start: true, reason: null,
  contact: { id: 'c1', name: 'Maria', phone_number: '+5511988887777' },
  allowed_inboxes: [inbox('a', { is_default: true }), inbox('b')], default_inbox_id: 'a', ...over,
});
const summary = (over: Partial<DealConversationSummary> = {}): DealConversationSummary => ({ has_active: false, can_start: true, allowed_inbox_count: 2, ...over });

describe('DealConversationButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the active conversation without leaving the board', () => {
    const onOpen = vi.fn();
    render(<DealConversationButton dealId="d1" summary={summary({ has_active: true, conversation_id: 'conv-9', display_id: 9 })} onOpenConversation={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversa' }));
    expect(onOpen).toHaveBeenCalledWith('conv-9', 9);
    expect(mocks.startDealConversation).not.toHaveBeenCalled();
  });

  it('starts a conversation choosing among numbers, default pre-selected, and opens it', async () => {
    mocks.getDealConversationStatus.mockResolvedValue(status());
    mocks.startDealConversation.mockResolvedValue(status({ has_active: true, created: true, conversation: { id: 'new-1', display_id: 12, status: 'open', path: '/conversations/new-1' } }));
    const onOpen = vi.fn();
    const onChanged = vi.fn();
    render(<DealConversationButton dealId="d1" summary={summary()} onOpenConversation={onOpen} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar conversa' }));
    const first = await screen.findByLabelText(/Número a/);
    expect((first as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText(/Número b/));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar conversa', hidden: false, description: undefined }) ?? screen.getAllByRole('button', { name: 'Iniciar conversa' }).pop()!);
    await waitFor(() => expect(mocks.startDealConversation).toHaveBeenCalledWith('d1', 'b'));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('new-1', 12));
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ has_active: true, conversation_id: 'new-1' }));
  });

  it('is disabled with a clear reason and offers "Configurar números" to those who can', async () => {
    mocks.getDealConversationStatus.mockResolvedValue(status({ can_start: false, reason: 'no_inbox_configured', allowed_inboxes: [], default_inbox_id: null }));
    const onConfigure = vi.fn();
    render(<DealConversationButton dealId="d1" summary={summary({ can_start: false, reason: 'no_inbox_configured' })} canConfigure onConfigureNumbers={onConfigure} onOpenConversation={vi.fn()} />);
    const button = screen.getByTestId('deal-conversation-action');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.getAttribute('title')).toMatch(/não tem número de WhatsApp autorizado/);
    fireEvent.click(button);
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar números' }));
    expect(onConfigure).toHaveBeenCalled();
  });

  it('hides the configure link for users without permission', async () => {
    mocks.getDealConversationStatus.mockResolvedValue(status({ can_start: false, reason: 'no_inbox_configured', allowed_inboxes: [] }));
    render(<DealConversationButton dealId="d1" summary={summary({ can_start: false, reason: 'no_inbox_configured' })} onConfigureNumbers={vi.fn()} onOpenConversation={vi.fn()} />);
    fireEvent.click(screen.getByTestId('deal-conversation-action'));
    expect(await screen.findByText(/Peça a quem administra/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configurar números' })).toBeNull();
  });

  it('shows a readable message when the channel is disconnected', async () => {
    mocks.getDealConversationStatus.mockResolvedValue(status({ allowed_inboxes: [inbox('a', { is_default: true })] }));
    mocks.startDealConversation.mockRejectedValue({ response: { data: { error: { code: 'CHANNEL_DISCONNECTED' } } } });
    render(<DealConversationButton dealId="d1" summary={summary({ allowed_inbox_count: 1 })} onOpenConversation={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar conversa' }));
    await screen.findByLabelText(/Número a/);
    const buttons = screen.getAllByRole('button', { name: 'Iniciar conversa' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/desconectado/);
  });

  it('header variant fetches its own state', async () => {
    mocks.getDealConversationStatus.mockResolvedValue(status({ has_active: true, conversation: { id: 'c5', display_id: 5, status: 'open', path: '/conversations/c5' } }));
    render(<DealConversationButton dealId="d1" variant="header" onOpenConversation={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Abrir conversa' })).toBeInTheDocument();
  });
});
