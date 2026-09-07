// src/hooks/widget/useWidgetRealtime.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, Dispatch, SetStateAction, RefObject } from 'react';
import { WidgetCable } from '@/services/widget/widgetCable';
import { postParent } from '@/utils/widget/postParent';
import { transformMessage, mapAndRegisterMessages } from '@/utils/widget/messages';

import type { MessageItem } from '@/components/widget/MessageList';
import type { ConversationStatus } from '@/types/settings/widgetConfig';

type UseWidgetRealtimeParams = {
  pubsubToken: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
  uiAvatarUrl?: string;

  conversationIdRef: RefObject<number | null>;
  setConversationIdSync: (id: number | null) => void;

  setMessages: Dispatch<SetStateAction<MessageItem[]>>;
  setMessagesWithPagination: (msgs: MessageItem[]) => void;

  processedMessageIds: RefObject<Set<string>>;
  setConversationStatus: Dispatch<SetStateAction<ConversationStatus>>;
  setOnline: (online: boolean) => void;
  setHasStarted: (started: boolean) => void;
  setIsCreatingConversation: (loading: boolean) => void;

  cableRef: RefObject<WidgetCable | null>;
};

export function useWidgetRealtime({
  pubsubToken,
  t,
  uiAvatarUrl,
  conversationIdRef,
  setConversationIdSync,
  setMessages,
  setMessagesWithPagination,
  processedMessageIds,
  setConversationStatus,
  setOnline,
  setHasStarted,
  setIsCreatingConversation,
  cableRef,
}: UseWidgetRealtimeParams) {
  useEffect(() => {
    if (!pubsubToken || cableRef.current) return;

    const cable = new WidgetCable(pubsubToken, {
      onMessage: async payload => {
        try {
          const evt = (payload as any)?.event;
          const data = (payload as any)?.data || (payload as any)?.message || payload;

          if (!data) return;

          if (evt === 'message.created') {
            const messageId = String(data?.id || Math.random());
            const msgConversationId = data?.conversation_id;

            // 1️⃣ Se já temos uma conversa ativa, ignoramos mensagens de outras conversas
            if (
              conversationIdRef.current &&
              msgConversationId &&
              msgConversationId !== conversationIdRef.current
            ) {
              return;
            }

            // 2️⃣ Se ainda não temos conversa, adotamos a primeira que chegar
            //    (mas só nessa situação)
            if (!conversationIdRef.current && msgConversationId) {
              setConversationIdSync(msgConversationId);

              if (typeof window !== 'undefined') {
                sessionStorage.setItem(
                  'evo_widget_conversation_id',
                  msgConversationId.toString(),
                );
              }
            }


            // echo do contato (message_type 0 + sender_type Contact)
            if (data?.message_type === 0 && data?.sender_type === 'Contact') {
              const txt = data?.content || '';
              setMessages(prev => {
                const pendingMessage = prev.find(
                  m =>
                    (m.status === 'sending' || m.status === 'sent') &&
                    m.text === txt &&
                    m.type === 'out',
                );

                if (pendingMessage) {
                  let replyTo = pendingMessage.replyTo;

                  if (data?.content_attributes?.in_reply_to && !replyTo) {
                    const replyToId = data.content_attributes.in_reply_to;
                    const originalMessage = prev.find(m => m.id === replyToId);
                    if (originalMessage && !originalMessage.isSystem) {
                      replyTo = {
                        id: replyToId,
                        text: originalMessage.text,
                        sender:
                          originalMessage.type === 'out'
                            ? t('chat.you')
                            : originalMessage.sender?.name || t('chat.agent'),
                        type: originalMessage.type as 'in' | 'out',
                      };
                    }
                  }

                  return prev.map(m =>
                    m.id === pendingMessage.id ? { ...m, status: 'sent' as const, replyTo } : m,
                  );
                }

                const newMessage = transformMessage(
                  {
                    ...data,
                    id: messageId,
                    content: txt,
                    created_at: data?.created_at,
                    message_type: 0,
                  },
                  prev,
                  { t, avatarUrl: uiAvatarUrl },
                );
                return [...prev, newMessage];
              });

              return;
            }

            if (data?.message_type === undefined || data?.message_type === null) {
              return;
            }

            const txt = data?.content || '';
            const hasAttachments = data?.attachments && data.attachments.length > 0;
            if (!txt && !hasAttachments) {
              return;
            }

            if (processedMessageIds.current.has(messageId)) {
              return;
            }
            processedMessageIds.current.add(messageId);

            setMessages(prev => {
              if (
                data?.conversation_id &&
                conversationIdRef.current &&
                data.conversation_id !== conversationIdRef.current
              ) {
                return prev;
              }

              if (data?.message_type === 1) {
                const isFromAgent =
                  data?.performer?.type === 'user' || data?.sender_type === null;

                if (isFromAgent) {
                  const newMessage = transformMessage(
                    {
                      ...data,
                      id: messageId,
                      content: txt,
                      created_at: data?.created_at,
                      message_type: 1,
                    },
                    prev,
                    { t, avatarUrl: uiAvatarUrl },
                  );

                  if (data?.attachments) {
                    newMessage.attachments = data.attachments.map((att: any) => ({
                      id: att.id,
                      file_url: att.data_url,
                      data_url: att.data_url,
                      thumb_url: att.thumb_url,
                      file_type: att.file_type,
                      file_size: att.file_size,
                      fallback_title:
                        att.fallback_title ||
                        att.file_name ||
                        t("interface:dynamic.fileSize", { size: att.file_size ? Math.round(att.file_size / 1024) : 0 }),
                    }));
                  }

                  return [...prev, newMessage];
                }

                let pendingMessage: MessageItem | undefined;
                const echoId = data?.echo_id;

                if (echoId) {
                  pendingMessage = prev.find(
                    m =>
                      (m.status === 'sending' || m.status === 'failed') &&
                      m.echoId === echoId &&
                      m.type === 'out',
                  );
                }

                if (!pendingMessage) {
                  pendingMessage = prev.find(
                    m =>
                      (m.status === 'sending' || m.status === 'failed') &&
                      m.text === txt &&
                      m.type === 'out',
                  );
                }

                if (!pendingMessage && echoId) {
                  pendingMessage = prev.find(
                    m => m.echoId === echoId && m.type === 'out' && m.status === 'sent',
                  );
                }

                if (pendingMessage) {
                  if (pendingMessage.status === 'sent') {
                    return prev;
                  }

                  return prev.map(m =>
                    m.id === pendingMessage.id
                      ? { ...m, status: 'sent' as const, id: messageId }
                      : m,
                  );
                }

                return prev;
              }

              if (data?.message_type === 0) {
                const isFromAgent =
                  data?.sender_type === 'User' || data?.performer?.type === 'user';
                const isFromContact = data?.sender_type === 'Contact';

                if (isFromContact && !isFromAgent) return prev;

                const newMessage = transformMessage(
                  {
                    ...data,
                    id: messageId,
                    content: txt,
                    created_at: data?.created_at,
                    message_type: 0,
                  },
                  prev,
                  { t, avatarUrl: uiAvatarUrl },
                );

                if (data?.attachments) {
                  newMessage.attachments = data.attachments.map((att: any) => ({
                    id: att.id,
                    file_url: att.data_url,
                    data_url: att.data_url,
                    thumb_url: att.thumb_url,
                    file_type: att.file_type,
                    file_size: att.file_size,
                    fallback_title:
                      att.fallback_title ||
                      att.file_name ||
                      t("interface:dynamic.fileSize", { size: att.file_size ? Math.round(att.file_size / 1024) : 0 }),
                  }));
                }

                return [...prev, newMessage];
              }

              if (data?.message_type === 2 || data?.message_type === 3) {
                const newMessage: MessageItem = {
                  id: messageId,
                  type: 'in',
                  text: txt,
                  ts: data?.created_at ? Date.parse(data.created_at) : Date.now(),
                  status: 'sent',
                  avatarUrl: undefined,
                  isSystem: true,
                };
                return [...prev, newMessage];
              }

              return prev;
            });

            postParent('unread-increment');
            postParent('play-audio');
          } else if (evt === 'conversation.created') {
            const newConversationId = data?.id;
            if (newConversationId) {
              setConversationIdSync(newConversationId);
              setHasStarted(true);
              setIsCreatingConversation(false);

              if (typeof window !== 'undefined') {
                sessionStorage.setItem(
                  'evo_widget_conversation_id',
                  newConversationId.toString(),
                );
              }

              try {
                const params = new URLSearchParams(window.location.search);
                const token = params.get('website_token') || '';
                if (!token) return;

                const { widgetService } = await import(
                  '@/services/widget/widgetService'
                );

                const messagesData = await widgetService.getMessages(token);
                const rawList = (messagesData as any)?.payload || [];

                // 👇 Se vierem mensagens de várias conversas, mantém só a recém-criada
                const messagesList = Array.isArray(rawList)
                  ? rawList.filter(m => m.conversation_id === newConversationId)
                  : [];

                if (messagesList.length > 0) {
                  const mappedMessages = mapAndRegisterMessages(
                    messagesList,
                    { t, avatarUrl: uiAvatarUrl },
                    processedMessageIds.current,
                  );
                  setMessagesWithPagination(mappedMessages);
                }
              } catch (error) {
                console.warn(
                  'Widget: Failed to load messages after conversation creation:',
                  error,
                );
              }
            }

          } else if (evt === 'conversation.status_changed') {
            const newStatus = data?.status;
            if (newStatus && ['open', 'resolved', 'pending', 'snoozed'].includes(newStatus)) {
              setConversationStatus(newStatus as ConversationStatus);
            }
          } else if (evt === 'presence.update') {
            const users = (payload as any)?.data?.users || [];
            setOnline(Array.isArray(users) ? users.length > 0 : !!users);
          }
        } catch (e) {
          console.error('❌ Widget: Error processing message', e);
        }
      },
    });

    cableRef.current = cable;

    return () => {
      cableRef.current?.disconnect();
      cableRef.current = null;
    };
  }, [pubsubToken]);
}
