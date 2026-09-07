// src/hooks/widget/useWidgetChat.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { widgetService } from '@/services/widget/widgetService';
import { WidgetCable } from '@/services/widget/widgetCable';

import { wdebug } from '@/utils/widget/debug';
import { v4 as uuidv4 } from 'uuid';
import { postParent } from '@/utils/widget/postParent';
import { mapAndRegisterMessages } from '@/utils/widget/messages';

import type {
  WidgetConfig,
  CurrentUser,
  Campaign,
  PreChatSubmissionData,
} from '@/types/settings/preChat';
import type { WidgetConfiguration, ConversationStatus } from '@/types/settings/widgetConfig';
import type { MessageItem } from '@/components/widget/MessageList';

import { useWidgetToast } from './useWidgetToast';
import { useWidgetTyping } from './useWidgetTyping';
import { useWidgetUploads } from './useWidgetUploads';
import { useWidgetRealtime } from './useWidgetRealtime';

export function useWidgetChat() {
  const { t } = useLanguage('widget');

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [ui, setUi] = useState<{
    title?: string;
    subtitle?: string;
    color?: string;
    avatarUrl?: string;
  }>({});
  const [online, setOnline] = useState(false);
  const [replyTime, setReplyTime] = useState<string | undefined>(undefined);
  const [replyToMessage, setReplyToMessage] = useState<MessageItem | null>(null);
  const [isAgentTyping] = useState(false);

  const cableRef = useRef<WidgetCable | null>(null);
  const [pubsubToken, setPubsubToken] = useState<string | null>(null);

  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser>({});
  const [activeCampaign, setActiveCampaign] = useState<Campaign>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const conversationIdRef = useRef<number | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const hasBootstrappedMessagesRef = useRef(false);

  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const isLoadingOlderMessagesRef = useRef(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>('open');

  // toast
  const { toastMessage, toastType, showToast, hideToast } = useWidgetToast();

  // uploads
  const { pendingUploads, handleSendAttachments, handleFileUpload } =
    useWidgetUploads({
      setMessages,
      getConversationId: () => conversationIdRef.current ?? undefined,
    });

  // typing
  const { toggleUserTyping } = useWidgetTyping({
    cableRef,
    conversationIdRef,
  });

  const enhancedConfig = useWidgetConfig({
    config: widgetConfig as unknown as WidgetConfiguration,
    conversationStatus,
    hasEmail: !!(currentUser?.email && currentUser.email.length > 0),
    t,
  });

  const setConversationIdSync = (id: number | null) => {
    conversationIdRef.current = id;
  };

  const setMessagesWithPagination = (newMessages: MessageItem[]) => {
    setMessages(newMessages);

    if (newMessages.length > 0) {
      const oldestMessage = newMessages.reduce((oldest, current) => {
        const oldestTs = oldest.ts ?? Number.POSITIVE_INFINITY;
        const currentTs = current.ts ?? Number.POSITIVE_INFINITY;
        return currentTs < oldestTs ? current : oldest;
      }, newMessages[0]);

      const messageIdForPagination =
        oldestMessage.originalId != null
          ? String(oldestMessage.originalId)
          : oldestMessage.id;

      setOldestMessageId(messageIdForPagination); // ✅ ESSENCIAL

      wdebug('[WIDGET_DEBUG] setMessagesWithPagination', {
        totalMessages: newMessages.length,
        oldestMessageId: messageIdForPagination,
        firstMessageId: newMessages[0].originalId || newMessages[0].id,
        lastMessageId:
          newMessages[newMessages.length - 1].originalId ||
          newMessages[newMessages.length - 1].id,
        timestamp: new Date().toISOString(),
      });
    }
  };


  const handleEndConversation = async () => {
    try {
      // get params from url
      const params = new URLSearchParams(window.location.search);

      // get website token from params
      const token = params.get('website_token') || '';

      // if token is not found, return
      if (!token) return;

      // log token
      wdebug('[WIDGET_DEBUG] handleEndConversation calling getConfig', {
        websiteToken: token,
        timestamp: new Date().toISOString(),
      });

      // get config (website token) from widget service
      await widgetService.getConfig(token);

      // toggle conversation status (close conversation) from widget service
      await widgetService.toggleConversationStatus(token);

      // show toast
      showToast(t('toast.conversationEnded'), 'success');

      // set conversation status to resolved
      setConversationStatus('resolved');
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 403) {
        showToast(t('toast.featureDisabled'), 'error');
        return;
      }

      if (status === 404) {
        showToast(t('toast.conversationNotFound'), 'info');
      }

      showToast(t('toast.errorEndingConversation'), 'error');
    }
  }

  const handleStartNewConversation = async () => {
    setMessages([]);
    setConversationStatus('open');
    setReplyToMessage(null);
    setOldestMessageId(null);
    setHasMoreMessages(true);
    conversationIdRef.current = null;
    processedMessageIds.current.clear();

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('evo_widget_conversation_id');
    }

    setHasStarted(false);

    showToast(t('toast.newConversationStarted'), 'success');
  };

  // 🔗 Aqui conectamos o WebSocket via hook dedicado
  useWidgetRealtime({
    pubsubToken,
    t,
    uiAvatarUrl: ui.avatarUrl,
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
  });

  // listener de mensagens do parent (config-set, toggle-open, set-user, etc)
  useEffect(() => {
    postParent('ready');

    const listener = (e: MessageEvent) => {
      if (typeof e.data !== 'string' || e.data.indexOf('evo-widget:') !== 0) return;
      try {
        const msg = JSON.parse(e.data.replace('evo-widget:', '')) as {
          event: string;
          [key: string]: any;
        };
        switch (msg.event) {
          case 'config-set':
            if (msg.settings) {
              const s = msg.settings || {};
              setUi(prev => ({
                ...prev,
                title: s.welcomeHeading || prev.title,
                subtitle: s.welcomeTagline || prev.subtitle,
                color: s.widgetColor || s.color || '#00d4aa',
                avatarUrl: s.avatarUrl || s.avatar_url || prev.avatarUrl,
              }));
            }
            break;
          case 'toggle-open':
            if (msg.isOpen) {
              postParent('unread-reset');
              setMessages(prev => prev.map(m => ({ ...m, unread: false })));
            }
            break;
          case 'set-user':
            if (msg.identifier || msg.user) {
              const userInfo = msg.user || {};
              sessionStorage.setItem(
                'evo_widget_user',
                JSON.stringify({
                  identifier: msg.identifier,
                  ...userInfo,
                }),
              );
            }
            break;
          case 'set-custom-attributes':
            if (msg.custom) {
              sessionStorage.setItem(
                'evo_widget_custom_attrs',
                JSON.stringify(msg.custom),
              );
            }
            break;
          default:
            break;
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  // bootstrap: getConfig, mensagens iniciais, presença
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('website_token') || '';
        if (!token) return;

        wdebug('[WIDGET_DEBUG] Bootstrap STARTED', {
          websiteToken: token,
          timestamp: new Date().toISOString(),
        });

        // 1) Config
        const cfg = await widgetService.getConfig(token);
        const pubsub = (cfg as any)?.contact?.pubsub_token || null;
        setPubsubToken(pubsub);

        setWidgetConfig({
          locale: cfg.locale,
          preChatFormEnabled: cfg.preChatFormEnabled,
          preChatMessage: cfg.preChatMessage,
          preChatFields: cfg.preChatFields,
          hasAttachmentsEnabled: cfg.hasAttachmentsEnabled,
          hasEmojiPickerEnabled: cfg.hasEmojiPickerEnabled,
          inboxAvatarUrl: cfg.inboxAvatarUrl,
          channelConfig: cfg.channelConfig,
          allowMessagesAfterResolved: cfg.allowMessagesAfterResolved ?? true,
        });

        // 2) User
        let userToSet = (cfg as any).current_user;
        if (!userToSet && (cfg as any).contact) userToSet = (cfg as any).contact;
        if (userToSet) setCurrentUser(userToSet);

        // 3) Campaign
        if ((cfg as any).active_campaign) setActiveCampaign((cfg as any).active_campaign);

        // 4) UI
        const wcfg = (cfg as any)?.website_channel_config || {};
        if (wcfg) {
          setUi(prev => ({
            ...prev,
            title: wcfg.welcome_title || cfg.channelConfig?.websiteName || prev.title,
            subtitle: wcfg.welcome_tagline || prev.subtitle,
            color: wcfg.widget_color || cfg.channelConfig?.widgetColor || '#00d4aa',
            avatarUrl: wcfg.avatar_url || cfg.inboxAvatarUrl || prev.avatarUrl,
          }));
          setReplyTime(wcfg.reply_time || undefined);
        }

        // 5) Presence
        try {
          const members = await widgetService.getInboxMembers(token);
          const list = (members as any)?.payload || (members as any)?.data || members;
          if (Array.isArray(list)) setOnline(list.length > 0);
        } catch {
          // ignore
        }

        // 6) Bootstrap conversa + mensagens (somente uma vez)
        if (!hasBootstrappedMessagesRef.current) {
          hasBootstrappedMessagesRef.current = true;

          wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.1 - Fetching conversations', {
            timestamp: new Date().toISOString(),
          });

          // 6.1) conversa ativa canônica
          let activeConversation: any = null;
          try {
            const convRes = await widgetService.getConversations(token);

            // Parse conversations from various possible response structures
            let conversations: any[] = [];

            if (Array.isArray(convRes)) {
              // Direct array
              conversations = convRes;
            } else if (Array.isArray(convRes?.payload)) {
              // Standard format: { payload: [...] }
              conversations = convRes.payload;
            } else if (Array.isArray(convRes?.data)) {
              // Alternative format: { data: [...] }
              conversations = convRes.data;
            } else if (convRes?.id) {
              // Single conversation object returned (current backend behavior)
              conversations = [convRes];
            } else {
              conversations = [];
            }

            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.1 - Conversations received', {
              totalConversations: conversations.length,
              isArray: Array.isArray(conversations),
              conversations: conversations,
              conversationsPayload: convRes,
              timestamp: new Date().toISOString(),
            });

            activeConversation = Array.isArray(conversations)
              ? conversations
                .filter((c: any) => c?.status === 'open' || c?.status === 'pending')
                .sort((a: any, b: any) =>
                  (Date.parse(b?.last_activity_at || b?.created_at || '') || b?.id || 0) -
                  (Date.parse(a?.last_activity_at || a?.created_at || '') || a?.id || 0)
                )[0]
              : null;

            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.1 - Active conversation selected', {
              hasActiveConversation: !!activeConversation,
              conversationId: activeConversation?.id,
              conversationStatus: activeConversation?.status,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            console.error('[WIDGET_DEBUG] Bootstrap STEP 6.1 - ERROR fetching conversations:', e);
          }

          if (!activeConversation?.id) {
            // Sem conversa ativa: estado limpo
            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.1 - NO ACTIVE CONVERSATION', {
              settingCleanState: true,
              timestamp: new Date().toISOString(),
            });
            setConversationIdSync(null);
            setConversationStatus('open');
            setMessages([]);
            setHasStarted(false);
            return;
          }

          // 6.2) fixa a conversa ativa
          wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.2 - Setting active conversation', {
            conversationId: activeConversation.id,
            conversationStatus: activeConversation.status,
            timestamp: new Date().toISOString(),
          });
          setConversationIdSync(activeConversation.id);
          setConversationStatus(activeConversation.status || 'open');

          // 6.3) carrega mensagens e filtra pela conversa ativa
          try {
            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.3 - Fetching messages', {
              conversationId: activeConversation.id,
              timestamp: new Date().toISOString(),
            });

            const data = await widgetService.getMessages(token);
            const raw =
              (data as any)?.payload?.messages ||
              (data as any)?.payload ||
              [];

            const list = Array.isArray(raw) ? raw : [];

            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.3 - Messages received', {
              totalReceived: list.length,
              activeConversationId: activeConversation.id,
              messageConversationIds: list.map((m: any) => m?.conversation_id),
              timestamp: new Date().toISOString(),
            });

            const filtered = list.filter((m: any) => m?.conversation_id === activeConversation.id);

            wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.3 - Messages filtered', {
              totalFiltered: filtered.length,
              totalReceived: list.length,
              activeConversationId: activeConversation.id,
              timestamp: new Date().toISOString(),
            });

            if (filtered.length > 0) {
              const mapped = mapAndRegisterMessages(
                filtered,
                { t, avatarUrl: ui.avatarUrl },
                processedMessageIds.current,
              );

              wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.3 - Calling setMessagesWithPagination', {
                messageCount: mapped.length,
                firstMessageId: mapped[0]?.id,
                lastMessageId: mapped[mapped.length - 1]?.id,
                timestamp: new Date().toISOString(),
              });

              setMessagesWithPagination(mapped);
            } else {
              wdebug('[WIDGET_DEBUG] Bootstrap STEP 6.3 - NO FILTERED MESSAGES', {
                settingEmptyMessages: true,
                timestamp: new Date().toISOString(),
              });
              setMessages([]);
            }

            setHasStarted(true);
          } catch (e) {
            console.error('[WIDGET_DEBUG] Bootstrap STEP 6.3 - ERROR loading messages:', e);
            // mesmo sem msgs, conversa existe -> considera started
            setHasStarted(true);
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cableRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function ensureActiveConversationId(token: string): Promise<number | null> {
    wdebug('[WIDGET_DEBUG] ensureActiveConversationId CALLED', {
      hasConversationId: !!conversationIdRef.current,
      currentConversationId: conversationIdRef.current,
      timestamp: new Date().toISOString(),
    });

    if (conversationIdRef.current) {
      wdebug('[WIDGET_DEBUG] ensureActiveConversationId USING EXISTING', {
        conversationId: conversationIdRef.current,
        timestamp: new Date().toISOString(),
      });
      return conversationIdRef.current;
    }

    wdebug('[WIDGET_DEBUG] ensureActiveConversationId FETCHING CONVERSATIONS', {
      timestamp: new Date().toISOString(),
    });

    const convRes = await widgetService.getConversations(token);

    // Parse conversations from various possible response structures
    let conversations: any[] = [];

    if (Array.isArray(convRes)) {
      // Direct array
      conversations = convRes;
    } else if (Array.isArray(convRes?.payload)) {
      // Standard format: { payload: [...] }
      conversations = convRes.payload;
    } else if (Array.isArray(convRes?.data)) {
      // Alternative format: { data: [...] }
      conversations = convRes.data;
    } else if (convRes?.id) {
      // Single conversation object returned (current backend behavior)
      conversations = [convRes];
    } else {
      conversations = [];
    }

    wdebug('[WIDGET_DEBUG] ensureActiveConversationId RECEIVED', {
      totalConversations: conversations.length,
      isArray: Array.isArray(conversations),
      conversations: conversations,
      conversationsPayload: convRes,
      timestamp: new Date().toISOString(),
    });

    const active = Array.isArray(conversations)
      ? conversations
        .filter((c: any) => c?.status === 'open' || c?.status === 'pending')
        .sort((a: any, b: any) =>
          (Date.parse(b?.last_activity_at || b?.created_at || '') || b?.id || 0) -
          (Date.parse(a?.last_activity_at || a?.created_at || '') || a?.id || 0)
        )[0]
      : null;

    wdebug('[WIDGET_DEBUG] ensureActiveConversationId RESULT', {
      foundActive: !!active,
      conversationId: active?.id,
      conversationStatus: active?.status,
      willSetConversationId: !!active?.id,
      timestamp: new Date().toISOString(),
    });

    if (active?.id) {
      setConversationIdSync(active.id);
      setConversationStatus(active.status || 'open');
      setHasStarted(true);
      return active.id;
    }

    wdebug('[WIDGET_DEBUG] ensureActiveConversationId NO ACTIVE CONVERSATION FOUND', {
      timestamp: new Date().toISOString(),
    });

    return null;
  }


  const handleSend = (text: string, replyTo?: string | number | null) => {
    if (
      conversationStatus === 'resolved' &&
      widgetConfig.allowMessagesAfterResolved === false
    ) {
      showToast(t('toast.conversationResolved'), 'info');
      return;
    }

    const echoId = uuidv4();

    wdebug('[WIDGET_DEBUG] handleSend STARTED', {
      echoId,
      hasConversationId: !!conversationIdRef.current,
      conversationId: conversationIdRef.current,
      hasStarted,
      timestamp: new Date().toISOString(),
    });

    let replyToObj = undefined;
    if (replyTo) {
      const originalMessage = messages.find(m => m.id === replyTo);
      if (originalMessage && !originalMessage.isSystem) {
        replyToObj = {
          id: replyTo,
          text: originalMessage.text,
          sender:
            originalMessage.type === 'out'
              ? t('chat.you')
              : originalMessage.sender?.name || t('chat.agent'),
          type: originalMessage.type,
        };
      }
    }

    const optimistic: MessageItem = {
      id: echoId,
      type: 'out',
      text,
      ts: Date.now(),
      status: 'sending',
      echoId,
      replyTo: replyToObj as MessageItem['replyTo'],
    };

    setMessages(prev => [...prev, optimistic]);

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('website_token') || '';
        if (!token) return;

        wdebug('[WIDGET_DEBUG] handleSend calling getConfig', {
          websiteToken: token,
          echoId,
          timestamp: new Date().toISOString(),
        });

        await widgetService.getConfig(token);

        // 1) tenta "re-sincronizar" conversa ativa antes de criar
        const cid = await ensureActiveConversationId(token);

        wdebug('[WIDGET_DEBUG] handleSend after ensureActiveConversationId', {
          conversationId: cid,
          echoId,
          timestamp: new Date().toISOString(),
        });

        // 2) se não existe conversa ativa, cria (createConversation já manda a msg)
        if (!cid) {
          // se você está com hasStarted=true aqui, teu estado tá incoerente.
          // mas criar conversa é OK se NÃO existe ativa no backend.
          const contact = {
            name: currentUser.name || '',
            email: currentUser.email || '',
            phone_number: currentUser.phone_number || '',
          };

          const created = await widgetService.createConversation(token, text, contact);

          const newId =
            (created as any)?.conversation?.id ??
            (created as any)?.conversation_id ??
            (created as any)?.id ??
            null;

          if (newId) {
            setConversationIdSync(Number(newId));
            setConversationStatus('open');
            setHasStarted(true);
          }

          setMessages(prev =>
            prev.map(m => (m.id === optimistic.id ? { ...m, status: 'sent' } : m)),
          );
          return;
        }

        // 3) se existe conversa ativa, manda para ela
        await widgetService.sendMessage(
          token,
          text,
          replyTo ? String(replyTo) : undefined,
          echoId,
          cid,
        );

        setMessages(prev =>
          prev.map(m => (m.id === optimistic.id ? { ...m, status: 'sent' } : m)),
        );
      } catch (e) {
        console.error('❌ Widget: handleSend error:', e);
        setMessages(prev =>
          prev.map(m =>
            m.id === optimistic.id && m.status === 'sending'
              ? { ...m, status: 'failed' }
              : m,
          ),
        );
      }
    })();
  };



  const handlePreChatSubmit = async (preChatData: PreChatSubmissionData) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('website_token') || '';
    if (!token) return;

    wdebug('[WIDGET_DEBUG] handlePreChatSubmit STARTED', {
      websiteToken: token,
      hasEmail: !!preChatData.emailAddress,
      timestamp: new Date().toISOString(),
    });

    setIsCreatingConversation(true);

    try {
      const storedUser = sessionStorage.getItem('evo_widget_user');
      const storedAttrs = sessionStorage.getItem('evo_widget_custom_attrs');

      const mergedData: PreChatSubmissionData = {
        ...preChatData,
        contactCustomAttributes: {
          ...preChatData.contactCustomAttributes,
          ...(storedAttrs ? JSON.parse(storedAttrs) : {}),
        },
      };

      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.identifier && !mergedData.fullName) {
          mergedData.fullName = userData.identifier;
        }
        if (userData.email && !mergedData.emailAddress) {
          mergedData.emailAddress = userData.email;
        }
      }

      wdebug('[WIDGET_DEBUG] handlePreChatSubmit calling getConfig', {
        websiteToken: token,
        timestamp: new Date().toISOString(),
      });

      await widgetService.getConfig(token);

      try {
        const newConv = await widgetService.createConversationFromPreChat(
          token,
          mergedData,
        );

        if (newConv?.conversation?.id) {
          setConversationIdSync(newConv.conversation.id);
        }

        const data = await widgetService.getMessages(token);
        const list = (data as any)?.payload || [];

        if (list.length > 0 && list[0]?.conversation_id && !conversationIdRef.current) {
          setConversationIdSync(list[0].conversation_id);
        }

        if (Array.isArray(list) && list.length > 0) {
          const mappedMessages = mapAndRegisterMessages(
            list,
            { t, avatarUrl: ui.avatarUrl },
            processedMessageIds.current,
          );

          setMessagesWithPagination(mappedMessages);
        }

        setHasStarted(true);
      } catch (apiError) {
        console.warn('Widget: API call failed, relying on WebSocket events:', apiError);

        setTimeout(() => {
          if (!hasStarted && isCreatingConversation) {
            setHasStarted(true);
            setIsCreatingConversation(false);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Widget: Error processing pre-chat form:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleReplyToMessage = (message: MessageItem) => {
    setReplyToMessage(message);
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  const loadOlderMessages = async () => {
    if (isLoadingOlderMessagesRef.current || !hasMoreMessages || !oldestMessageId) return;

    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);


    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) {
        wdebug('[WIDGET_DEBUG] loadOlderMessages NO TOKEN', {
          timestamp: new Date().toISOString(),
        });
        return;
      }

      wdebug('[WIDGET_DEBUG] loadOlderMessages FETCHING', {
        websiteToken: token,
        before: oldestMessageId,
        timestamp: new Date().toISOString(),
      });

      const data = await widgetService.getMessages(token, { before: oldestMessageId });

      // ✅ payload pode vir como payload.messages ou payload (array)
      const raw =
        (data as any)?.payload?.messages ||
        (data as any)?.payload ||
        [];

      const list = Array.isArray(raw) ? raw : [];

      wdebug('[WIDGET_DEBUG] loadOlderMessages RECEIVED', {
        receivedCount: list.length,
        firstId: list[0]?.id,
        lastId: list[list.length - 1]?.id,
        timestamp: new Date().toISOString(),
      });

      if (list.length === 0) {
        wdebug('[WIDGET_DEBUG] loadOlderMessages NO MORE', {
          timestamp: new Date().toISOString(),
        });
        setHasMoreMessages(false);
        return;
      }

      // OBS: pelo finder, list já vem ASC (antigas -> novas dentro do lote)
      const mapped: MessageItem[] = mapAndRegisterMessages(
        list,
        { t, avatarUrl: ui.avatarUrl },
        processedMessageIds.current,
      );

      // prepend direto (sem reverse)
      setMessages(prev => {
        wdebug('[WIDGET_DEBUG] loadOlderMessages PREPENDING', {
          previousCount: prev.length,
          newCount: mapped.length,
          totalAfter: prev.length + mapped.length,
          timestamp: new Date().toISOString(),
        });
        return [...mapped, ...prev];
      });

      const newOldestId =
        mapped[0]?.originalId != null ? String(mapped[0].originalId) : mapped[0]?.id;

      wdebug('[WIDGET_DEBUG] loadOlderMessages NEW CURSOR', {
        oldCursor: oldestMessageId,
        newCursor: newOldestId,
        timestamp: new Date().toISOString(),
      });

      if (newOldestId) setOldestMessageId(newOldestId);

      // finder limita 20
      if (list.length < 20) {
        wdebug('[WIDGET_DEBUG] loadOlderMessages REACHED END', {
          receivedCount: list.length,
          timestamp: new Date().toISOString(),
        });
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Widget: Failed to load older messages:', error);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  };

  return {
    t,
    ui,
    online,
    replyTime,
    widgetConfig,
    currentUser,
    activeCampaign,
    hasStarted,
    isCreatingConversation,
    messages,
    pendingUploads,
    replyToMessage,
    isAgentTyping,
    isLoadingOlderMessages,
    hasMoreMessages,
    toastMessage,
    toastType,
    enhancedConfig,
    conversationStatus,

    // actions
    handleSend,
    handleSendAttachments,
    handleFileUpload,
    handlePreChatSubmit,
    handleReplyToMessage,
    handleClearReply,
    handleStartNewConversation,
    handleEndConversation,
    toggleUserTyping,
    loadOlderMessages,
    showToast,
    hideToast,
  };
}
