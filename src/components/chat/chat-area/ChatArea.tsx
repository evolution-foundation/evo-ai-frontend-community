/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';

import { useChatContext } from '@/contexts/chat/ChatContext';

import { useLanguage } from '@/hooks/useLanguage';
import { useConversationModerations } from '@/hooks/chat/useConversationModerations';
import { useAppDataStore } from '@/store/appDataStore';
import { normalizeToUnixSeconds } from '@/utils/time/timeHelpers';

import { MessageCircle } from 'lucide-react';

import { Button } from '@evoapi/design-system/button';

import { MessageSkeleton } from '../loading-states';
import { NoMessages } from '../empty-states';
import { MessageInput } from '../message-input';
import TypingIndicator from '../typing-indicator/TypingIndicator';
import MessageList from '../messages/MessageList';
import { Banner, ConversationNoteBanner } from '../banner';
import PendingResponseBanner from '../banner/PendingResponseBanner';

import type { Message, Conversation } from '@/types/chat/api';

interface PostData {
  id?: string;
  message?: string;
  story?: string;
  created_time?: string;
  permalink_url?: string;
  type?: string;
  from?: {
    id?: string;
    name?: string;
  };
  attachments?: {
    data?: Array<{
      media?: {
        image?: {
          src?: string;
        };
      };
      subattachments?: {
        data?: Array<{
          media?: {
            image?: {
              src?: string;
            };
          };
        }>;
      };
      type?: string;
    }>;
  };
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
}

interface SendMessageOptions {
  content: string;
  files?: File[];
  isPrivate?: boolean;
  templateParams?: any;
  cannedResponseId?: string | null;
}

interface ChatAreaProps {
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  selectedMessages: Message[];
  labels?: Array<{ id: string; title: string; color: string }>;
  onSendMessage: (options: SendMessageOptions) => Promise<void>;
  onLoadMore: () => void;
  onRetryMessage: (messageId: string) => void;
  isPendingConversation?: boolean;
  onOpenConversation?: () => void;
}

const ChatArea = ({
  selectedConversationId,
  selectedConversation,
  selectedMessages,
  labels = [],
  onSendMessage,
  onLoadMore,
  onRetryMessage,
  isPendingConversation = false,
}: ChatAreaProps) => {
  const { t } = useLanguage('chat');
  const { messages, websocket } = useChatContext();

  // Load moderations for this conversation
  const { pendingResponseModerations, loadModerations, messageModerationsMap } =
    useConversationModerations({
      conversationId: selectedConversationId,
      enabled: selectedConversation?.inbox?.channel_type === 'Channel::FacebookPage',
    });

  // Nota do atendimento (§3.4) = última mensagem privada da conversa — sem
  // entidade própria (ver spec-extraida.md). "Ocultar" é só estado de UI local
  // (a nota em si continua na timeline); reseta ao trocar de conversa.
  const lastPrivateNote = useMemo(
    () => [...selectedMessages].reverse().find(m => m.private),
    [selectedMessages],
  );
  const [hiddenNoteId, setHiddenNoteId] = useState<string | null>(null);
  const noteBannerVisible = !!lastPrivateNote && lastPrivateNote.id !== hiddenNoteId;

  const handleLoadMore = useCallback(() => {
    if (selectedConversationId) {
      onLoadMore();
    }
  }, [selectedConversationId, onLoadMore]);

  const handleSendMessage = useCallback(
    async (options: SendMessageOptions) => {
      await onSendMessage(options);
    },
    [onSendMessage],
  );

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      onRetryMessage(messageId);
    },
    [onRetryMessage],
  );

  const handleTypingStart = useCallback(() => {
    if (selectedConversationId) {
      websocket.sendTypingOn(selectedConversationId);
    }
  }, [selectedConversationId, websocket]);

  const handleTypingStop = useCallback(() => {
    if (selectedConversationId) {
      websocket.sendTypingOff(selectedConversationId);
    }
  }, [selectedConversationId, websocket]);

  const handleReplyToMessage = useCallback(
    (message: Message) => {
      messages.onReplyToMessage(message);
    },
    [messages],
  );

  const handleCopyMessage = useCallback(
    (message: Message) => {
      messages.onCopyMessage(message);
    },
    [messages],
  );

  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      if (selectedConversationId) {
        await messages.onDeleteMessage(selectedConversationId, message);
      }
    },
    [selectedConversationId, messages],
  );

  const handleCancelReply = useCallback(() => {
    messages.onCancelReply();
  }, [messages]);

  // 🎯 MESSAGING WINDOW RESTRICTIONS: Verificar se pode responder (WhatsApp, Instagram, Messenger)
  // Usar can_reply do backend que já calcula se está dentro da janela de 24 horas
  const canReply = selectedConversation?.can_reply ?? true;
  const channelType = selectedConversation?.inbox?.channel_type || '';

  // ⏰ can_reply do backend só é recalculado quando o WS empurra uma atualização da
  // conversa (nova mensagem, etc). Se o atendente fica com a aba aberta e a janela de
  // 24h expira "no relógio" sem nenhum evento novo, can_reply fica desatualizado e o
  // atendente nunca vê o aviso de bloqueio até recarregar. Para WhatsApp fora dos
  // providers de texto livre a janela é sempre 24h fixas (ver MessageWindowService),
  // então recalculamos aqui a partir da última mensagem recebida, com um tick a cada
  // minuto — não depende de nenhum evento chegar para ficar correto.
  const WHATSAPP_MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const lastIncomingMessage = useMemo(
    () => [...selectedMessages].reverse().find(m => m.message_type === 'incoming'),
    [selectedMessages],
  );
  const lastIncomingAtMs = lastIncomingMessage
    ? normalizeToUnixSeconds(lastIncomingMessage.created_at) * 1000
    : null;
  const windowExpiresAtMs =
    lastIncomingAtMs != null ? lastIncomingAtMs + WHATSAPP_MESSAGING_WINDOW_MS : null;
  const windowRemainingMs = windowExpiresAtMs != null ? windowExpiresAtMs - nowTick : null;

  // Detectar tipos de canal
  const isWhatsAppChannel = channelType === 'Channel::Whatsapp';
  const isInstagramChannel = channelType === 'Channel::Instagram';
  const isMessengerChannel = channelType === 'Channel::FacebookPage';

  // Buscar inbox para obter informações do canal (provider)
  const { inboxes, fetchInboxes, isLoadingInboxes } = useAppDataStore();
  const inboxesById = useMemo(() => new Map(inboxes.map(item => [item.id, item])), [inboxes]);
  const inbox = selectedConversation?.inbox_id
    ? inboxesById.get(selectedConversation.inbox_id) || null
    : null;
  const inboxRefreshRequestedRef = useRef<Set<string>>(new Set());

  // Verificar se é um canal WhatsApp free text (baileys, evolution, evolution_go)
  // Esses providers não têm restrição de janela de 24 horas
  // Buscar provider do meta, additional_attributes ou inbox
  const channelProviderRaw = selectedConversation?.inbox?.provider;

  const channelProvider = typeof channelProviderRaw === 'string' ? channelProviderRaw : '';

  // Recarregar inboxes quando uma conversa Z-API/Evolution é selecionada e o inbox não tem provider_connection
  useEffect(() => {
    const inboxId = selectedConversation?.inbox_id;
    if (!inboxId) return;

    const shouldRefreshProviderConnection =
      isWhatsAppChannel &&
      channelProvider &&
      ['zapi', 'evolution', 'evolution_go'].includes(channelProvider.toLowerCase()) &&
      inbox &&
      !(inbox as any)?.provider_connection;

    if (!shouldRefreshProviderConnection) {
      inboxRefreshRequestedRef.current.delete(inboxId);
      return;
    }

    if (isLoadingInboxes || inboxRefreshRequestedRef.current.has(inboxId)) {
      return;
    }

    inboxRefreshRequestedRef.current.add(inboxId);
    fetchInboxes(false)
      .catch(console.error)
      .finally(() => {
        // allow one more retry later if provider_connection is still missing
        setTimeout(() => inboxRefreshRequestedRef.current.delete(inboxId), 5000);
      });
  }, [
    selectedConversation?.inbox_id,
    isWhatsAppChannel,
    channelProvider,
    inbox,
    isLoadingInboxes,
    fetchInboxes,
  ]);

  const isWhatsAppFreeTextChannel =
    isWhatsAppChannel &&
    channelProvider &&
    ['baileys', 'evolution', 'evolution_go'].includes(channelProvider.toLowerCase());

  // Verificar status de conexão do Z-API e Evolution
  // Buscar provider_connection do meta ou inbox
  const providerConnection = (selectedConversation?.meta?.provider_connection ||
    (inbox as any)?.provider_connection) as { connection?: string; error?: string } | undefined;
  const isZapiChannel = isWhatsAppChannel && channelProvider?.toLowerCase() === 'zapi';
  const isEvolutionChannel =
    isWhatsAppChannel &&
    ['evolution', 'evolution_go'].includes(channelProvider?.toLowerCase() || '');
  const isDisconnected =
    (isZapiChannel || isEvolutionChannel) &&
    ['close', 'disconnected', 'logged_out'].includes(providerConnection?.connection || '');

  // Determinar se deve mostrar restrições
  const hasMessagingWindowRestriction =
    isWhatsAppChannel || isInstagramChannel || isMessengerChannel;
  // Para WhatsApp fora dos providers de texto livre, confiamos no relógio local (dado
  // preciso, ticka sozinho) em vez do can_reply do backend, que pode estar defasado —
  // ver comentário acima de windowRemainingMs. Nos demais canais (Instagram/Messenger,
  // cuja janela pode ser 24h ou 7 dias dependendo de config de servidor não exposta ao
  // front) seguimos confiando no can_reply do backend, como antes.
  const isWhatsAppWithKnownWindow =
    isWhatsAppChannel && !isWhatsAppFreeTextChannel && windowRemainingMs != null;
  const effectiveCanReply = isWhatsAppWithKnownWindow ? windowRemainingMs! > 0 : canReply;
  const shouldShowRestrictionBanner =
    (!effectiveCanReply && hasMessagingWindowRestriction && !isWhatsAppFreeTextChannel) ||
    isDisconnected;

  // Heads-up não bloqueante quando a janela está prestes a expirar (últimas 3h), só
  // quando temos o dado preciso da última mensagem recebida.
  const EXPIRING_SOON_THRESHOLD_MS = 3 * 60 * 60 * 1000;
  const shouldShowExpiringSoonWarning =
    isWhatsAppWithKnownWindow &&
    windowRemainingMs! > 0 &&
    windowRemainingMs! <= EXPIRING_SOON_THRESHOLD_MS &&
    !shouldShowRestrictionBanner;

  const formatDurationShort = (ms: number): string => {
    const totalMinutes = Math.max(1, Math.round(Math.abs(ms) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}min`;
  };

  // Mensagem do banner quando não pode responder
  const getBannerMessage = () => {
    if (isDisconnected) {
      const errorMessage = providerConnection?.error || '';
      return (
        errorMessage ||
        t(
          'chatArea.banner.whatsappDisconnected',
          'WhatsApp desconectado. Conecte o número para enviar mensagens.',
        )
      );
    }
    if (isWhatsAppChannel && !isWhatsAppFreeTextChannel) {
      if (isWhatsAppWithKnownWindow && windowRemainingMs! <= 0) {
        return t('chatArea.banner.whatsappMessageWithElapsed', {
          elapsed: formatDurationShort(windowRemainingMs!),
        });
      }
      return t('chatArea.banner.whatsappMessage');
    }
    if (isInstagramChannel || isMessengerChannel) {
      return t('chatArea.banner.cannotReply');
    }
    return t('chatArea.banner.cannotReply');
  };

  const getBannerLinkText = () => {
    // Não mostrar texto do link quando Z-API/Evolution está desconectado ou é canal free text
    // Esses providers não têm restrições de janela de 24 horas, apenas precisam estar conectados
    if (isDisconnected || isZapiChannel || isEvolutionChannel) {
      return undefined;
    }
    return t('chatArea.banner.linkText');
  };

  // Links externos para políticas de janela de mensagem
  // Não mostrar link quando Z-API/Evolution está desconectado (apenas aviso de desconexão)
  const getBannerLink = () => {
    // Se Z-API/Evolution está desconectado, não mostrar link de restrições de 24 horas
    // Esses providers não têm restrições de janela de 24 horas, apenas precisam estar conectados
    if (isDisconnected || isZapiChannel || isEvolutionChannel) {
      return undefined;
    }
    if (isWhatsAppChannel && !isWhatsAppFreeTextChannel) {
      // Link para política do WhatsApp Cloud/Twilio
      return 'https://developers.facebook.com/docs/whatsapp/messaging-limits';
    }
    if (isMessengerChannel) {
      // Link para política do Facebook Messenger
      return 'https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/#standard_messaging';
    }
    if (isInstagramChannel) {
      // Link para política do Instagram
      return 'https://developers.facebook.com/docs/messenger-platform/instagram/features/24-hour-policy';
    }
    return 'https://developers.facebook.com/docs/whatsapp/messaging-limits';
  };

  if (!selectedConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('chatArea.selectConversation.title')}</h3>
          <p className="text-muted-foreground">{t('chatArea.selectConversation.description')}</p>
        </div>
      </div>
    );
  }

  const typingUsers = websocket.getTypingUsers(selectedConversationId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/10">
      {/* 🎯 MESSAGING WINDOW RESTRICTIONS: Banner de aviso (WhatsApp, Instagram, Messenger) */}
      {/* Posicionado no topo, logo após o header, para máxima visibilidade */}
      {shouldShowRestrictionBanner && (
        <Banner
          bannerMessage={getBannerMessage()}
          hrefLink={getBannerLink()}
          hrefLinkText={getBannerLinkText()}
          colorScheme="alert"
        />
      )}

      {/* Heads-up não bloqueante: janela de 24h prestes a expirar (últimas 3h) */}
      {shouldShowExpiringSoonWarning && (
        <Banner
          bannerMessage={t('chatArea.banner.windowExpiringSoon', {
            remaining: formatDurationShort(windowRemainingMs!),
          })}
          colorScheme="warning"
        />
      )}

      {/* Nota do atendimento (Melhorias CRM Chat §3.4) — última mensagem privada
          da conversa, sempre visível quando existe. */}
      {noteBannerVisible && lastPrivateNote && (
        <ConversationNoteBanner
          key={selectedConversationId}
          note={lastPrivateNote}
          onHide={() => setHiddenNoteId(lastPrivateNote.id)}
        />
      )}

      {/* Messages Area */}
      {messages.isMessagesLoading(selectedConversationId) ? (
        <div className="p-4">
          <MessageSkeleton count={6} />
        </div>
      ) : messages.getMessagesError(selectedConversationId) ? (
        <div className="p-4 text-center">
          <div className="text-destructive mb-2">{t('chatArea.errors.loadMessages')}</div>
          <p className="text-sm text-muted-foreground mb-4">
            {messages.getMessagesError(selectedConversationId)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => messages.loadMessages(selectedConversationId)}
          >
            {t('chatArea.errors.tryAgain')}
          </Button>
        </div>
      ) : selectedMessages.length === 0 ? (
        <NoMessages />
      ) : (
        <>
          {/* Pending Response Banners */}
          {pendingResponseModerations.length > 0 && (
            <div className="px-4 pt-4 space-y-2">
              {pendingResponseModerations.map(moderation => (
                <PendingResponseBanner
                  key={moderation.id}
                  moderation={moderation}
                  onModerationUpdated={loadModerations}
                />
              ))}
            </div>
          )}

          <MessageList
            messages={selectedMessages}
            hasMoreMessages={messages.canLoadMore(selectedConversationId)}
            isLoadingMore={messages.isLoadingMore(selectedConversationId)}
            isInitialLoading={false}
            labels={labels}
            isPostConversation={
              selectedConversation?.additional_attributes?.conversation_type === 'post'
            }
            postData={
              selectedConversation?.additional_attributes?.post_data as PostData | undefined
            }
            messageModerations={messageModerationsMap}
            conversationId={selectedConversationId}
            onLoadMore={handleLoadMore}
            onRetryMessage={handleRetryMessage}
            onReplyToMessage={handleReplyToMessage}
            onCopyMessage={handleCopyMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </>
      )}

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input - Fixo na parte inferior */}
      <div className="flex-shrink-0 w-full">
        <MessageInput
          onSendMessage={handleSendMessage}
          placeholder={
            isPendingConversation
              ? t('chatArea.messageInput.pendingPlaceholder')
              : shouldShowRestrictionBanner
              ? t('chatArea.messageInput.restrictedPlaceholder')
              : t('chatArea.messageInput.defaultPlaceholder')
          }
          isDisabled={shouldShowRestrictionBanner}
          isPendingConversation={isPendingConversation}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          replyToMessage={messages.state.replyToMessage}
          onCancelReply={handleCancelReply}
          conversationId={selectedConversationId}
          inboxId={selectedConversation?.inbox_id || ''}
          channelType={selectedConversation?.inbox?.channel_type || ''}
          channelProvider={channelProvider}
        />
      </div>
    </div>
  );
};

export default ChatArea;
