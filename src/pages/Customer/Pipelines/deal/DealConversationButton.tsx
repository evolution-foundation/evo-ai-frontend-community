import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@evoapi/design-system';
import { pipelinesService } from '@/services/pipelines';
import { useLanguage } from '@/hooks/useLanguage';
import type { DealConversationReason, DealConversationStatus, DealConversationSummary, WhatsappInboxInfo } from '@/types/analytics/pipelines';

export function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.2 15.04l-.3-.18-3.06.88.9-2.98-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.1 3.9c-.2 0-.5.07-.75.35-.26.28-1 1-1 2.4s1.03 2.8 1.18 3c.14.19 2 3.2 4.95 4.37 2.45.97 2.95.78 3.48.73.53-.05 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.33-.28-.14-1.7-.84-1.97-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.9 1.13-.17.2-.33.22-.62.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.4-1.68-1.57-1.96-.16-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.17.19-.28.29-.47.1-.2.05-.36-.02-.5-.07-.15-.64-1.58-.88-2.15-.23-.55-.47-.48-.64-.49h-.55Z" />
    </svg>
  );
}

const REASON_KEY: Record<DealConversationReason, string> = {
  no_contact: 'noContact',
  no_inbox_configured: 'noInbox',
  contact_without_phone: 'noPhone',
  contact_blocked: 'blocked',
};

const ERROR_KEY: Record<string, string> = {
  NO_INBOX_CONFIGURED: 'noInbox',
  NO_CONTACT: 'noContact',
  CONTACT_WITHOUT_PHONE: 'noPhone',
  CONTACT_BLOCKED: 'blocked',
  INBOX_REQUIRED: 'inboxRequired',
  INBOX_NOT_ALLOWED: 'inboxNotAllowed',
  CHANNEL_DISCONNECTED: 'disconnected',
};

const errorCode = (error: unknown): string | undefined =>
  (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;

export function summaryFromStatus(status: DealConversationStatus): DealConversationSummary {
  return {
    has_active: status.has_active,
    conversation_id: status.conversation?.id ?? null,
    display_id: status.conversation?.display_id ?? null,
    status: status.conversation?.status ?? null,
    last_activity_at: status.conversation?.last_activity_at ?? null,
    can_start: status.can_start,
    reason: status.reason ?? null,
    allowed_inbox_count: status.allowed_inboxes.length,
  };
}

export interface DealConversationButtonProps {
  dealId: string;
  /** Resumo vindo do cartão (S3). Sem ele (cabeçalho do modal) o estado é buscado. */
  summary?: DealConversationSummary | null;
  variant?: 'card' | 'header';
  canConfigure?: boolean;
  onOpenConversation: (conversationId: string, displayId?: number | string | null) => void;
  onConfigureNumbers?: () => void;
  onChanged?: (summary: DealConversationSummary) => void;
}

/** Ação rápida de conversa: abrir a ativa, iniciar uma (com escolha de número) ou explicar por que não dá. */
export default function DealConversationButton({ dealId, summary: summaryProp, variant = 'card', canConfigure = false, onOpenConversation, onConfigureNumbers, onChanged }: DealConversationButtonProps) {
  const { t } = useLanguage('pipelines');
  const [fetched, setFetched] = useState<DealConversationSummary | null>(null);
  const [local, setLocal] = useState<DealConversationSummary | null>(null);
  const [dialog, setDialog] = useState(false);
  const [status, setStatus] = useState<DealConversationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [inboxId, setInboxId] = useState('');
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const summary = local ?? summaryProp ?? fetched;

  useEffect(() => {
    setLocal(null);
  }, [summaryProp]);

  useEffect(() => {
    if (summaryProp || variant !== 'header') return;
    let alive = true;
    void pipelinesService.getDealConversationStatus(dealId).then(next => alive && setFetched(summaryFromStatus(next))).catch(() => undefined);
    return () => { alive = false; };
  }, [dealId, summaryProp, variant]);

  const apply = useCallback((next: DealConversationSummary) => {
    setLocal(next);
    onChanged?.(next);
  }, [onChanged]);

  const openDialog = async () => {
    setDialog(true);
    setProblem(null);
    setLoadingStatus(true);
    try {
      const next = await pipelinesService.getDealConversationStatus(dealId);
      setStatus(next);
      setInboxId(next.default_inbox_id || (next.allowed_inboxes.length === 1 ? next.allowed_inboxes[0].id : ''));
      if (next.has_active && next.conversation) {
        // alguém iniciou enquanto o cartão estava aberto: apenas abre
        apply(summaryFromStatus(next));
        setDialog(false);
        onOpenConversation(next.conversation.id, next.conversation.display_id);
      }
    } catch {
      setProblem(t('dealConversation.statusError'));
    } finally {
      setLoadingStatus(false);
    }
  };

  const click = () => {
    if (!summary) return;
    if (summary.has_active && summary.conversation_id) {
      onOpenConversation(summary.conversation_id, summary.display_id);
      return;
    }
    void openDialog();
  };

  const state: 'open' | 'start' | 'blocked' | 'loading' = !summary ? 'loading' : summary.has_active ? 'open' : summary.can_start ? 'start' : 'blocked';
  const reason = summary?.reason ?? status?.reason ?? null;
  const reasonText = reason ? t(`dealConversation.reasons.${REASON_KEY[reason]}`) : '';
  const label = state === 'open' ? t('dealConversation.open') : t('dealConversation.start');
  const tip = state === 'blocked' && reasonText ? `${label}: ${reasonText}` : label;

  const selected = useMemo<WhatsappInboxInfo | undefined>(() => status?.allowed_inboxes.find(item => item.id === inboxId), [status, inboxId]);
  const multiple = (status?.allowed_inboxes.length ?? 0) > 1;
  const blockedByStatus = status && !status.can_start && !status.has_active;

  const confirm = async () => {
    setStarting(true);
    setProblem(null);
    try {
      const result = await pipelinesService.startDealConversation(dealId, inboxId || undefined);
      const id = result.conversation?.id || result.conversation_id;
      apply(summaryFromStatus(result));
      toast.success(result.created === false ? t('dealConversation.alreadyExisted') : t('dealConversation.created'));
      setDialog(false);
      if (id) onOpenConversation(String(id), result.conversation?.display_id);
    } catch (error) {
      const code = errorCode(error);
      setProblem(code && ERROR_KEY[code] ? t(`dealConversation.errors.${ERROR_KEY[code]}`) : t('dealConversation.errors.generic'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`deal-conversation-action is-${variant} is-${state}`}
        aria-label={tip}
        title={tip}
        aria-disabled={state === 'blocked' || state === 'loading' ? true : undefined}
        data-state={state}
        data-testid="deal-conversation-action"
        onClick={click}
        onPointerDown={event => event.stopPropagation()}
      >
        {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <WhatsappIcon className="h-4 w-4" />}
        <span className="deal-conversation-action-text">{label}</span>
      </button>
      <Dialog open={dialog} onOpenChange={open => { if (!open && !starting) setDialog(false); }}>
        <DialogContent className="sm:max-w-md deal-conversation-dialog">
          <DialogHeader>
            <DialogTitle>{state === 'blocked' || blockedByStatus ? t('dealConversation.blockedTitle') : t('dealConversation.startTitle')}</DialogTitle>
            <DialogDescription>
              {state === 'blocked' || blockedByStatus ? reasonText : t('dealConversation.startDescription', { name: status?.contact?.name || '', phone: status?.contact?.phone_number || '' })}
            </DialogDescription>
          </DialogHeader>
          {loadingStatus && <p className="deal-empty-note" role="status"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />{t('dealConversation.loading')}</p>}
          {!loadingStatus && status && !blockedByStatus && state !== 'blocked' && (
            <fieldset className="deal-inbox-choices">
              <legend>{multiple ? t('dealConversation.chooseNumber') : t('dealConversation.number')}</legend>
              {status.allowed_inboxes.map(inbox => (
                <label key={inbox.id} className={`deal-inbox-choice${inbox.connected ? '' : ' is-off'}`}>
                  <input type="radio" name="deal-inbox" value={inbox.id} checked={inboxId === inbox.id} disabled={!inbox.connected} onChange={() => setInboxId(inbox.id)} />
                  <span>
                    <strong>{inbox.name}</strong>
                    <small>{inbox.phone_number || ''}{inbox.is_default ? ` · ${t('dealConversation.default')}` : ''}{inbox.connected ? '' : ` · ${t('dealConversation.disconnected')}`}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {problem && <p className="deal-dialog-error" role="alert">{problem}</p>}
          <DialogFooter>
            {(state === 'blocked' || blockedByStatus) && reason === 'no_inbox_configured' && canConfigure && onConfigureNumbers && (
              <Button onClick={() => { setDialog(false); onConfigureNumbers(); }}>{t('dealConversation.configureNumbers')}</Button>
            )}
            {(state === 'blocked' || blockedByStatus) && reason === 'no_inbox_configured' && !canConfigure && (
              <p className="deal-empty-note">{t('dealConversation.askAdmin')}</p>
            )}
            <Button variant="outline" onClick={() => setDialog(false)} disabled={starting}>{t('dealConversation.cancel')}</Button>
            {!blockedByStatus && state !== 'blocked' && (
              <Button onClick={() => void confirm()} disabled={starting || loadingStatus || !status || !inboxId || (selected ? !selected.connected : false)}>
                {starting ? t('dealConversation.starting') : t('dealConversation.confirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
