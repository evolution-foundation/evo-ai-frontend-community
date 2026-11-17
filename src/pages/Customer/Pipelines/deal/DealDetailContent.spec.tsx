import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deal, Pipeline } from '@/types/analytics';
import DealDetailContent from './DealDetailContent';
import DealModal from './DealModal';
import { clearDealCache } from './dealCache';
import type { DealTabId } from './dealContext';

const pipelineServiceMocks = vi.hoisted(() => ({
  getDeal: vi.fn(),
  getPipeline: vi.fn(),
  getAvailableContacts: vi.fn(),
  getAvailableConversations: vi.fn(),
  updateDeal: vi.fn(),
  addDealContact: vi.fn(),
  removeDealContact: vi.fn(),
  addDealConversation: vi.fn(),
  removeDealConversation: vi.fn(),
  uploadDealFiles: vi.fn(),
  removeDealFile: vi.fn(),
  getDealConversationStatus: vi.fn(),
  startDealConversation: vi.fn(),
  changeDealStatus: vi.fn(),
}));
const taskMocks = vi.hoisted(() => ({ getTasksForItem: vi.fn(), createTask: vi.fn(), completeTask: vi.fn() }));
const labelServiceMocks = vi.hoisted(() => ({ getLabels: vi.fn() }));
const fetchAgents = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLanguage', async () => { const { pipelinesT } = await import('@/test/pipelinesI18n'); return { useLanguage: () => ({ t: pipelinesT }) }; });
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/components/chat/messages/MessageList', () => ({ default: () => null }));
vi.mock('@/services/chat/chatService', () => ({ default: { getConversation: vi.fn().mockResolvedValue(null), getMessages: vi.fn().mockResolvedValue([]), markConversationAsRead: vi.fn().mockResolvedValue(undefined), sendMessage: vi.fn() } }));
vi.mock('@/services/pipelines', () => ({ pipelinesService: pipelineServiceMocks }));
vi.mock('@/services/pipelines/pipelineTasksService', () => ({ pipelineTasksService: taskMocks }));
vi.mock('@/services/contacts/labelsService', () => ({ labelsService: labelServiceMocks }));
vi.mock('@/services/contacts', () => ({ contactsService: { updateContact: vi.fn(), createContact: vi.fn() } }));
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({ agents: [{ id: 'owner-1', name: 'Ana' }, { id: 'owner-2', name: 'Bia' }], fetchAgents }),
}));
vi.mock('@/components/contacts/CustomAttributes', () => ({ default: () => null }));

const pipeline = {
  id: 'pipeline-1',
  name: 'Comercial',
  stages: [
    { id: 'stage-1', name: 'Entrada', color: '#111111' },
    { id: 'stage-2', name: 'Proposta', color: '#222222' },
  ],
  custom_fields: { attributes: ['origem'] },
} as Pipeline;

const deal = {
  id: 'deal-1',
  deal_id: 'deal-1',
  pipeline_id: 'pipeline-1',
  stage_id: 'stage-1',
  pipeline_stage_id: 'stage-1',
  title: 'Renovação',
  value: 100,
  currency: 'BRL',
  is_lead: false,
  item_id: 'contact-1',
  type: 'contact',
  created_at: '2026-08-30T10:00:00Z',
  updated_at: '2026-08-30T10:00:00Z',
  owner: { id: 'owner-1', name: 'Ana' },
  labels: [{ id: 'label-1', name: 'Expansão', title: 'Expansão', color: '#7c3aed' }],
  contacts: [{ id: 'c1', name: 'Marina Costa', email: 'm@example.com', phone_number: '+5511999990000', type: 'person' }],
  primary_contact: { id: 'c1', name: 'Marina Costa', email: 'm@example.com', phone_number: '+5511999990000', type: 'person' },
  conversations: [{ id: 'conv-1', display_id: 7, status: 'open', contact: { id: 'c1', name: 'Marina Costa' }, latest_message: { content: 'Olá' } }],
  files: [],
  history: [{ id: 'h1', action: 'stage_changed', source: 'api', changes: {}, metadata: {}, created_at: '2026-11-17T10:00:00Z' }],
  tasks: [],
  scheduled_actions: [],
  custom_fields: {},
} as unknown as Deal;

function Harness({ initial = 'deal' as DealTabId, onChange = vi.fn(), onClose = vi.fn() }) {
  const [tab, setTab] = useState<DealTabId>(initial);
  return <DealDetailContent pipelineId="pipeline-1" dealId="deal-1" pipeline={pipeline} tab={tab} onTabChange={setTab} onDealChange={onChange} onClose={onClose} />;
}

const renderContent = (props: Parameters<typeof Harness>[0] = {}) => render(<MemoryRouter><Harness {...props} /></MemoryRouter>);

describe('DealDetailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDealCache();
    pipelineServiceMocks.getPipeline.mockResolvedValue(pipeline);
    pipelineServiceMocks.getAvailableContacts.mockResolvedValue([]);
    pipelineServiceMocks.getAvailableConversations.mockResolvedValue([]);
    pipelineServiceMocks.getDealConversationStatus.mockResolvedValue({ deal_id: 'deal-1', pipeline_id: 'pipeline-1', has_active: false, conversation: null, can_start: false, reason: 'no_contact', allowed_inboxes: [], default_inbox_id: null });
    labelServiceMocks.getLabels.mockResolvedValue({ data: [{ id: 'label-1', title: 'Expansão', color: '#7c3aed' }, { id: 'label-2', title: 'Quente', color: '#ef4444' }] });
    taskMocks.getTasksForItem.mockResolvedValue({ data: [] });
    fetchAgents.mockResolvedValue(undefined);
  });

  it('shows a recoverable error instead of an endless spinner when the deal cannot load', async () => {
    pipelineServiceMocks.getDeal.mockRejectedValue(new Error('not found'));
    renderContent();
    expect(await screen.findByText('Negócio indisponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('renders the header from the card seed before the deal arrives', async () => {
    pipelineServiceMocks.getDeal.mockReturnValue(new Promise(() => undefined));
    render(
      <MemoryRouter>
        <DealDetailContent pipelineId="pipeline-1" dealId="deal-1" pipeline={pipeline} tab="activities" onTabChange={() => undefined} seed={{ ...(deal as object), title: 'Do cartão' } as never} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /Do cartão/ })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando aba' })).toBeInTheDocument();
  });

  it('exposes all six tabs and loads each on demand', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    renderContent({ initial: 'activities' });
    const nav = await screen.findByRole('navigation', { name: 'Seções do negócio' });
    expect(within(nav).getAllByRole('button').map(button => button.textContent)).toEqual(['Atividades', 'Contatos', 'Negócio', 'Conversas', 'Arquivos', 'Histórico']);
    expect(await screen.findByRole('list', { name: 'Etapas do pipeline' })).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('button', { name: 'Histórico' }));
    expect(await screen.findByText('Mudou de etapa')).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('button', { name: 'Conversas' }));
    expect(await screen.findByText('Selecione uma conversa')).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('button', { name: 'Contatos' }));
    expect(await screen.findByText('Campos de contato')).toBeInTheDocument();
  });

  it('autosaves an inline edit, clears the owner explicitly and tells the board', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    pipelineServiceMocks.updateDeal.mockResolvedValue({ ...deal, owner: null });
    const onChange = vi.fn();
    renderContent({ onChange });
    const owner = await screen.findByLabelText('Responsável do negócio');
    await waitFor(() => expect(owner).toBeEnabled());
    fireEvent.change(owner, { target: { value: '' } });
    await waitFor(() => expect(pipelineServiceMocks.updateDeal).toHaveBeenCalledWith('deal-1', expect.objectContaining({ owner_id: null })));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ owner: null }), { stageChanged: false }));
  });

  it('commits an inline field on Enter and reverts on failure', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    pipelineServiceMocks.updateDeal.mockRejectedValue(new Error('boom'));
    renderContent();
    fireEvent.click(await screen.findByRole('button', { name: 'Anotações' }));
    const input = screen.getByRole('textbox', { name: 'Anotações' });
    fireEvent.change(input, { target: { value: 'Ligar amanhã' } });
    fireEvent.blur(input);
    await waitFor(() => expect(pipelineServiceMocks.updateDeal).toHaveBeenCalledWith('deal-1', { notes: 'Ligar amanhã' }));
    await waitFor(() => expect(screen.queryByText('Ligar amanhã')).not.toBeInTheDocument());
  });

  it('reports a stage change so the board reloads', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    pipelineServiceMocks.updateDeal.mockResolvedValue({ ...deal, stage_id: 'stage-2', pipeline_stage_id: 'stage-2' });
    const onChange = vi.fn();
    renderContent({ onChange });
    const stage = await screen.findByLabelText('Etapa do negócio');
    await waitFor(() => expect(stage).toBeEnabled());
    fireEvent.change(stage, { target: { value: 'stage-2' } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.anything(), { stageChanged: true }));
    expect(pipelineServiceMocks.updateDeal).toHaveBeenCalledWith('deal-1', { pipeline_stage_id: 'stage-2' });
  });

  it('sends deal-owned labels when toggling a tag', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    pipelineServiceMocks.updateDeal.mockResolvedValue(deal);
    renderContent();
    const add = await screen.findByRole('button', { name: 'Adicionar tag' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole('button', { name: 'Quente' }));
    await waitFor(() => expect(pipelineServiceMocks.updateDeal).toHaveBeenCalledWith('deal-1', { labels: ['label-1', 'label-2'] }));
  });

  it('creates and completes an activity', async () => {
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
    const task = { id: 't1', title: 'Ligar', task_type: 'follow_up', status: 'pending', due_date: '2026-11-18T12:00:00Z' };
    taskMocks.createTask.mockResolvedValue(task);
    taskMocks.completeTask.mockResolvedValue({ ...task, status: 'completed' });
    renderContent({ initial: 'activities' });
    fireEvent.click(await screen.findByRole('button', { name: /Nova atividade$/ }));
    fireEvent.change(screen.getByLabelText('Título da atividade'), { target: { value: 'Ligar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByRole('button', { name: /Concluir Ligar/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Concluir Ligar/ }));
    await waitFor(() => expect(taskMocks.completeTask).toHaveBeenCalledWith('pipeline-1', 't1'));
  });
});

describe('DealModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDealCache();
    pipelineServiceMocks.getPipeline.mockResolvedValue(pipeline);
    pipelineServiceMocks.getAvailableContacts.mockResolvedValue([]);
    pipelineServiceMocks.getAvailableConversations.mockResolvedValue([]);
    taskMocks.getTasksForItem.mockResolvedValue({ data: [] });
    labelServiceMocks.getLabels.mockResolvedValue({ data: [] });
    fetchAgents.mockResolvedValue(undefined);
    pipelineServiceMocks.getDeal.mockResolvedValue(deal);
  });

  it('is a dialog that closes with Esc and with the close button', async () => {
    const onClose = vi.fn();
    render(<MemoryRouter><DealModal pipelineId="pipeline-1" dealId="deal-1" pipeline={pipeline} tab="deal" onTabChange={() => undefined} onClose={onClose} /></MemoryRouter>);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    await screen.findByText('Campos de negócio');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar negócio' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe('status do negócio', () => {
    it('marca como ganho, avisa o quadro e trava a troca de etapa', async () => {
      pipelineServiceMocks.getDeal.mockResolvedValue({ ...deal, deal_status: 'open' });
      pipelineServiceMocks.changeDealStatus.mockResolvedValue({ ...deal, deal_status: 'won' });
      const onChange = vi.fn();
      renderContent({ onChange });
      fireEvent.click(await screen.findByRole('button', { name: 'Marcar como ganho' }));
      await waitFor(() => expect(pipelineServiceMocks.changeDealStatus).toHaveBeenCalledWith('deal-1', 'won', undefined));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ deal_status: 'won' }), { stageChanged: false, statusChanged: true });
      expect(await screen.findByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
      expect(screen.getByLabelText('Etapa do negócio')).toBeDisabled();
    });

    it('marca como perdido com motivo opcional e mostra o selo', async () => {
      pipelineServiceMocks.getDeal.mockResolvedValue({ ...deal, deal_status: 'open' });
      pipelineServiceMocks.changeDealStatus.mockResolvedValue({ ...deal, deal_status: 'lost', lost_reason: 'Sem orçamento' });
      renderContent();
      fireEvent.click(await screen.findByRole('button', { name: 'Marcar como perdido' }));
      fireEvent.change(screen.getByLabelText('Motivo da perda (opcional)'), { target: { value: 'Sem orçamento' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar perdido' }));
      await waitFor(() => expect(pipelineServiceMocks.changeDealStatus).toHaveBeenCalledWith('deal-1', 'lost', 'Sem orçamento'));
      expect(await screen.findByText(/Perdido · Sem orçamento/)).toBeInTheDocument();
    });

    it('reabre um negócio perdido', async () => {
      pipelineServiceMocks.getDeal.mockResolvedValue({ ...deal, deal_status: 'lost' });
      pipelineServiceMocks.changeDealStatus.mockResolvedValue({ ...deal, deal_status: 'open' });
      renderContent();
      fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
      await waitFor(() => expect(pipelineServiceMocks.changeDealStatus).toHaveBeenCalledWith('deal-1', 'open', undefined));
      expect(await screen.findByRole('button', { name: 'Marcar como ganho' })).toBeInTheDocument();
    });

    it('mantém o estado anterior quando a API falha', async () => {
      pipelineServiceMocks.getDeal.mockResolvedValue({ ...deal, deal_status: 'open' });
      pipelineServiceMocks.changeDealStatus.mockRejectedValue(new Error('x'));
      renderContent();
      fireEvent.click(await screen.findByRole('button', { name: 'Marcar como ganho' }));
      await waitFor(() => expect(pipelineServiceMocks.changeDealStatus).toHaveBeenCalled());
      expect(await screen.findByRole('button', { name: 'Marcar como ganho' })).toBeInTheDocument();
    });
  });
});
