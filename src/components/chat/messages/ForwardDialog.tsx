import { useEffect, useRef, useState } from 'react';
import { Forward, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system/button';
import { Input } from '@evoapi/design-system/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@evoapi/design-system/dialog';
import chatService from '@/services/chat/chatService';
import searchService from '@/services/chat/searchService';
import { useAppDataStore } from '@/store/appDataStore';
import { useLanguage } from '@/hooks/useLanguage';
import { MAX_FORWARD_TARGETS } from '@/components/chat/messages/utils/forward';
import type { Message } from '@/types/chat/api';
import type { SearchConversationResult } from '@/types/chat/search';

const SEARCH_DELAY_MS = 300;
const REFUSALS = ['invalid_target', 'unsupported_channel', 'unsupported_message', 'unsupported_content', 'creation_failed'];

interface ForwardDialogProps {
  /** Conversa de origem. */
  conversationId: string;
  message: Message;
  onClose: () => void;
  /** Cópias criadas (o envio ao WhatsApp é assíncrono). */
  onForwarded?: (copies: Message[]) => void;
}

interface Target {
  id: string;
  name: string;
}

const targetName = (conversation: SearchConversationResult) => conversation.contact?.name || `#${conversation.display_id}`;

const refusalOf = (error: unknown) => {
  const details = (error as { response?: { data?: { error?: { details?: string } } } })?.response?.data?.error?.details;
  return details && REFUSALS.includes(details) ? details : 'generic';
};

/** Escolhe de 1 a 5 conversas de WhatsApp e encaminha a mensagem. Usado no chat e no painel do funil. */
export default function ForwardDialog({ conversationId, message, onClose, onForwarded }: ForwardDialogProps) {
  const { t } = useLanguage('chat');
  const { inboxes, fetchInboxes } = useAppDataStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchConversationResult[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selected, setSelected] = useState<Target[]>([]);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    void fetchInboxes();
  }, [fetchInboxes]);

  useEffect(() => {
    const controller = new AbortController();
    setResults(null);
    setSearchFailed(false);
    const timer = window.setTimeout(
      () => {
        searchService
          .searchConversations({ q: query.trim() }, controller.signal)
          .then(response => {
            if (!controller.signal.aborted) setResults(response.conversations ?? []);
          })
          .catch(() => {
            if (!controller.signal.aborted) setSearchFailed(true);
          });
      },
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // A busca não informa o provedor; ele vem da lista de caixas.
  const evolutionInboxes = new Set(
    inboxes.filter(inbox => String(inbox.provider).toLowerCase() === 'evolution').map(inbox => String(inbox.id)),
  );
  const options = results?.filter(
    item => item.inbox?.channel_type === 'Channel::Whatsapp' && evolutionInboxes.has(String(item.inbox.id)),
  );
  const full = selected.length >= MAX_FORWARD_TARGETS;

  const toggle = (target: Target) => {
    setRefusal(null);
    setSelected(current =>
      current.some(item => item.id === target.id)
        ? current.filter(item => item.id !== target.id)
        : current.length < MAX_FORWARD_TARGETS
          ? [...current, target]
          : current,
    );
  };

  const submit = async () => {
    if (sendingRef.current || !selected.length) return;
    sendingRef.current = true;
    setSending(true);
    setRefusal(null);
    try {
      const copies = await chatService.forwardMessage(conversationId, message.id, selected.map(item => item.id));
      toast.success(t('messages.forward.sent', { names: selected.map(item => item.name).join(', ') }));
      onForwarded?.(copies);
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
      setSending(false);
      sendingRef.current = false;
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && !sendingRef.current && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{t('messages.forward.title')}</DialogTitle>
          <DialogDescription>{t('messages.forward.description', { max: MAX_FORWARD_TARGETS })}</DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label={t('messages.forward.search')}
          placeholder={t('messages.forward.search')}
        />

        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {selected.map(target => (
              <li key={target.id}>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => toggle(target)}
                  aria-label={t('messages.forward.remove', { name: target.name })}
                  className="flex max-w-[12rem] items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground"
                >
                  <span className="truncate">{target.name}</span>
                  <X className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="h-64 overflow-y-auto rounded-md border">
          {searchFailed ? (
            <p className="p-3 text-sm text-destructive">{t('messages.forward.searchError')}</p>
          ) : !options ? (
            <p className="p-3 text-sm text-muted-foreground">{t('messages.forward.searching')}</p>
          ) : !options.length ? (
            <p className="p-3 text-sm text-muted-foreground">{t('messages.forward.empty')}</p>
          ) : (
            <ul>
              {options.map(item => {
                const checked = selected.some(target => target.id === item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted has-[:disabled]:cursor-default has-[:disabled]:opacity-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 flex-shrink-0 accent-primary"
                        checked={checked}
                        disabled={sending || (full && !checked)}
                        onChange={() => toggle({ id: item.id, name: targetName(item) })}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{targetName(item)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[item.contact?.phone_number, item.inbox?.name].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {refusal && (
          <p role="alert" className="text-sm text-destructive">
            {t(`messages.forward.errors.${refusal}`)}
          </p>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {t('messages.forward.selected', { total: selected.length, max: MAX_FORWARD_TARGETS })}
          </span>
          <Button type="button" onClick={() => void submit()} disabled={!selected.length || sending}>
            <Forward className="mr-2 h-4 w-4" aria-hidden="true" />
            {sending ? t('messages.forward.sending') : t('messages.forward.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
