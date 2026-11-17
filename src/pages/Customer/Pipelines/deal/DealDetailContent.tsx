import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, CalendarPlus, Mail, MessageSquare, Pencil, Phone, Plus, StickyNote, Tag, X } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { pipelinesService } from '@/services/pipelines';
import { labelsService } from '@/services/contacts/labelsService';
import { useAppDataStore } from '@/store/appDataStore';
import type { Deal, DealContact, DealLabel, Pipeline, PipelineItem, UpdateDealData } from '@/types/analytics';
import type { Label } from '@/types/settings';
import { getContactDisplayName } from '@/utils/chat/avatarHelpers';
import { loadDeal, peekDeal, setCachedDeal } from './dealCache';
import { formatMoney } from './dealFormat';
import { HeaderAvatar } from './HeaderAvatar';
import DealConversationButton from './DealConversationButton';
import { DEAL_TABS, type DealTabId, type DealTabProps } from './dealContext';

import ActivitiesTab from './tabs/ActivitiesTab';
import ContactTab from './tabs/ContactTab';
import CompanyTab from './tabs/CompanyTab';
import DealFieldsTab from './tabs/DealFieldsTab';
import ConversationsTab from './tabs/ConversationsTab';
import FilesTab from './tabs/FilesTab';
import HistoryTab from './tabs/HistoryTab';

// As abas entram no mesmo chunk do modal (carregado sob demanda pelo kanban). Importar de forma
// estática evita suspender a abertura: o React seguraria a transição por ~300 ms.
const TAB_COMPONENTS: Record<DealTabId, (props: DealTabProps) => React.ReactElement> = {
  activities: ActivitiesTab,
  contacts: ContactTab,
  company: CompanyTab,
  deal: DealFieldsTab,
  conversations: ConversationsTab,
  files: FilesTab,
  history: HistoryTab,
};

/** Esqueleto montado já com os dados do cartão, antes do negócio completo chegar. */
function seedToDeal(seed: PipelineItem): Deal {
  return {
    ...seed,
    title: seed.title || 'Negócio',
    currency: seed.currency || 'BRL',
    contacts: [],
    conversations: [],
    files: [],
    history: [],
    tasks: [],
    scheduled_actions: [],
  } as Deal;
}

function TabSkeleton() {
  return (
    <div className="deal-tab-skeleton" role="status" aria-label="Carregando aba">
      <span /><span /><span />
    </div>
  );
}

export interface DealDetailContentProps {
  pipelineId: string;
  dealId: string;
  /** Dados já presentes no cartão: o cabeçalho aparece sem esperar a rede. */
  seed?: PipelineItem;
  /** Pipeline já carregado pelo kanban (etapas); sem ele a etapa é buscada. */
  pipeline?: Pipeline | null;
  tab: DealTabId;
  onTabChange: (tab: DealTabId) => void;
  onClose?: () => void;
  /** Avisa o kanban para refletir a mudança no cartão sem recarregar. */
  onDealChange?: (deal: Deal, info: { stageChanged: boolean }) => void;
  /** Área reservada para as ações de conversa (S4). */
  quickActions?: React.ReactNode;
  /** Painel lateral de conversa do kanban; sem ele a conversa abre na aba Conversas. */
  onOpenConversation?: (item: PipelineItem, conversationId: string, displayId?: number | string | null) => void;
  canConfigureNumbers?: boolean;
  onConfigureNumbers?: () => void;
}

export default function DealDetailContent({ pipelineId, dealId, seed, pipeline: pipelineProp, tab, onTabChange, onClose, onDealChange, quickActions, onOpenConversation, canConfigureNumbers, onConfigureNumbers }: DealDetailContentProps) {
  const cached = peekDeal(dealId);
  const [deal, setDeal] = useState<Deal | null>(cached ?? (seed ? seedToDeal(seed) : null));
  const [full, setFull] = useState(Boolean(cached));
  const [error, setError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(pipelineProp ?? null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [labelMenu, setLabelMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const { agents, fetchAgents } = useAppDataStore();
  const dealRef = useRef(deal);
  dealRef.current = deal;
  const onChangeRef = useRef(onDealChange);
  onChangeRef.current = onDealChange;

  const load = useCallback(async (force = false) => {
    setError(null);
    try {
      const next = await loadDeal(dealId, force);
      setDeal(next);
      setFull(true);
    } catch (err) {
      console.error(err);
      if (!peekDeal(dealId)) setError('O negócio não foi encontrado ou você não tem permissão para acessá-lo.');
      else toast.error('Não foi possível atualizar o negócio.');
    }
  }, [dealId]);

  useEffect(() => {
    const hit = peekDeal(dealId);
    setDeal(hit ?? (seed ? seedToDeal(seed) : null));
    setFull(Boolean(hit));
    void load(false);
    // seed muda a cada render do kanban; só o id do negócio deve disparar o carregamento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, load]);

  useEffect(() => {
    if (pipelineProp) setPipeline(pipelineProp);
    else
      void pipelinesService.getPipeline(pipelineId).then(setPipeline).catch(() => undefined);
  }, [pipelineId, pipelineProp]);

  useEffect(() => {
    void fetchAgents().catch(() => toast.error('Não foi possível carregar os responsáveis.'));
  }, [fetchAgents]);

  // Menu de tags: fecha ao clicar fora ou com Esc (o modal só fecha no Esc seguinte).
  useEffect(() => {
    if (!labelMenu) return;
    const outside = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest('.deal-tag-add')) setLabelMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLabelMenu(false); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  }, [labelMenu]);

  useEffect(() => {
    if (!labelMenu || labels) return;
    void labelsService.getLabels({ per_page: 100 }).then(result => setLabels(result.data || [])).catch(() => toast.error('Não foi possível carregar as tags.'));
  }, [labelMenu, labels]);

  const publish = useCallback((next: Deal, stageChanged: boolean) => {
    setCachedDeal(next);
    onChangeRef.current?.(next, { stageChanged });
  }, []);

  const replaceDeal = useCallback((next: Deal) => {
    const previous = dealRef.current;
    const stageChanged = Boolean(previous) && (previous!.pipeline_stage_id || previous!.stage_id) !== (next.pipeline_stage_id || next.stage_id);
    setDeal(next);
    publish(next, stageChanged);
  }, [publish]);

  const patchDeal = useCallback(async (changes: UpdateDealData, optimistic: Partial<Deal> = {}) => {
    const previous = dealRef.current;
    if (!previous) return false;
    setDeal({ ...previous, ...optimistic });
    try {
      const updated = await pipelinesService.updateDeal(dealId, changes);
      const stageChanged = (previous.pipeline_stage_id || previous.stage_id) !== (updated.pipeline_stage_id || updated.stage_id);
      setDeal(updated);
      publish(updated, stageChanged);
      return true;
    } catch (err) {
      console.error(err);
      setDeal(previous);
      toast.error('Não foi possível salvar. A alteração foi desfeita.');
      return false;
    }
  }, [dealId, publish]);

  const labelsOf = (current: Deal) => current.labels || [];
  const toggleLabel = async (label: Label) => {
    const current = dealRef.current;
    if (!current) return;
    const has = labelsOf(current).some(item => item.id === label.id || (item.title || item.name).toLocaleLowerCase() === label.title.toLocaleLowerCase());
    const next: DealLabel[] = has
      ? labelsOf(current).filter(item => item.id !== label.id && (item.title || item.name).toLocaleLowerCase() !== label.title.toLocaleLowerCase())
      : [...labelsOf(current), { id: label.id, name: label.title, title: label.title, color: label.color }];
    await patchDeal({ labels: next.map(item => item.id || item.title || item.name) }, { labels: next });
  };
  const removeLabel = async (label: DealLabel) => {
    const current = dealRef.current;
    if (!current) return;
    const next = labelsOf(current).filter(item => item !== label);
    await patchDeal({ labels: next.map(item => item.id || item.title || item.name) }, { labels: next });
  };

  const commitTitle = async () => {
    setEditingTitle(false);
    const value = titleDraft.trim();
    if (value && deal && value !== deal.title) await patchDeal({ title: value }, { title: value });
  };

  if (error || !deal) {
    return (
      <div className="deal-modal-error">
        <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />
        <h2>Negócio indisponível</h2>
        <p>{error || 'Não foi possível carregar este negócio.'}</p>
        <div>
          {onClose && <Button variant="outline" onClick={onClose}>Voltar ao pipeline</Button>}
          <Button onClick={() => void load(true)}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const primary = deal.primary_contact || deal.contacts?.[0] || deal.contact || null;
  const stageId = deal.pipeline_stage_id || deal.stage_id;
  const stages = pipeline?.stages || [];
  const owner = deal.owner as { id?: string; name?: string; avatar_url?: string } | null | undefined;
  const ActiveTab = TAB_COMPONENTS[tab];
  const tabProps: DealTabProps = { deal, pipeline, pipelineId, patchDeal, replaceDeal, reload: () => load(true), setTab: onTabChange, primary: primary as DealContact | null, onOpenConversation: (id, displayId) => (onOpenConversation && deal ? onOpenConversation(deal, id, displayId) : onTabChange('conversations')), canConfigureNumbers, onConfigureNumbers };

  return (
    <div className="deal-modal-body" data-loaded={full || undefined}>
      <header className="deal-modal-header">
        <div className="deal-modal-identity">
          <HeaderAvatar contact={primary} name={primary?.name || deal.title} />
          <div className="deal-modal-titleblock">
            {editingTitle ? (
              <input
                className="deal-modal-title-input"
                aria-label="Título do negócio"
                autoFocus
                value={titleDraft}
                onChange={event => setTitleDraft(event.target.value)}
                onBlur={() => void commitTitle()}
                onKeyDown={event => {
                  if (event.key === 'Enter') void commitTitle();
                  if (event.key === 'Escape') { event.stopPropagation(); setEditingTitle(false); }
                }}
              />
            ) : (
              <h2 className="deal-modal-title" title={deal.title}>
                <span>{getContactDisplayName(deal.title)}</span>
                {full && (
                  <button type="button" aria-label="Editar título" onClick={() => { setTitleDraft(deal.title); setEditingTitle(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </h2>
            )}
            <p className="deal-modal-subtitle">
              {[deal.company?.name, primary?.name && getContactDisplayName(primary.name) !== getContactDisplayName(deal.title) ? getContactDisplayName(primary.name) : null, formatMoney(deal.value, deal.currency)].filter(Boolean).join(' · ')}
              {(deal.contact_count || 0) > 1 ? <span className="deal-modal-count">+{(deal.contact_count || 1) - 1}</span> : null}
            </p>
          </div>
        </div>
        <div className="deal-modal-controls">
          {stages.length > 0 && (
            <label className="deal-modal-stage">
              <span className="sr-only">Etapa</span>
              <select aria-label="Etapa do negócio" value={stageId} disabled={!full} onChange={event => void patchDeal({ pipeline_stage_id: event.target.value }, { pipeline_stage_id: event.target.value, stage_id: event.target.value })}>
                {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
          )}
          <label className="deal-modal-owner">
            <span className="sr-only">Responsável</span>
            {owner?.avatar_url ? <img src={owner.avatar_url} alt="" /> : <span className="deal-modal-owner-initial" aria-hidden="true">{(owner?.name || '·').slice(0, 1)}</span>}
            <select aria-label="Responsável do negócio" value={owner?.id ? String(owner.id) : ''} disabled={!full} onChange={event => {
              const chosen = agents.find(agent => String(agent.id) === event.target.value);
              void patchDeal({ owner_id: event.target.value || null }, { owner: (chosen as Deal['owner']) ?? null });
            }}>
              <option value="">Sem responsável</option>
              {agents.map(agent => <option key={agent.id} value={String(agent.id)}>{agent.name}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="deal-modal-actions" data-slot="deal-quick-actions">
        <div className="deal-quick-buttons" role="toolbar" aria-label="Ações rápidas">
          {primary?.phone_number ? <a className="deal-quick" href={`tel:${primary.phone_number}`} aria-label="Ligar" title="Ligar"><Phone className="h-4 w-4" /></a> : <button type="button" className="deal-quick" disabled aria-label="Ligar" title="Sem telefone"><Phone className="h-4 w-4" /></button>}
          <button type="button" className="deal-quick" aria-label="Ver conversas" title="Conversas" onClick={() => onTabChange('conversations')}><MessageSquare className="h-4 w-4" /></button>
          {primary?.email ? <a className="deal-quick" href={`mailto:${primary.email}`} aria-label="Enviar e-mail" title="Enviar e-mail"><Mail className="h-4 w-4" /></a> : <button type="button" className="deal-quick" disabled aria-label="Enviar e-mail" title="Sem e-mail"><Mail className="h-4 w-4" /></button>}
          <button type="button" className="deal-quick" aria-label="Agendar atividade" title="Agendar atividade" onClick={() => onTabChange('activities')}><CalendarPlus className="h-4 w-4" /></button>
          <button type="button" className="deal-quick" aria-label="Ir para anotações" title="Anotações" onClick={() => onTabChange('deal')}><StickyNote className="h-4 w-4" /></button>
          <button type="button" className="deal-quick" aria-label="Lembretes" title="Lembretes e ações agendadas" onClick={() => onTabChange('activities')}><Bell className="h-4 w-4" /></button>
          <DealConversationButton
            dealId={deal.id}
            summary={deal.conversation_summary}
            variant="header"
            canConfigure={canConfigureNumbers}
            onOpenConversation={(id, displayId) => (onOpenConversation ? onOpenConversation(deal, id, displayId) : onTabChange('conversations'))}
            onConfigureNumbers={onConfigureNumbers}
            onChanged={summary => { onChangeRef.current?.({ ...deal, conversation_summary: summary } as Deal, { stageChanged: false }); void load(true); }}
          />
          {quickActions}
        </div>
        <div className="deal-modal-tags">
          {(deal.labels || []).map(label => {
            const color = label.color || '#1f93ff';
            return (
              <span key={label.id || label.name} className="deal-tag" style={{ borderColor: color, backgroundColor: `${color}18`, color }}>
                <Tag className="h-3 w-3" aria-hidden="true" />
                <span>{label.title || label.name}</span>
                {full && <button type="button" aria-label={`Remover tag ${label.title || label.name}`} onClick={() => void removeLabel(label)}><X className="h-3 w-3" /></button>}
              </span>
            );
          })}
          <div className="deal-tag-add">
            <button type="button" className="deal-quick" aria-label="Adicionar tag" aria-expanded={labelMenu} disabled={!full} onClick={() => setLabelMenu(open => !open)}><Plus className="h-4 w-4" /></button>
            {labelMenu && (
              <div className="deal-tag-menu" role="group" aria-label="Tags disponíveis">
                {labels ? (labels.length ? labels.map(label => {
                  const selected = (deal.labels || []).some(item => item.id === label.id || (item.title || item.name).toLocaleLowerCase() === label.title.toLocaleLowerCase());
                  return (
                    <button key={label.id} type="button" aria-pressed={selected} className={selected ? 'is-selected' : ''} onClick={() => void toggleLabel(label)}>
                      <i style={{ background: label.color }} />{label.title}
                    </button>
                  );
                }) : <p>Nenhuma tag cadastrada.</p>) : <p>Carregando…</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="deal-modal-tabs" aria-label="Seções do negócio">
        {DEAL_TABS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="deal-modal-main" aria-busy={!full}>
        {!full ? <TabSkeleton /> : <ActiveTab {...tabProps} />}
      </main>
    </div>
  );
}
