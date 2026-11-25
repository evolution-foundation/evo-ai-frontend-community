import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, EyeOff, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system';
import MessageList from '@/components/chat/messages/MessageList';
import ReplyPreview from '@/components/chat/messages/ReplyPreview';
import chatService from '@/services/chat/chatService';
import { extractMessagesData } from '@/utils/chat/responseHelpers';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { Conversation, Message } from '@/types/chat/api';

const SPY_KEY = 'evo.dealConversation.spy';
const POLL_MS = 10000;

const readSpy = () => {
  try {
    return localStorage.getItem(SPY_KEY) === '1';
  } catch {
    return false;
  }
};

const messageKey = (message: Message) => String(message.id);
const mergeMessages = (current: Message[], incoming: Message[]) => {
  const map = new Map(current.map(message => [messageKey(message), message]));
  incoming.forEach(message => map.set(messageKey(message), message));
  return Array.from(map.values());
};

/**
 * Conversa do negócio embutida no kanban (aba Conversas e painel lateral), sem sair do quadro.
 * Reaproveita a lista de mensagens do chat (`MessageList`) mas não depende do ChatProvider
 * (que carrega a caixa inteira e marca como lida ao abrir). "Modo espião": abre e atualiza
 * sem marcar a conversa como lida; desligado, a conversa é marcada como lida ao abrir.
 */
export default function EmbeddedConversation({ conversationId, spyDefault, showOpenFull = true }: { conversationId: string; spyDefault?: boolean; showOpenFull?: boolean }) {
  const { t } = useLanguage('pipelines');
  const { can } = usePermissions();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [spy, setSpy] = useState(() => spyDefault ?? readSpy());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(conversationId);
  idRef.current = conversationId;
  const markedRef = useRef<string | null>(null);
  const oldestRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setMessages([]);
    try {
      const [conv, response] = await Promise.all([
        chatService.getConversation(conversationId).catch(() => null),
        chatService.getMessages(conversationId),
      ]);
      if (idRef.current !== conversationId) return;
      const list = extractMessagesData(response);
      setMessages(list);
      oldestRef.current = list.length ? String(list[0].id) : null;
      setHasMore(list.length >= 20);
      if (conv) setConversation(((conv as unknown as { data?: Conversation }).data ?? conv) as Conversation);
    } catch {
      if (idRef.current === conversationId) setError(true);
    } finally {
      if (idRef.current === conversationId) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setConversation(null);
    setReplyTo(null);
    markedRef.current = null;
    void load();
  }, [load]);

  // Atualização leve de mensagens novas enquanto o painel está aberto e visível.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || loading) return;
      void chatService
        .getMessages(conversationId)
        .then(response => {
          if (idRef.current !== conversationId) return;
          setMessages(current => mergeMessages(current, extractMessagesData(response)));
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [conversationId, loading]);

  // Fora do modo espião, abrir a conversa a marca como lida (uma vez por conversa).
  useEffect(() => {
    if (spy || loading || error || markedRef.current === conversationId) return;
    markedRef.current = conversationId;
    void chatService.markConversationAsRead(conversationId).catch(() => undefined);
  }, [spy, loading, error, conversationId]);

  const toggleSpy = () => {
    const next = !spy;
    setSpy(next);
    try {
      localStorage.setItem(SPY_KEY, next ? '1' : '0');
    } catch {
      /* preferência opcional */
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !oldestRef.current) return;
    setLoadingMore(true);
    void chatService
      .getMessages(conversationId, { before: oldestRef.current })
      .then(response => {
        const older = extractMessagesData(response);
        setMessages(current => mergeMessages(older, current));
        if (older.length) oldestRef.current = String(older[0].id);
        setHasMore(older.length >= 20);
      })
      .catch(() => toast.error(t('dealConversation.loadMoreError')))
      .finally(() => setLoadingMore(false));
  }, [conversationId, hasMore, loadingMore, t]);

  const canSend = can('conversations', 'update');
  const canReply = conversation?.can_reply ?? true;
  const send = async () => {
    const content = draft.trim();
    if (!content || sending || !canSend || !canReply) return;
    setSending(true);
    const quoted = replyTo;
    try {
      const sent = await chatService.sendMessage(conversationId, {
        content,
        message_type: 'outgoing',
        private: false,
        content_attributes: quoted ? { in_reply_to: quoted.id } : undefined,
      });
      // Se o painel já mostra outra conversa, o envio antigo não mexe nela.
      if (idRef.current !== conversationId) return;
      setMessages(current => mergeMessages(current, [sent]));
      setDraft('');
      setReplyTo(current => (current === quoted ? null : current));
    } catch {
      toast.error(t('dealConversation.sendError'));
    } finally {
      setSending(false);
    }
  };

  const startReply = (message: Message) => {
    setReplyTo(message);
    // O menu devolve o foco ao botão ao fechar; focar o compositor depois disso.
    window.setTimeout(() => composerRef.current?.focus(), 100);
  };

  const openFull = () => window.open(`/conversations/${conversationId}`, '_blank', 'noopener');

  return (
    <div className="deal-embedded-conversation" data-testid="embedded-conversation">
      <div className="deal-spy-bar">
        {spy ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        <span>{spy ? t('dealConversation.spyOn') : t('dealConversation.spyOff')}</span>
        <button type="button" className="deal-spy-toggle" aria-pressed={spy} onClick={toggleSpy}>
          {spy ? t('dealConversation.spyDisable') : t('dealConversation.spyEnable')}
        </button>
        {showOpenFull && (
          <button type="button" className="deal-spy-toggle" onClick={openFull} aria-label={t('dealConversation.openFullAria')}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {t('dealConversation.openFull')}
          </button>
        )}
      </div>
      <div className="deal-embedded-messages">
        {error ? (
          <div className="deal-detail-empty" role="alert">
            <p>{t('dealConversation.loadError')}</p>
            <Button size="sm" onClick={() => void load()}>{t('dealConversation.retry')}</Button>
          </div>
        ) : (
          <MessageList
            messages={messages}
            hasMoreMessages={hasMore}
            isLoadingMore={loadingMore}
            isInitialLoading={loading}
            onLoadMore={loadMore}
            onRetryMessage={() => undefined}
            onReplyToMessage={canSend && canReply ? startReply : undefined}
            onCopyMessage={message => void navigator.clipboard?.writeText(message.content || '')}
          />
        )}
      </div>
      {replyTo && canSend && canReply && (
        <div className="deal-embedded-reply">
          <ReplyPreview message={replyTo} isOwn={false} onCancel={() => setReplyTo(null)} />
        </div>
      )}
      <form className="deal-embedded-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
        {!canSend ? (
          <p className="deal-embedded-note">{t('dealConversation.noPermissionSend')}</p>
        ) : !canReply ? (
          <p className="deal-embedded-note">{t('dealConversation.cannotReply')}</p>
        ) : (
          <>
            <textarea
              ref={composerRef}
              value={draft}
              rows={2}
              aria-label={t('dealConversation.messageLabel')}
              placeholder={t('dealConversation.messagePlaceholder')}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="submit" size="sm" disabled={!draft.trim() || sending} aria-label={t('dealConversation.send')}>
              <Send className="h-4 w-4" />
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
