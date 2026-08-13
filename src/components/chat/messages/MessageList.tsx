import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';

import { FacebookCommentModeration } from '@/types/channels/inbox';

import { useLanguage } from '@/hooks/useLanguage';

import { Button } from '@evoapi/design-system/button';
import { Avatar, AvatarImage, AvatarFallback } from '@evoapi/design-system/avatar';
import { Badge } from '@evoapi/design-system/badge';

import { ChevronDown, Loader2 } from 'lucide-react';

import MessageBubble from '@/components/chat/messages/MessageBubble';
import PostPreview from '@/components/chat/messages/PostPreview';
import SystemMessage from '@/components/chat/messages/SystemMessage';

import { Message, MESSAGE_TYPE } from '@/types/chat/api';

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

interface MessageListProps {
  messages: Message[];
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  labels?: Array<{ id: string; title: string; color: string }>;
  isPostConversation?: boolean;
  postData?: PostData;
  messageModerations?: Map<string, FacebookCommentModeration>; // Map of message_id -> moderation
  conversationId?: string | null; // Repassado pra resolver replies fora da página carregada
  onLoadMore: () => void;
  onRetryMessage: (messageId: string) => void;
  onReplyToMessage: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onDeleteMessage: (message: Message) => Promise<void>;
}

// Máximo de páginas antigas que carregamos automaticamente atrás de uma
// mensagem citada antes de desistir - evita loop infinito se a mensagem foi
// apagada ou pertence a outra conversa por algum dado inconsistente.
const MAX_JUMP_LOAD_ATTEMPTS = 40;

// Helper function para normalizar timestamp de mensagens (mesma lógica do MessagesContext)
const normalizeMessageTimestamp = (message: Message): number => {
  const createdAt = message.created_at;

  // Se já é número (Unix timestamp em segundos), retornar direto
  if (typeof createdAt === 'number') {
    return createdAt;
  }

  // Se é string numérica, converter para número
  if (typeof createdAt === 'string') {
    // Tentar parse direto se for string numérica
    const parsed = parseInt(createdAt, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    // Tentar parse como Date ISO string
    const dateParsed = new Date(createdAt).getTime() / 1000;
    if (!isNaN(dateParsed) && dateParsed > 0) {
      return dateParsed;
    }
  }

  // Fallback: usar timestamp atual (mensagem sem timestamp válido vai para o final)
  return Date.now() / 1000;
};

const getMessageTimestamp = (message: Message): number => {
  return normalizeMessageTimestamp(message);
};

// Igual ao MessagesContext: mensagens "em envio" (status progress) sempre por último
const compareMessagesByTimestamp = (a: Message, b: Message): number => {
  const aSending = a.status === 'progress';
  const bSending = b.status === 'progress';
  if (aSending && !bSending) return 1;
  if (!aSending && bSending) return -1;
  return getMessageTimestamp(a) - getMessageTimestamp(b);
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  hasMoreMessages,
  isLoadingMore,
  isInitialLoading,
  labels = [],
  isPostConversation = false,
  postData,
  messageModerations,
  conversationId = null,
  onLoadMore,
  onRetryMessage,
  onReplyToMessage,
  onCopyMessage,
  onDeleteMessage,
}) => {
  const { t } = useLanguage('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const conversationIdRef = useRef<string | null>(null);
  const hasInitialScrolled = useRef(false);
  const lastLoadTime = useRef(0); // ✅ Throttle do carregamento
  const isScrollLocked = useRef(false); // ✅ Bloquear scroll reset após inicial

  // "Jump to reply" (EVO reply-jump fix): a mensagem citada pode estar fora
  // da página atualmente carregada. pendingJumpMessageId dispara um loop de
  // onLoadMore() até ela aparecer no DOM (ou desistimos - ver
  // MAX_JUMP_LOAD_ATTEMPTS), então rola até ela.
  const [pendingJumpMessageId, setPendingJumpMessageId] = useState<string | null>(null);
  const jumpAttemptsRef = useRef(0);

  const scrollToMessageInDom = useCallback((messageId: string): boolean => {
    const el = scrollRef.current?.querySelector(
      `[data-message-id="${CSS.escape(messageId)}"]`,
    );
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }, []);

  const handleJumpToMessage = useCallback(
    (messageId: string) => {
      jumpAttemptsRef.current = 0;
      if (scrollToMessageInDom(messageId)) return;
      setPendingJumpMessageId(messageId);
    },
    [scrollToMessageInDom],
  );

  useEffect(() => {
    if (!pendingJumpMessageId) return;

    if (scrollToMessageInDom(pendingJumpMessageId)) {
      setPendingJumpMessageId(null);
      return;
    }

    if (isLoadingMore) return; // uma página já está a caminho, espera ela chegar

    if (!hasMoreMessages || jumpAttemptsRef.current >= MAX_JUMP_LOAD_ATTEMPTS) {
      // Mensagem não apareceu mesmo carregando tudo que dá (apagada, ou
      // de outra conversa) - desiste silenciosamente.
      setPendingJumpMessageId(null);
      return;
    }

    jumpAttemptsRef.current += 1;
    onLoadMore();
  }, [pendingJumpMessageId, messages, hasMoreMessages, isLoadingMore, onLoadMore, scrollToMessageInDom]);

  // 🎯 SCROLL POSITION SIMPLES (WhatsApp style)
  const scrollHeightRef = useRef(0);

  // 🎯 FLUXO SIMPLES: 1) Carrega → 2) Vai pro final → 3) Scroll pra cima sem mexer
  // 🔧 CORREÇÃO: Usar apenas primeira mensagem para detectar conversa, não recomputar sempre
  const firstMessage = messages.length > 0 ? messages[0] : null;

  const currentConversationId = useMemo(() => {
    return firstMessage?.conversation_id || null;
  }, [firstMessage?.conversation_id]);

  const { regularMessages, systemMessages } = useMemo(() => {
    const regular: Message[] = [];
    const system: Message[] = [];

    for (const msg of messages) {
      if (
        msg.message_type === MESSAGE_TYPE.ACTIVITY ||
        msg.message_type === MESSAGE_TYPE.TEMPLATE
      ) {
        system.push(msg);
      } else {
        regular.push(msg);
      }
    }

    return { regularMessages: regular, systemMessages: system };
  }, [messages]);

  const allOrderedMessages = useMemo(() => {
    const all = [...regularMessages, ...systemMessages];
    all.sort(compareMessagesByTimestamp);
    return all;
  }, [regularMessages, systemMessages]);

  // 🔄 TRANSIÇÃO DE CONVERSA: Detectar mudança e resetar estado APENAS quando conversa realmente muda
  useEffect(() => {
    if (currentConversationId && currentConversationId !== conversationIdRef.current) {
      // Reset state para nova conversa
      conversationIdRef.current = currentConversationId;
      hasInitialScrolled.current = false;
      lastLoadTime.current = 0;
      isScrollLocked.current = false;

      // 🧹 Reset scroll height ref
      scrollHeightRef.current = 0;

      setIsNearBottom(true);
    }
  }, [currentConversationId, isInitialLoading, messages.length]); // ✅ Incluir dependência necessária para lint

  // ✅ STEP 2: Scroll para final APENAS no carregamento inicial (BLOQUEADO ABSOLUTO!)
  useEffect(() => {
    if (
      !isInitialLoading &&
      messages.length > 0 &&
      !hasInitialScrolled.current && // 🔒 ÚNICA PROTEÇÃO NECESSÁRIA!
      conversationIdRef.current !== null
    ) {
      hasInitialScrolled.current = true; // 🚨 MARCAR COMO EXECUTADO IMEDIATAMENTE!

      const container = scrollRef.current;
      if (container) {
        requestAnimationFrame(() => {
          const targetScrollTop = container.scrollHeight - container.clientHeight;
          container.scrollTop = Math.max(0, targetScrollTop);
          isScrollLocked.current = true;

          setTimeout(() => {
            isScrollLocked.current = false;
          }, 2000);
        });
      }
    }
  }, [isInitialLoading, messages.length]);

  // 🎯 SCROLL ANCHOR: Manter posição na mensagem visível
  const anchorMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoadingMore && hasInitialScrolled.current) {
      // Encontrar primeira mensagem visível para usar como âncora
      const container = scrollRef.current;
      if (!container) return;

      const messageElements = container.querySelectorAll('[data-message-id]');
      for (const element of messageElements) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Se a mensagem está visível na tela
        if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
          anchorMessageIdRef.current = element.getAttribute('data-message-id');
          break;
        }
      }
    }
  }, [isLoadingMore]);

  useEffect(() => {
    if (!isLoadingMore && anchorMessageIdRef.current && hasInitialScrolled.current) {
      // Voltar para a mensagem âncora IMEDIATAMENTE após carregamento
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const anchorElement = document.querySelector(
            `[data-message-id="${anchorMessageIdRef.current}"]`,
          );
          if (anchorElement) {
            anchorElement.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
          anchorMessageIdRef.current = null;
        });
      });
    }
  }, [isLoadingMore]);

  // 🚀 STEP 4: Auto-scroll quando uma nova mensagem OUTGOING é enviada
  const lastMessageRef = useRef<Message | null>(null);
  useEffect(() => {
    if (messages.length === 0 || !hasInitialScrolled.current) return;

    const lastMessage = messages[messages.length - 1];

    // Auto-scroll quando usuário envia mensagem
    if (
      lastMessage &&
      lastMessageRef.current?.id !== lastMessage.id &&
      lastMessage.message_type === MESSAGE_TYPE.OUTGOING
    ) {
      const container = scrollRef.current;
      if (container) {
        requestAnimationFrame(() => {
          const targetScrollTop = container.scrollHeight - container.clientHeight;
          container.scrollTop = Math.max(0, targetScrollTop);
          setIsNearBottom(true);
        });
      }
    }

    lastMessageRef.current = lastMessage;
  }, [messages]);

  // ✅ HANDLE SCROLL: Carregamento automático como WhatsApp/Telegram
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const nearTop = scrollTop < 100; // Próximo ao topo

      setIsNearBottom(nearBottom);

      // 🚀 SCROLL INFINITO: Carregar mais quando chega perto do topo (como WhatsApp)
      if (nearTop && hasMoreMessages && !isLoadingMore && hasInitialScrolled.current) {
        const now = Date.now();
        if (now - lastLoadTime.current > 1000) {
          // Throttle de 1 segundo
          lastLoadTime.current = now;
          onLoadMore();
        }
      }
    },
    [hasMoreMessages, isLoadingMore, onLoadMore],
  );

  // ✅ SCROLL TO BOTTOM: Simples e direto
  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
      setIsNearBottom(true);
    }
  }, []);

  // Loading durante carregamento inicial
  if (isInitialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">{t('messages.messageList.loadingConversation')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden p-4"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'auto' }}
      >
        <div className="space-y-3">
          {/* Loading indicator para scroll infinito */}

          {/* Loading mensagens antigas */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t('messages.messageList.loadingPrevious')}</span>
              </div>
            </div>
          )}

          {/* Início da conversa */}
          {!hasMoreMessages && messages.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"></div>
                {t('messages.messageList.conversationStart')}
              </div>
            </div>
          )}

          {/* Preview do Post (apenas para conversas de post) */}
          {isPostConversation && postData && <PostPreview postData={postData} />}

          {/* Lista de mensagens */}
          {(() => {
            // 🧵 Agrupar mensagens por thread para conversas de post (suporta respostas aninhadas)
            if (isPostConversation) {
              // Encontrar mensagens raiz (sem in_reply_to ou in_reply_to_external_id) e suas respostas
              const rootMessages: Message[] = [];
              const replyMap = new Map<string, Message[]>();

              // Criar mapa de source_id e ID para busca rápida
              const sourceIdMap = new Map<string, Message>();
              const idMap = new Map<string, Message>();
              regularMessages.forEach(msg => {
                if (msg.source_id) {
                  sourceIdMap.set(msg.source_id, msg);
                }
                idMap.set(String(msg.id), msg);
              });

              regularMessages.forEach(msg => {
                const replyToId = msg.content_attributes?.in_reply_to;
                const replyToExternalId = msg.content_attributes?.in_reply_to_external_id;

                // Tentar encontrar mensagem pai usando in_reply_to (ID interno) ou in_reply_to_external_id (source_id)
                let parentMessage: Message | undefined;

                // Primeiro tentar por ID interno
                if (replyToId) {
                  parentMessage = idMap.get(String(replyToId));
                }

                // Se não encontrou por ID interno, tentar por external_id (source_id) como fallback
                if (!parentMessage && replyToExternalId) {
                  parentMessage = sourceIdMap.get(String(replyToExternalId));
                }

                if (parentMessage) {
                  const parentId = parentMessage.id;
                  if (!replyMap.has(parentId)) {
                    replyMap.set(parentId, []);
                  }
                  replyMap.get(parentId)!.push(msg);
                } else {
                  // Sem pai encontrado = mensagem raiz
                  rootMessages.push(msg);
                }
              });

              rootMessages.sort(compareMessagesByTimestamp);

              // Função recursiva para renderizar respostas aninhadas
              const renderReplies = (parentId: string, depth: number = 0): React.ReactNode[] => {
                const replies = replyMap.get(parentId) || [];
                if (replies.length === 0) return [];

                replies.sort(compareMessagesByTimestamp);

                return replies.map((reply, replyIndex) => {
                  const isOutgoingReply = reply.message_type === MESSAGE_TYPE.OUTGOING;
                  const isBotReply = reply.sender?.type === 'agent_bot';
                  const isAgentReply = reply.sender?.type === 'user' || (isOutgoingReply && !isBotReply);
                  const isFromBotReply = isOutgoingReply && isBotReply;
                  const isFromAgentReply = isOutgoingReply && isAgentReply;

                  // Renderizar respostas aninhadas recursivamente
                  const nestedReplies = renderReplies(reply.id, depth + 1);
                  const isLastReply = replyIndex === replies.length - 1 && nestedReplies.length === 0;

                  return (
                    <div key={`reply-${reply.id}`} data-message-id={reply.id} className="flex items-start gap-2 relative">
                      {/* Linha conectora vertical estilo Facebook */}
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border/40 dark:bg-border/30" />

                      {/* Avatar pequeno para replies */}
                      <Avatar className="w-6 h-6 flex-shrink-0 ml-2 relative z-10">
                        <AvatarImage src={reply.sender?.thumbnail} />
                        <AvatarFallback className={isFromBotReply ? 'bg-purple-100 text-purple-700 text-xs' : isFromAgentReply ? 'bg-green-100 text-green-800 text-xs' : 'text-xs'}>
                          {isFromBotReply ? '🤖' : reply.sender?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 ml-2">
                        {/* Nome do remetente */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground hover:underline cursor-pointer">
                            {reply.sender?.name || t('messages.messageBubble.userFallback')}
                          </span>
                          {isFromAgentReply && (
                            <Badge variant="outline" className="h-3 px-1 text-[9px] bg-green-200 text-green-900 border-green-400 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">
                              {t('messages.messageBubble.agent.badge')}
                            </Badge>
                          )}
                        </div>

                        {/* Conteúdo da resposta */}
                        <MessageBubble
                          message={reply}
                          isOwn={false}
                          isFromBot={isFromBotReply}
                          isFromAgent={isFromAgentReply}
                          showAvatar={false}
                          showTimestamp={isLastReply}
                          labels={labels}
                          allMessages={messages}
                          conversationId={conversationId}
                          onJumpToMessage={handleJumpToMessage}
                          isPostConversation={isPostConversation}
                          isThreadReply={true}
                          isFacebookStyle={true}
                          onRetry={() => onRetryMessage(reply.id)}
                          onReply={onReplyToMessage}
                          onCopy={onCopyMessage}
                          onDelete={onDeleteMessage}
                        />

                        {/* Renderizar respostas aninhadas recursivamente */}
                        {nestedReplies.length > 0 && (
                          <div className="ml-8 mt-2 space-y-2">
                            {nestedReplies}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              };

              const allPostMessages = [...rootMessages, ...systemMessages].sort(compareMessagesByTimestamp);

              // Renderizar mensagens agrupadas (estilo Facebook - tudo alinhado à esquerda)
              return allPostMessages.map((message) => {
                // Mensagens de sistema são renderizadas separadamente
                if (message.message_type === MESSAGE_TYPE.ACTIVITY || message.message_type === MESSAGE_TYPE.TEMPLATE) {
                  return (
                    <div key={`system-${message.id}`} data-message-id={message.id} className="mb-4">
                      <SystemMessage message={message} labels={labels} />
                    </div>
                  );
                }

                // Mensagens regulares - usar rootMessage para compatibilidade
                const rootMessage = message;
                const isOutgoingRoot = rootMessage.message_type === MESSAGE_TYPE.OUTGOING;
                const isBotRoot = rootMessage.sender?.type === 'agent_bot';
                const isAgentRoot = rootMessage.sender?.type === 'user' || (isOutgoingRoot && !isBotRoot);
                const isFromBotRoot = isOutgoingRoot && isBotRoot;
                const isFromAgentRoot = isOutgoingRoot && isAgentRoot;
                const replies = renderReplies(rootMessage.id);

                return (
                  <div key={`thread-${rootMessage.id}`} className="mb-4">
                    {/* Mensagem raiz - estilo Facebook (sempre à esquerda) */}
                    <div data-message-id={rootMessage.id} className="flex items-start gap-2">
                      {/* Avatar sempre visível */}
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={rootMessage.sender?.thumbnail} />
                        <AvatarFallback className={isFromBotRoot ? 'bg-purple-100 text-purple-700' : isFromAgentRoot ? 'bg-green-100 text-green-800' : ''}>
                          {isFromBotRoot ? '🤖' : rootMessage.sender?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Nome do remetente */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                            {rootMessage.sender?.name || t('messages.messageBubble.userFallback')}
                          </span>
                          {isFromAgentRoot && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-200 text-green-900 border-green-400 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">
                              {t('messages.messageBubble.agent.badge')}
                            </Badge>
                          )}
                          {isFromBotRoot && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700">
                              {t('messages.messageBubble.bot.badge')}
                            </Badge>
                          )}
                        </div>

                        {/* Conteúdo da mensagem */}
                        <MessageBubble
                          message={rootMessage}
                          isOwn={false}
                          isFromBot={isFromBotRoot}
                          isFromAgent={isFromAgentRoot}
                          showAvatar={false}
                          showTimestamp={true}
                          labels={labels}
                          allMessages={messages}
                          conversationId={conversationId}
                          onJumpToMessage={handleJumpToMessage}
                          isPostConversation={isPostConversation}
                          isThreadRoot={true}
                          isFacebookStyle={true}
                          onRetry={() => onRetryMessage(rootMessage.id)}
                          onReply={onReplyToMessage}
                          onCopy={onCopyMessage}
                          onDelete={onDeleteMessage}
                        />
                      </div>
                    </div>

                    {/* Respostas agrupadas (threading visual estilo Facebook - suporta aninhamento) */}
                    {replies.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2">
                        {replies}
                      </div>
                    )}
                  </div>
                );
              });
            }

            return allOrderedMessages.map((message, index) => {
              // Mensagens de sistema são renderizadas separadamente
              if (message.message_type === MESSAGE_TYPE.ACTIVITY || message.message_type === MESSAGE_TYPE.TEMPLATE) {
                return (
                  <div key={`system-${message.id}-${index}`} data-message-id={message.id}>
                    <SystemMessage message={message} labels={labels} />
                  </div>
                );
              }

              const isIncoming = message.message_type === MESSAGE_TYPE.INCOMING;
              const isOutgoing = message.message_type === MESSAGE_TYPE.OUTGOING;
              const isBot = message.sender?.type === 'agent_bot';
              const isAgent = message.sender?.type === 'user' || (isOutgoing && !isBot);
              const isOwn = isOutgoing;
              const isFromBot = isOutgoing && isBot;
              const isFromAgent = isOutgoing && isAgent;
              const showAvatar = isIncoming;

              // Get moderation for this message
              const moderation = messageModerations?.get(message.id);

              return (
                <div key={`${message.id}-${index}`} data-message-id={message.id}>
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    isFromBot={isFromBot}
                    isFromAgent={isFromAgent}
                    showAvatar={showAvatar}
                    showTimestamp={true}
                    labels={labels}
                    allMessages={messages}
                    conversationId={conversationId}
                    onJumpToMessage={handleJumpToMessage}
                    isPostConversation={isPostConversation}
                    moderation={moderation}
                    onRetry={() => onRetryMessage(message.id)}
                    onReply={onReplyToMessage}
                    onCopy={onCopyMessage}
                    onDelete={onDeleteMessage}
                  />
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Botão voltar ao final */}
      {!isNearBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg border bg-background/95 backdrop-blur-sm hover:bg-accent"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessageList;
