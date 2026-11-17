import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { pipelinesService } from '@/services/pipelines';
import type { ConversationForModal } from '@/types/analytics';
import { getContactDisplayName } from '@/utils/chat/avatarHelpers';
import type { DealTabProps } from '../dealContext';
import { HeaderAvatar } from '../HeaderAvatar';
import { formatDateTime } from '../dealFormat';
import EmbeddedConversation from '../EmbeddedConversation';
import DealConversationButton from '../DealConversationButton';
import { useLanguage } from '@/hooks/useLanguage';

const STATUS: Record<string, string> = { open: 'Em aberto', resolved: 'Resolvida', pending: 'Pendente', snoozed: 'Adiada' };

/**
 * Lista de sessões à esquerda e painel à direita (wireframe 5).
 * A conversa embutida e o modo espião entram na S4: o painel é o ponto de encaixe.
 */
export default function ConversationsTab({ deal, pipelineId, replaceDeal, reload, canConfigureNumbers, onConfigureNumbers }: DealTabProps) {
  const { t } = useLanguage('pipelines');
  const conversations = useMemo(() => deal.conversations || [], [deal.conversations]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [available, setAvailable] = useState<ConversationForModal[]>([]);
  const [pick, setPick] = useState('');

  useEffect(() => {
    void pipelinesService.getAvailableConversations(pipelineId).then(setAvailable).catch(() => undefined);
  }, [pipelineId]);

  const selected = conversations.find(item => item.id === selectedId) || null;
  const associate = async () => {
    if (!pick) return;
    try {
      replaceDeal(await pipelinesService.addDealConversation(deal.id, pick));
      setPick('');
      toast.success('Conversa associada.');
    } catch {
      toast.error('Não foi possível associar a conversa.');
    }
  };
  const remove = async (id: string) => {
    try {
      replaceDeal(await pipelinesService.removeDealConversation(deal.id, id));
      setSelectedId(current => (current === id ? null : current));
      toast.success('Conversa removida do negócio.');
    } catch {
      toast.error('Não foi possível remover a conversa.');
    }
  };

  return (
    <div className="deal-conversations">
      <section className="deal-conversations-list" aria-label="Sessões de conversa">
        <header>
          <h2>{conversations.length} {conversations.length === 1 ? 'sessão' : 'sessões'}</h2>
          <DealConversationButton dealId={deal.id} summary={deal.conversation_summary} variant="header" canConfigure={canConfigureNumbers} onConfigureNumbers={onConfigureNumbers} onOpenConversation={id => { setSelectedId(id); void reload(); }} />
        </header>
        <div className="deal-associate">
          <select aria-label="Selecionar conversa" value={pick} onChange={event => setPick(event.target.value)}>
            <option value="">Associar uma conversa…</option>
            {available.filter(item => !conversations.some(linked => linked.id === item.id)).map(item => <option key={item.id} value={item.id}>#{item.display_id} · {item.contact?.name || 'Sem contato'}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => void associate()} disabled={!pick}><Plus className="mr-1 h-4 w-4" />Associar</Button>
        </div>
        <ul>
          {conversations.map(conversation => {
            const message = (conversation.latest_message as { content?: string; created_at?: string | number } | undefined) || undefined;
            return (
              <li key={conversation.id} className={selectedId === conversation.id ? 'is-selected' : ''}>
                <button type="button" onClick={() => setSelectedId(conversation.id)} aria-pressed={selectedId === conversation.id}>
                  <HeaderAvatar contact={conversation.contact} />
                  <span className="deal-conversation-text">
                    <span className="deal-conversation-top"><em className={`deal-chip is-${conversation.status === 'open' ? 'ok' : 'wait'}`}>{STATUS[conversation.status] || conversation.status}</em><time>{formatDateTime(message?.created_at).split(',')[0]}</time></span>
                    <strong>#{conversation.display_id} · {getContactDisplayName(conversation.contact?.name)}</strong>
                    <span className="deal-conversation-snippet">{message?.content || 'Sem mensagens'}</span>
                  </span>
                </button>
                <button type="button" className="deal-icon-danger" aria-label={`Remover conversa ${conversation.display_id}`} onClick={() => void remove(conversation.id)}><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
        {conversations.length === 0 && <p className="deal-empty-note">Nenhuma conversa associada.</p>}
      </section>
      <section className="deal-conversation-panel" aria-label={t('dealConversation.panelLabel')} data-slot="deal-conversation-panel">
        {selected ? (
          <EmbeddedConversation key={selected.id} conversationId={selected.id} />
        ) : (
          <div className="deal-detail-empty">
            <span className="deal-empty-icon" aria-hidden="true"><MessageSquare className="h-6 w-6" /></span>
            <p><strong>{t('dealConversation.selectTitle')}</strong><br />{t('dealConversation.selectHint')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
