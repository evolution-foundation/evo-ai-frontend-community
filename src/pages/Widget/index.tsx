import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/widget/Header';
import MessageList, { MessageItem } from '@/components/widget/MessageList';
import FooterReplyTo from '@/components/widget/FooterReplyTo';
import TypingIndicator from '@/components/widget/TypingIndicator';
import { PreChatForm } from '@/components/widget/PreChatForm';
import { widgetService } from '@/services/widget/widgetService';
import { WidgetCable } from '@/services/widget/widgetCable';
import { postParent } from '@/utils/widget/postParent';
import { v4 as uuidv4 } from 'uuid';
import type { AttachmentUpload } from '@/types/core';
import type { WidgetConfig, CurrentUser, Campaign, PreChatSubmissionData } from '@/types/settings';
import type { WidgetConfiguration, ConversationStatus } from '@/types/settings';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import EmailTranscriptButton from '@/components/widget/EmailTranscriptButton';
import StartNewConversationButton from '@/components/widget/StartNewConversationButton';
import Toast from '@/components/widget/Toast';

export default function Widget() {
  const { t } = useLanguage('widget');
  const rootRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [ui, setUi] = useState<{
    title?: string;
    subtitle?: string;
    color?: string;
    avatarUrl?: string;
  }>({});
  const [online, setOnline] = useState(false);
  const [replyTime, setReplyTime] = useState<string | undefined>(undefined);
  const [pendingUploads, setPendingUploads] = useState<AttachmentUpload[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<MessageItem | null>(null);
  const [isAgentTyping] = useState(false);
  const [userTypingTimeout, setUserTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const cableRef = useRef<WidgetCable | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser>({});
  const [activeCampaign, setActiveCampaign] = useState<Campaign>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const forceNewConversationRef = useRef(false);
  const startNewConversationIntentRef = useRef(false);
  const conversationCreatePromiseRef = useRef<Promise<{ conversationId: string | null; createdWithMessage: boolean }> | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);

  // Pre-chat server validation errors
  const [preChatServerErrors, setPreChatServerErrors] = useState<Record<string, string[]>>({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Conversation status for end conversation feature
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('open');

  // Enhanced widget configuration with feature flags and business logic
  const enhancedConfig = useWidgetConfig({
    config: widgetConfig as unknown as WidgetConfiguration,
    conversationStatus: conversationStatus,
    hasEmail: !!(currentUser?.email && currentUser.email.length > 0),
    t,
  });

  // Helper function to transform API message to MessageItem format
  const transformMessage = (m: any, list: any[] = []): MessageItem => {
    const messageId = String(m.id ?? Math.random());
    const isSystemMessage = m.message_type === 2 || m.message_type === 3;
    const normalizeContentType = (value: any) => {
      if (typeof value === 'string') return value;
      if (typeof value !== 'number') return undefined;

      const map: Record<number, string> = {
        0: 'text',
        1: 'input_text',
        2: 'input_textarea',
        3: 'input_email',
        4: 'input_select',
        5: 'cards',
        6: 'form',
        7: 'article',
        8: 'incoming_email',
        9: 'input_csat',
        10: 'integrations',
        11: 'sticker',
      };
      return map[value] || undefined;
    };

    // Process reply-to information
    let replyTo = undefined;
    if (m.content_attributes?.in_reply_to) {
      const replyToId = m.content_attributes.in_reply_to;
      const originalMessage = list.find((msg: any) => msg.id === replyToId);
      if (originalMessage) {
        replyTo = {
          id: replyToId,
          text: originalMessage.content || '',
          sender:
            originalMessage.message_type === 0
              ? originalMessage.sender?.name || t('chat.user')
              : t('chat.agent'),
          type: originalMessage.message_type === 0 ? ('out' as const) : ('in' as const),
        };
      }
    }

    return {
      id: messageId,
      originalId: m.id,
      type:
        m.message_type === 'outgoing' || m.message_type === 0 ? ('out' as const) : ('in' as const),
      text: m.content || '',
      ts: m.created_at
        ? typeof m.created_at === 'number'
          ? m.created_at * 1000
          : Date.parse(m.created_at)
        : Date.now(),
      status: 'sent' as const,
      avatarUrl:
        m.message_type === 'outgoing' || m.message_type === 0 || isSystemMessage
          ? undefined
          : ui.avatarUrl || undefined,
      isSystem: isSystemMessage,
      replyTo,
      // Map attachments from backend format
      attachments: m.attachments
        ? m.attachments.map((att: any) => ({
            id: att.id,
            file_url: att.file_url || att.data_url,
            data_url: att.data_url,
            thumb_url: att.thumb_url,
            file_type: att.file_type,
            file_size: att.file_size,
            fallback_title:
              att.fallback_title ||
              `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
          }))
        : undefined,
      // Email HTML support
      contentType: normalizeContentType(m.content_type),
      submittedEmail: m.submitted_email || undefined,
      items: Array.isArray(m.content_attributes?.items) ? m.content_attributes.items : undefined,
      submittedValues: m.content_attributes?.submitted_values || undefined,
      contentAttributes: m.content_attributes?.email
        ? {
            email: {
              html_content: m.content_attributes.email.html_content,
              text_content: m.content_attributes.email.text_content,
            },
          }
        : undefined,
    };
  };

  // Helper to set conversation ID in both state and ref
  const setConversationIdSync = (id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  };

  const syncConversationId = (id: string | null) => {
    if (!id) return;
    setConversationIdSync(id);
    startNewConversationIntentRef.current = false;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('evo_widget_conversation_id', id);
    }
  };

  const findExistingConversationId = async (token: string): Promise<string | null> => {
    const data = await widgetService.getMessages(token);
    const list = data?.data?.messages || [];
    const existingId = list.length > 0 && list[0]?.conversation_id ? String(list[0].conversation_id) : null;
    if (existingId) {
      syncConversationId(existingId);
    }
    return existingId;
  };

  const ensureConversationForSend = async (
    token: string,
    text: string,
    contact: { name?: string; email?: string; phone_number?: string },
  ): Promise<{ conversationId: string | null; createdWithMessage: boolean }> => {
    if (!forceNewConversationRef.current && conversationIdRef.current) {
      return { conversationId: conversationIdRef.current, createdWithMessage: false };
    }

    if (!forceNewConversationRef.current) {
      const storedConversationId = sessionStorage.getItem('evo_widget_conversation_id');
      if (storedConversationId) {
        syncConversationId(storedConversationId);
        return { conversationId: storedConversationId, createdWithMessage: false };
      }

      const existingConversationId = await findExistingConversationId(token);
      if (existingConversationId) {
        return { conversationId: existingConversationId, createdWithMessage: false };
      }
    }

    if (conversationCreatePromiseRef.current) {
      return conversationCreatePromiseRef.current;
    }

    conversationCreatePromiseRef.current = (async () => {
      const newConv = await widgetService.createConversation(token, text, contact);
      const createdConversationId = newConv?.conversation?.id
        ? String(newConv.conversation.id)
        : null;
      let resolvedConversationId = createdConversationId;

      if (!resolvedConversationId) {
        resolvedConversationId = await findExistingConversationId(token);
      }

      if (resolvedConversationId) {
        syncConversationId(resolvedConversationId);
      }

      // createConversation already persists the first message content server-side.
      return { conversationId: resolvedConversationId, createdWithMessage: true };
    })().finally(() => {
      forceNewConversationRef.current = false;
      conversationCreatePromiseRef.current = null;
    });

    return conversationCreatePromiseRef.current;
  };

  const refreshConversationStatus = async (token: string) => {
    try {
      const response = await widgetService.getConversations(token);
      const payload = response?.payload ?? response?.data ?? response;
      const status = Array.isArray(payload) ? payload[0]?.status : payload?.status;
      const isStartingNewConversation =
        startNewConversationIntentRef.current && !conversationIdRef.current;

      if (isStartingNewConversation && status === 'resolved') {
        setConversationStatus('open');
        return;
      }

      if (status && ['open', 'pending', 'resolved', 'snoozed'].includes(status)) {
        setConversationStatus(status as ConversationStatus);
      }
    } catch {
      return;
    }
  };

  // Helper to set messages and update pagination state
  const setMessagesWithPagination = (newMessages: MessageItem[]) => {
    setMessages(newMessages);

    // Update oldest message ID for pagination
    if (newMessages.length > 0) {
      // Find the oldest message (should be the first one since they're chronologically ordered)
      const oldestMessage = newMessages[0];
      // Use originalId (UUID) for backend queries, fallback to id if not available
      const messageIdForPagination = oldestMessage.originalId
        ? String(oldestMessage.originalId)
        : oldestMessage.id;
      setOldestMessageId(messageIdForPagination);
    }
  };

  // Toast notification helpers
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Email transcript handler
  // const handleEmailTranscript = async () => {
  //   const params = new URLSearchParams(window.location.search);
  //   const token = params.get('website_token');
  //   if (!token) return;

  //   try {
  //     await widgetService.sendEmailTranscript(token);
  //     showToast(t('toast.emailTranscriptSuccess'), 'success');
  //   } catch (error) {
  //     console.error('Email transcript error:', error);
  //     showToast(t('toast.emailTranscriptError'), 'error');
  //   }
  // };

  // End conversation handler
  const handleEndConversation = async () => {
    showToast(t('toast.conversationEnded'), 'success');
    setConversationStatus('resolved');
    startNewConversationIntentRef.current = false;
    forceNewConversationRef.current = true;
    setConversationIdSync(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('evo_widget_conversation_id');
    }

    // Optionally clear the conversation or show a confirmation message
    // For now, just update the UI to reflect the resolved status
  };

  const handleStartNewConversation = async () => {
    // Clear conversation state similar to Vue widget
    setMessages([]);
    setConversationStatus('open');
    // Keep hasStarted as true to stay in chat interface
    // setHasStarted(false); // Don't set to false - this causes the loading state
    setReplyToMessage(null);
    setOldestMessageId(null);
    setHasMoreMessages(true);

    // Clear conversation ID to force creation of new conversation
    setConversationIdSync(null);
    startNewConversationIntentRef.current = true;
    forceNewConversationRef.current = true;
    conversationCreatePromiseRef.current = null;

    // Reset processed message IDs
    processedMessageIds.current.clear();

    // Clear only conversation ID from session storage to ensure new conversation
    // Keep auth token to maintain authentication
    sessionStorage.removeItem('evo_widget_conversation_id');

    showToast(t('toast.newConversationStarted'), 'success');
  };

  useEffect(() => {
    // Notify ready
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
            // Reset unread in parent when opened
            if (msg.isOpen) {
              postParent('unread-reset');
              // Mark messages as read
              setMessages(prev => prev.map(m => ({ ...m, unread: false })));
            }
            break;
          case 'set-user':
            // Store user info in session
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
            // Store custom attributes
            if (msg.custom) {
              sessionStorage.setItem('evo_widget_custom_attrs', JSON.stringify(msg.custom));
            }
            break;
          default:
            break;
        }
      } catch (_) {}
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  // Load initial messages (if any)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('website_token') || '';
        if (!token) return;
        // ensure auth token from config
        const cfg = await widgetService.getConfig(token);
        const pubsub = (cfg as any)?.contact?.pubsub_token;
        await refreshConversationStatus(token);

        // Set widget configuration

        const widgetConfigData = {
          locale: cfg.locale,
          preChatFormEnabled: cfg.preChatFormEnabled,
          preChatMessage: cfg.preChatMessage,
          preChatFields: cfg.preChatFields,
          hasAttachmentsEnabled: cfg.hasAttachmentsEnabled,
          hasEmojiPickerEnabled: cfg.hasEmojiPickerEnabled,
          inboxAvatarUrl: cfg.inboxAvatarUrl,
          channelConfig: cfg.channelConfig,
        };

        setWidgetConfig(widgetConfigData);

        // Set current user data
        let userToSet = (cfg as any).current_user;
        if (!userToSet && (cfg as any).contact) {
          // If no current_user but contact exists, use contact data
          userToSet = (cfg as any).contact;
        }

        if (userToSet) {
          setCurrentUser(userToSet);

          // If user is already identified, skip pre-chat form and load existing messages
          // Use the same logic as in render - ignore auto-generated names
          const hasRealEmail = userToSet.email && userToSet.email.length > 0;
          const hasCustomIdentifier = userToSet.identifier && userToSet.identifier.length > 0;
          const hasRealName =
            userToSet.name &&
            userToSet.name.length > 0 &&
            !userToSet.name.match(/^[a-z]+-[a-z]+-\d{3}$/);
          const isUserIdentified = hasRealEmail || hasCustomIdentifier || hasRealName;
          if (isUserIdentified) {
            setHasStarted(true);

            // Load existing conversation/messages for identified user
            (async () => {
              try {
                const data = await widgetService.getMessages(token);
                const list = data?.data?.messages || [];

                // Extract conversation ID from messages
                if (list.length > 0 && list[0]?.conversation_id) {
                  setConversationIdSync(list[0].conversation_id);

                  // Map and set existing messages
                  const mappedMessages = list.map((m: any) => {
                    const messageId = String(m.id ?? Math.random());
                    processedMessageIds.current.add(messageId);
                    const isSystemMessage = m.message_type === 2 || m.message_type === 3;

                    // Process reply-to information for historical messages
                    let replyTo = undefined;
                    if (m.content_attributes?.in_reply_to) {
                      const replyToId = m.content_attributes.in_reply_to;
                      const originalMessage = list.find((msg: any) => msg.id === replyToId);
                      if (originalMessage) {
                        replyTo = {
                          id: replyToId,
                          text: originalMessage.content || '',
                          sender:
                            originalMessage.message_type === 0
                              ? originalMessage.sender?.name || t('chat.user')
                              : t('chat.agent'),
                          type:
                            originalMessage.message_type === 0 ? ('out' as const) : ('in' as const),
                        };
                      }
                    }

                    return {
                      id: messageId,
                      type: (m.message_type === 'outgoing' || m.message_type === 0
                        ? 'out'
                        : isSystemMessage
                        ? 'system'
                        : 'in') as 'out' | 'in' | 'system',
                      text: m.content || '',
                      ts: m.created_at
                        ? typeof m.created_at === 'number'
                          ? m.created_at * 1000
                          : Date.parse(m.created_at)
                        : Date.now(),
                      status: 'sent' as const,
                      avatarUrl:
                        m.message_type === 'outgoing' || m.message_type === 0 || isSystemMessage
                          ? undefined
                          : ui.avatarUrl || undefined,
                      isSystem: isSystemMessage,
                      replyTo,
                      // Map attachments from backend format
                      attachments: m.attachments
                        ? m.attachments.map((att: any) => ({
                            id: att.id,
                            file_url: att.file_url || att.data_url,
                            data_url: att.data_url,
                            thumb_url: att.thumb_url,
                            file_type: att.file_type,
                            file_size: att.file_size,
                            fallback_title:
                              att.fallback_title ||
                              `Arquivo (${
                                att.file_size ? Math.round(att.file_size / 1024) : 0
                              } KB)`,
                          }))
                        : undefined,
                    };
                  });
                  setMessagesWithPagination(mappedMessages);
                }
              } catch (error) {
                console.warn(
                  'Widget: Failed to load existing messages for identified user:',
                  error,
                );
                // This is OK - user might not have previous messages
              }
            })();
          }
        }

        // Set active campaign
        if ((cfg as any).active_campaign) {
          setActiveCampaign((cfg as any).active_campaign);
        }

        // Apply UI settings (backward compatibility)
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
        try {
          const members = await widgetService.getInboxMembers(token);
          const list = (members as any)?.payload || members?.data || members;
          if (Array.isArray(list)) setOnline(list.length > 0);
        } catch (_) {}
        if (pubsub && !cableRef.current) {
          cableRef.current = new WidgetCable(pubsub, {
            onMessage: payload => {
              try {
                const evt = payload?.event;
                const data = payload?.data || payload?.message || payload;

                if (evt === 'message.created') {
                  // Declare messageId at the top to avoid reference errors
                  const messageId = String(data?.id || Math.random());

                  // Set conversation ID from first message if not set
                  const msgConversationId = data?.conversation_id;
                  if (msgConversationId && !conversationIdRef.current) {
                    setConversationIdSync(msgConversationId);

                    // Also store conversation ID in sessionStorage for recovery after refresh
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem(
                        'evo_widget_conversation_id',
                        msgConversationId.toString(),
                      );
                    }
                  }

                  // Skip messages from other conversations (only if we have a conversation ID set)
                  if (
                    conversationIdRef.current &&
                    msgConversationId &&
                    msgConversationId !== conversationIdRef.current
                  ) {
                    return;
                  }

                  // Handle different message types:
                  // 0 = customer messages (our own messages echoed back)
                  // 1 = agent messages
                  // 2 = system/activity messages
                  // 3 = template messages

                  // Special handling for message_type 0 (customer messages echoed back)
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
                        // Process reply-to information from echo if available
                        let replyTo:
                          | {
                              id: string | number;
                              text: string;
                              sender?: string;
                              type?: 'in' | 'out';
                            }
                          | undefined = pendingMessage.replyTo; // Keep existing replyTo
                        if (data?.content_attributes?.in_reply_to && !replyTo) {
                          const replyToId = data.content_attributes.in_reply_to;
                          const originalMessage = prev.find(m => m.id === replyToId);
                          if (originalMessage && originalMessage.type !== 'system') {
                            replyTo = {
                              id: replyToId,
                              text: originalMessage.text,
                              sender:
                                originalMessage.type === 'out'
                                  ? t('chat.you')
                                  : originalMessage.sender?.name || t('chat.agent'),
                              type: originalMessage.type,
                            };
                          }
                        }

                        const updatedMessages = prev.map(m => {
                          if (m.id !== pendingMessage.id) return m;

                          return {
                            ...m,
                            status: 'sent' as const,
                            id: messageId,
                            replyTo,
                            attachments: data?.attachments
                              ? data.attachments.map((att: any) => ({
                                  id: att.id,
                                  file_url: att.file_url || att.data_url,
                                  data_url: att.data_url,
                                  thumb_url: att.thumb_url,
                                  file_type: att.file_type,
                                  file_size: att.file_size,
                                  fallback_title:
                                    att.fallback_title ||
                                    att.file_name ||
                                    `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
                                }))
                              : m.attachments,
                          };
                        });
                        return updatedMessages;
                      } else {
                        // No matching optimistic message found - this is likely a pre-chat message
                        // Add it as a new outgoing message

                        const newMessage = transformMessage(
                          {
                            ...data,
                            id: messageId,
                            content: txt,
                            created_at: data?.created_at,
                            message_type: 0, // outgoing from user perspective
                          },
                          prev,
                        );
                        return [...prev, newMessage];
                      }
                    });
                    return; // Don't process further
                  }

                  // Process all message types (0=incoming, 1=outgoing, 2=activity, 3=template)
                  if (data?.message_type === undefined || data?.message_type === null) {
                    return;
                  }

                  const txt = data?.content || '';
                  const hasAttachments = data?.attachments && data.attachments.length > 0;
                  if (!txt && !hasAttachments) {
                    return;
                  }

                  // Check if we've already processed this message ID
                  if (processedMessageIds.current.has(messageId)) {
                    return;
                  }

                  // Mark message as processed
                  processedMessageIds.current.add(messageId);

                  setMessages(prev => {
                    // Only process messages from the current conversation
                    if (
                      data?.conversation_id &&
                      conversationId &&
                      data.conversation_id !== conversationId
                    ) {
                      return prev;
                    }

                    // Handle different message types
                    if (data?.message_type === 1) {
                      // message_type 1 = outgoing - but check if it's from an agent or bot
                      const isFromAgent =
                        data?.performer?.type === 'user' ||
                        data?.sender_type === null ||
                        data?.sender_type === 'AgentBot';

                      if (isFromAgent) {
                        // This is a message from an agent, add as incoming message

                        const newMessage = transformMessage(
                          {
                            ...data,
                            id: messageId,
                            content: txt,
                            created_at: data?.created_at,
                            message_type: 1, // incoming from agent
                          },
                          prev,
                        );
                        // Map attachments from WebSocket data
                        if (data?.attachments) {
                          newMessage.attachments = data.attachments.map((att: any) => {
                            return {
                              id: att.id,
                              file_url: att.file_url || att.data_url,
                              data_url: att.data_url,
                              thumb_url: att.thumb_url,
                              file_type: att.file_type,
                              file_size: att.file_size,
                              fallback_title:
                                att.fallback_title ||
                                att.file_name ||
                                `Arquivo (${
                                  att.file_size ? Math.round(att.file_size / 1024) : 0
                                } KB)`,
                            };
                          });
                        }
                        return [...prev, newMessage];
                      } else {
                        // This is a regular user message confirmation
                        // Try to match by echo_id first (more reliable), then by text
                        let pendingMessage;
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

                        // If no pending message found but we have echoId, try to find recently sent message
                        if (!pendingMessage && echoId) {
                          pendingMessage = prev.find(
                            m => m.echoId === echoId && m.type === 'out' && m.status === 'sent',
                          );
                        }

                        if (pendingMessage) {
                          // If message is already sent, just confirm it was processed
                          if (pendingMessage.status === 'sent') {
                            return prev; // No changes needed, message already sent
                          } else {
                            // Update pending message to 'sent'
                            return prev.map(m => {
                              if (m.id !== pendingMessage.id) return m;

                              return {
                                ...m,
                                status: 'sent' as const,
                                id: messageId,
                                attachments: data?.attachments
                                  ? data.attachments.map((att: any) => ({
                                      id: att.id,
                                      file_url: att.file_url || att.data_url,
                                      data_url: att.data_url,
                                      thumb_url: att.thumb_url,
                                      file_type: att.file_type,
                                      file_size: att.file_size,
                                      fallback_title:
                                        att.fallback_title ||
                                        att.file_name ||
                                        `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
                                    }))
                                  : m.attachments,
                              };
                            });
                          }
                        } else {
                          // Don't add duplicate outgoing messages - they should already be in the UI optimistically
                          return prev;
                        }
                      }
                    } else if (data?.message_type === 0) {
                      // message_type 0 = incoming (agent/contact message) - add as new incoming message

                      // Check if this is actually from an agent/user (not the current contact)
                      const isFromAgent =
                        data?.sender_type === 'User' || data?.performer?.type === 'user';
                      const isFromContact = data?.sender_type === 'Contact';

                      // If it's from contact but we're getting it as type 0, it might be an echo - skip it
                      if (isFromContact && !isFromAgent) {
                        return prev;
                      }

                      const newMessage = transformMessage(
                        {
                          ...data,
                          id: messageId,
                          content: txt,
                          created_at: data?.created_at,
                          message_type: 0, // outgoing from user perspective
                        },
                        prev,
                      );
                      // Map attachments from WebSocket data
                      if (data?.attachments) {
                        newMessage.attachments = data.attachments.map((att: any) => {
                          return {
                            id: att.id,
                            file_url: att.file_url || att.data_url,
                            data_url: att.data_url,
                            thumb_url: att.thumb_url,
                            file_type: att.file_type,
                            file_size: att.file_size,
                            fallback_title:
                              att.fallback_title ||
                              att.file_name ||
                              `Arquivo (${
                                att.file_size ? Math.round(att.file_size / 1024) : 0
                              } KB)`,
                          };
                        });
                      }
                      return [...prev, newMessage];
                    } else if (data?.message_type === 2 || data?.message_type === 3) {
                      // message_type 2, 3 = activity, template - add as system message
                      const newMessage = {
                        id: messageId,
                        originalId: data?.id,
                        type: 'in' as const,
                        text: txt,
                        ts: data?.created_at ? Date.parse(data.created_at) : Date.now(),
                        status: 'sent' as const,
                        avatarUrl: undefined,
                        isSystem: true, // Add system flag for styling
                        contentType: data?.content_type,
                        submittedEmail: data?.submitted_email || undefined,
                        attachments: data?.attachments
                          ? data.attachments.map((att: any) => ({
                              id: att.id,
                              file_url: att.file_url || att.data_url,
                              data_url: att.data_url,
                              thumb_url: att.thumb_url,
                              file_type: att.file_type,
                              file_size: att.file_size,
                              fallback_title:
                                att.fallback_title ||
                                att.file_name ||
                                `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
                            }))
                          : undefined,
                      };
                      return [...prev, newMessage];
                    } else {
                      return prev;
                    }
                  });

                  postParent('unread-increment');
                  postParent('play-audio');
                } else if (evt === 'conversation.created') {
                  // Set conversation ID when new conversation is created
                  const newConversationId = data?.id;
                  if (newConversationId) {
                    setConversationIdSync(newConversationId);
                    // Always transition to chat when conversation is created
                    // This handles both pre-chat form submissions and direct conversation creation
                    setHasStarted(true);
                    setIsCreatingConversation(false);

                    // Load messages for the newly created conversation
                    (async () => {
                      try {
                        const params = new URLSearchParams(window.location.search);
                        const token = params.get('website_token') || '';
                        if (token) {
                          const messagesData = await widgetService.getMessages(token);
                          const messagesList = messagesData?.data?.messages || [];
                          if (Array.isArray(messagesList) && messagesList.length > 0) {
                            const mappedMessages = messagesList.map((m: any) => {
                              const messageId = String(m.id ?? Math.random());
                              processedMessageIds.current.add(messageId);
                              const isSystemMessage = m.message_type === 2 || m.message_type === 3;

                              return {
                                id: messageId,
                                type:
                                  m.message_type === 'outgoing' || m.message_type === 0
                                    ? ('out' as const)
                                    : ('in' as const),
                                text: m.content || '',
                                ts: m.created_at
                                  ? typeof m.created_at === 'number'
                                    ? m.created_at * 1000
                                    : Date.parse(m.created_at)
                                  : Date.now(),
                                status: 'sent' as const,
                                avatarUrl:
                                  m.message_type === 'outgoing' ||
                                  m.message_type === 0 ||
                                  isSystemMessage
                                    ? undefined
                                    : ui.avatarUrl || undefined,
                                isSystem: isSystemMessage,
                                contentType: m.content_type,
                                submittedEmail: m.submitted_email || undefined,
                                // Map attachments from backend format
                                attachments: m.attachments
                                  ? m.attachments.map((att: any) => ({
                                      id: att.id,
                                      file_url: att.file_url || att.data_url,
                                      data_url: att.data_url,
                                      thumb_url: att.thumb_url,
                                      file_type: att.file_type,
                                      file_size: att.file_size,
                                      fallback_title:
                                        att.fallback_title ||
                                        `Arquivo (${
                                          att.file_size ? Math.round(att.file_size / 1024) : 0
                                        } KB)`,
                                    }))
                                  : undefined,
                              };
                            });
                            setMessagesWithPagination(mappedMessages);
                          }
                        }
                      } catch (error) {
                        console.warn(
                          'Widget: Failed to load messages after conversation creation:',
                          error,
                        );
                      }
                    })();
                  }
                } else if (evt === 'conversation.status_changed') {
                  const newStatus = data?.status || data?.new_status;
                  const isStartingNewConversation =
                    startNewConversationIntentRef.current && !conversationIdRef.current;
                  if (isStartingNewConversation && newStatus === 'resolved') {
                    return;
                  }
                  if (newStatus && ['open', 'resolved', 'pending', 'snoozed'].includes(newStatus)) {
                    setConversationStatus(newStatus as ConversationStatus);
                  }
                } else if (evt === 'conversation.updated') {
                  const newStatus = data?.status || data?.new_status;
                  const isStartingNewConversation =
                    startNewConversationIntentRef.current && !conversationIdRef.current;
                  if (isStartingNewConversation && newStatus === 'resolved') {
                    return;
                  }
                  if (newStatus && ['open', 'resolved', 'pending', 'snoozed'].includes(newStatus)) {
                    setConversationStatus(newStatus as ConversationStatus);
                  }
                } else if (evt === 'presence.update') {
                  const users = (payload?.data && payload.data.users) || [];
                  setOnline(Array.isArray(users) ? users.length > 0 : !!users);
                }
              } catch (e) {
                console.error('❌ Widget: Error processing message', e);
              }
            },
          });
        }
        // Only load messages if we haven't already started (for identified users)
        if (!hasStarted) {
          const data = await widgetService.getMessages(token);
          const list = data?.data?.messages || [];

          // Extract conversation ID from messages or config
          if (list.length > 0 && list[0]?.conversation_id) {
            setConversationIdSync(list[0].conversation_id);
          } else if ((cfg as any)?.contact?.conversation_id) {
            setConversationIdSync((cfg as any).contact.conversation_id);
          }

          if (Array.isArray(list) && list.length > 0) {
            const mappedMessages = list.map((m: any) => {
              const messageId = String(m.id ?? Math.random());
              // Mark messages as processed to avoid WebSocket duplicates
              processedMessageIds.current.add(messageId);
              const isSystemMessage = m.message_type === 2 || m.message_type === 3;

              // Process reply-to information for historical messages
              let replyTo = undefined;
              if (m.content_attributes?.in_reply_to) {
                const replyToId = m.content_attributes.in_reply_to;
                const originalMessage = list.find((msg: any) => msg.id === replyToId);
                if (originalMessage) {
                  replyTo = {
                    id: replyToId,
                    text: originalMessage.content || '',
                    sender:
                      originalMessage.message_type === 0
                        ? originalMessage.sender?.name || t('chat.user')
                        : t('chat.agent'),
                    type: originalMessage.message_type === 0 ? ('out' as const) : ('in' as const),
                  };
                }
              }

              return {
                id: messageId,
                type:
                  m.message_type === 'outgoing' || m.message_type === 0
                    ? ('out' as const)
                    : ('in' as const),
                text: m.content || '',
                ts: m.created_at
                  ? typeof m.created_at === 'number'
                    ? m.created_at * 1000
                    : Date.parse(m.created_at)
                  : Date.now(),
                status: 'sent' as const,
                avatarUrl:
                  m.message_type === 'outgoing' || m.message_type === 0 || isSystemMessage
                    ? undefined
                    : ui.avatarUrl || undefined,
                isSystem: isSystemMessage,
                replyTo,
                // Map attachments from backend format
                attachments: m.attachments
                  ? m.attachments.map((att: any) => ({
                      id: att.id,
                      file_url: att.file_url || att.data_url,
                      data_url: att.data_url,
                      thumb_url: att.thumb_url,
                      file_type: att.file_type,
                      file_size: att.file_size,
                      fallback_title:
                        att.fallback_title ||
                        `${t('chat.file')} (${
                          att.file_size ? Math.round(att.file_size / 1024) : 0
                        } KB)`,
                    }))
                  : undefined,
              };
            });
            setMessagesWithPagination(mappedMessages);
            setHasStarted(true);
          }
        }
      } catch (e) {
        // noop: likely first load without conversation/cookies
      }
    })();
  }, []);

  // Auto-resize: observe height and inform parent
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new (window as any).ResizeObserver((entries: any[]) => {
      for (const entry of entries) {
        const h = Math.ceil(entry.contentRect.height);
        postParent('set-height', { height: h });
      }
    });
    ro.observe(el);
    // initial
    postParent('set-height', { height: el.getBoundingClientRect().height });
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      cableRef.current?.disconnect();
    },
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('website_token') || '';
    if (!token) return;

    const interval = setInterval(() => {
      refreshConversationStatus(token);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const updateUploadProgress = (
    uploadId: string,
    progress: number,
    status: 'uploading' | 'completed' | 'failed',
    error?: string,
  ) => {
    setPendingUploads(prev =>
      prev.map(upload =>
        upload.id === uploadId
          ? {
              ...upload,
              progress: {
                ...upload.progress,
                progress,
                status,
                error,
              },
            }
          : upload,
      ),
    );
  };

  const handleSendAttachments = async (uploads: AttachmentUpload[], message?: string) => {
    const echoId = uuidv4();

    // Create optimistic message with attachments
    const optimistic: MessageItem = {
      id: echoId,
      type: 'out',
      text: message || '',
      ts: Date.now(),
      status: 'sending',
      echoId,
      attachments: uploads.map(upload => {
        const previewUrl = upload.preview || URL.createObjectURL(upload.file);
        return {
          id: upload.id,
          file_url: previewUrl,
          data_url: previewUrl,
          file_type: upload.file.type,
          file_size: upload.file.size,
          fallback_title: upload.file.name,
        };
      }),
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) return;

      const files = uploads.map(upload => upload.file);

      // Update progress for all files
      uploads.forEach(upload => {
        updateUploadProgress(upload.id, 50, 'uploading');
      });

      // Send files
      await widgetService.sendMultipleAttachments(token, files, message, undefined, echoId);

      // Update progress to completed
      uploads.forEach(upload => {
        updateUploadProgress(upload.id, 100, 'completed');
      });

      // Clear pending uploads
      setTimeout(() => {
        setPendingUploads([]);
      }, 1000);
    } catch (error) {
      console.error('❌ Widget: Failed to send attachments:', error);

      // Mark all uploads as failed
      uploads.forEach(upload => {
        updateUploadProgress(upload.id, 0, 'failed', 'Upload failed');
      });

      // Mark message as failed
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? { ...m, status: 'failed' } : m)));
    }
  };

  const handleSend = (text: string, replyTo?: string | number | null) => {
    if (conversationStatus === 'resolved' && !forceNewConversationRef.current) {
      showToast(t('toast.conversationEnded'), 'info');
      return;
    }

    const echoId = uuidv4();

    let replyToObj = undefined;
    if (replyTo) {
      const originalMessage = messages.find(m => m.id === replyTo);
      if (originalMessage && originalMessage.type !== 'system') {
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
      replyTo: replyToObj,
    };
    setMessages(prev => [...prev, optimistic]);
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('website_token') || '';
        if (!token) return;

        await widgetService.getConfig(token);

        const contact = {
          name: currentUser.name || '',
          email: currentUser.email || '',
          phone_number: currentUser.phone_number || '',
        };

        const { conversationId: resolvedConversationId, createdWithMessage } = await ensureConversationForSend(token, text, contact);
        if (!createdWithMessage) {
          try {
            await widgetService.sendMessage(
              token,
              text,
              replyTo ? String(replyTo) : undefined,
              echoId,
              resolvedConversationId || undefined,
            );
            setMessages(prev =>
              prev.map(m => (m.id === optimistic.id ? { ...m, status: 'sent' } : m)),
            );
          } catch (err) {
            console.error('Widget: Failed to send message via HTTP, relying on WebSocket:', err);
            setTimeout(() => {
              setMessages(prev => {
                const message = prev.find(m => m.id === optimistic.id);
                if (message?.status === 'sending') {
                  return prev.map(m => (m.id === optimistic.id ? { ...m, status: 'failed' } : m));
                }
                return prev;
              });
            }, 10000);
          }
        }
      } catch (e) {
        console.error('Widget: handleSend error:', e);
        setMessages(prev =>
          prev.map(m =>
            m.id === optimistic.id && m.status === 'sending' ? { ...m, status: 'failed' } : m,
          ),
        );
      }
    })();
  };

  const handleSelectOption = async (message: MessageItem, item: { title?: string; value?: string }) => {
    const title = (item.title || '').trim();
    const value = (item.value || '').trim();
    const selectedText = title || value;
    if (!selectedText) return;

    setMessages(prev =>
      prev.map(m =>
        m.id === message.id ? { ...m, submittedValues: { name: 'choice', title, value: value || title } } : m,
      ),
    );

    handleSend(selectedText);

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) return;

      const messageId = message.originalId || message.id;
      await widgetService.updateMessageSubmittedValues(token, messageId, {
        name: 'choice',
        title,
        value: value || title,
      });
    } catch (e) {
      return;
    }
  };

  const handlePreChatSubmit = async (preChatData: PreChatSubmissionData) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('website_token') || '';
    if (!token) return;

    setIsCreatingConversation(true);

    try {
      // Get stored user info and custom attributes from postMessage
      const storedUser = sessionStorage.getItem('evo_widget_user');
      const storedAttrs = sessionStorage.getItem('evo_widget_custom_attrs');

      // Merge with stored data
      const mergedData: PreChatSubmissionData = {
        ...preChatData,
        contactCustomAttributes: {
          ...preChatData.contactCustomAttributes,
          ...(storedAttrs ? JSON.parse(storedAttrs) : {}),
        },
      };

      // Add stored user info to contact data
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.identifier && !mergedData.fullName) {
          mergedData.fullName = userData.identifier;
        }
        if (userData.email && !mergedData.emailAddress) {
          mergedData.emailAddress = userData.email;
        }
      }

      await widgetService.getConfig(token);

      try {
        const existingConversationId = await findExistingConversationId(token);
        if (!existingConversationId) {
          const newConv = await widgetService.createConversationFromPreChat(token, mergedData);
          if (newConv?.conversation?.id) {
            syncConversationId(String(newConv.conversation.id));
          }
        }

        // Load messages
        const data = await widgetService.getMessages(token);
        const list = data?.data?.messages || [];

        // Update conversation ID if we have messages but no conversation ID yet
        if (list.length > 0 && list[0]?.conversation_id && !conversationIdRef.current) {
          syncConversationId(String(list[0].conversation_id));
        }

        // Map messages to UI format
        if (Array.isArray(list) && list.length > 0) {
          const mappedMessages = list.map((m: any) => {
            const messageId = String(m.id ?? Math.random());
            // Mark messages as processed to avoid WebSocket duplicates
            processedMessageIds.current.add(messageId);

            const isSystemMessage = m.message_type === 2 || m.message_type === 3;

            // Process reply-to information for historical messages
            let replyTo = undefined;
            if (m.content_attributes?.in_reply_to) {
              const replyToId = m.content_attributes.in_reply_to;
              const originalMessage = list.find((msg: any) => msg.id === replyToId);
              if (originalMessage) {
                replyTo = {
                  id: replyToId,
                  text: originalMessage.content || '',
                  sender:
                    originalMessage.message_type === 0
                      ? originalMessage.sender?.name || 'Usuário'
                      : 'Atendente',
                  type: originalMessage.message_type === 0 ? ('out' as const) : ('in' as const),
                };
              }
            }

            return {
              id: messageId,
              type:
                m.message_type === 'outgoing' || m.message_type === 0
                  ? ('out' as const)
                  : ('in' as const),
              text: m.content || '',
              ts: m.created_at
                ? typeof m.created_at === 'number'
                  ? m.created_at * 1000
                  : Date.parse(m.created_at)
                : Date.now(),
              status: 'sent' as const,
              avatarUrl:
                m.message_type === 'outgoing' || m.message_type === 0 || isSystemMessage
                  ? undefined
                  : ui.avatarUrl || undefined,
              isSystem: isSystemMessage,
              replyTo,
              // Map attachments from backend format
              attachments: m.attachments
                ? m.attachments.map((att: any) => ({
                    id: att.id,
                    file_url: att.file_url || att.data_url,
                    data_url: att.data_url,
                    thumb_url: att.thumb_url,
                    file_type: att.file_type,
                    file_size: att.file_size,
                    fallback_title:
                      att.fallback_title ||
                      `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
                  }))
                : undefined,
            };
          });
          setMessagesWithPagination(mappedMessages);
        }

        // Always transition to chat interface after successful conversation creation
        setHasStarted(true);
      } catch (apiError: any) {
        // Handle server-side validation errors (422)
        const status = apiError?.response?.status ?? apiError?.status;
        const data = apiError?.response?.data ?? apiError?.data;
        if (status === 422 && data?.code === 'PRE_CHAT_VALIDATION_ERROR' && data?.errors) {
          setPreChatServerErrors(data.errors);
          return;
        }

        // If HTTP API fails (e.g., CORS), rely on WebSocket events for state transition
        // The WebSocket will handle setting hasStarted when conversation.created event arrives
        console.warn('Widget: API call failed, relying on WebSocket events:', apiError);

        // Fallback: If no WebSocket event arrives within 3 seconds, force transition
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

  // Reply-to system functions
  const handleReplyToMessage = (message: MessageItem) => {
    setReplyToMessage(message);
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  // Typing indicators functions
  const toggleUserTyping = (isTyping: boolean) => {
    if (!conversationIdRef.current) return;

    if (isTyping) {
      // Clear existing timeout
      if (userTypingTimeout) {
        clearTimeout(userTypingTimeout);
      }

      // Send typing indicator to API
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (token && cableRef.current) {
        cableRef.current.send({
          type: 'typing_on',
          conversation_id: conversationIdRef.current,
        });
      }

      // Set timeout to stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        if (token && cableRef.current) {
          cableRef.current.send({
            type: 'typing_off',
            conversation_id: conversationIdRef.current,
          });
        }
      }, 3000);

      setUserTypingTimeout(timeout);
    } else {
      // Send stop typing immediately
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (token && cableRef.current) {
        cableRef.current.send({
          type: 'typing_off',
          conversation_id: conversationIdRef.current,
        });
      }

      if (userTypingTimeout) {
        clearTimeout(userTypingTimeout);
        setUserTypingTimeout(null);
      }
    }
  };

  const handleFileUpload = (file: File) => {
    // Create a fake AttachmentUpload for the existing file
    const fakeUpload: AttachmentUpload = {
      id: uuidv4(),
      file,
      preview: URL.createObjectURL(file),
      progress: {
        id: uuidv4(),
        progress: 0,
        status: 'uploading',
      },
    };

    // Use our new attachment handling logic
    handleSendAttachments([fakeUpload]);
  };

  const loadOlderMessages = async () => {
    if (isLoadingOlderMessages || !hasMoreMessages || !oldestMessageId) {
      return;
    }

    setIsLoadingOlderMessages(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) return;

      const data = await widgetService.getMessages(token, { before: oldestMessageId });
      const list = data?.data?.messages || [];

      if (list.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      // Transform messages same way as initial load
      const mappedMessages: MessageItem[] = list.map((m: any) => {
        // Process reply-to information
        let replyTo = undefined;
        if (m.content_attributes?.in_reply_to) {
          const replyToId = m.content_attributes.in_reply_to;
          const originalMessage = list.find((msg: any) => msg.id === replyToId);
          if (originalMessage) {
            replyTo = {
              id: replyToId,
              text: originalMessage.content || '',
              sender:
                originalMessage.message_type === 0
                  ? originalMessage.sender?.name || 'User'
                  : 'Atendente',
              type: originalMessage.message_type === 0 ? ('out' as const) : ('in' as const),
            };
          }
        }

        const isSystemMessage = m.message_type === 2 || m.message_type === 3;
        return {
          id: String(m.id),
          originalId: m.id, // Keep original ID (UUID) for backend queries
          type:
            m.message_type === 'outgoing' || m.message_type === 0
              ? ('out' as const)
              : ('in' as const),
          text: m.content || '',
          ts: m.created_at
            ? typeof m.created_at === 'number'
              ? m.created_at * 1000
              : Date.parse(m.created_at)
            : undefined,
          avatarUrl: isSystemMessage ? undefined : m.sender?.avatar_url,
          isSystem: isSystemMessage,
          attachments: m.attachments?.map((att: any) => ({
            id: att.id,
            file_url: att.file_url || att.data_url,
            data_url: att.data_url,
            file_type: att.file_type,
            file_size: att.file_size,
            fallback_title: att.fallback_title || att.file_name,
          })),
          replyTo,
        };
      });

      const sortedOlderMessages = [...mappedMessages].sort((a, b) => (a.ts || 0) - (b.ts || 0));

      // Prepend older messages to the beginning of the list
      setMessages(prev => [...sortedOlderMessages, ...prev]);

      // Update oldest message ID for next pagination
      if (sortedOlderMessages.length > 0) {
        const oldestMessage = sortedOlderMessages[0];
        setOldestMessageId(String(oldestMessage.originalId || oldestMessage.id));
      }

      // If we got fewer messages than expected, we might be at the end
      if (sortedOlderMessages.length < 20) {
        // Assuming backend returns max 20 messages per page
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Widget: Failed to load older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  // Minimal placeholder (Phase 1)
  // const params = new URLSearchParams(window.location.search);
  // const token = params.get('website_token');

  return (
    <div
      ref={rootRef}
      className="w-full h-full flex flex-col bg-white"
      style={{
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
      }}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <Header
          title={ui.title || t('header.defaultTitle')}
          subtitle={ui.subtitle || t('header.defaultSubtitle')}
          color={ui.color || '#00d4aa'}
          online={online}
          avatarUrl={ui.avatarUrl}
          replyTime={enhancedConfig.replyWaitMessage || replyTime}
          websiteToken={new URLSearchParams(window.location.search).get('website_token') || ''}
          canEndConversation={enhancedConfig.canEndConversation}
          hasEndConversationEnabled={enhancedConfig.hasEndConversationEnabled}
          onConversationEnded={handleEndConversation}
          onError={error => showToast(error, 'error')}
        />
      </div>
      {(() => {
        // Check if user is already identified (has real email or custom identifier)
        // Ignore auto-generated names like "solitary-star-833", "thrumming-lake-715"
        const hasRealEmail = currentUser.email && currentUser.email.length > 0;
        const hasCustomIdentifier = currentUser.identifier && currentUser.identifier.length > 0;
        const hasRealName =
          currentUser.name &&
          currentUser.name.length > 0 &&
          !currentUser.name.match(/^[a-z]+-[a-z]+-\d{3}$/); // Pattern: word-word-number
        const isUserIdentified = hasRealEmail || hasCustomIdentifier || hasRealName;

        // Show pre-chat form only if:
        // 1. Chat hasn't started yet AND
        // 2. Pre-chat is enabled AND
        // 3. User is NOT already identified
        if (!hasStarted && widgetConfig.preChatFormEnabled && !isUserIdentified) {
          return (
            <div className="flex-1 overflow-hidden">
              <PreChatForm
                config={widgetConfig}
                currentUser={currentUser}
                activeCampaign={activeCampaign}
                widgetColor={ui.color || '#00d4aa'}
                onSubmit={(data) => { setPreChatServerErrors({}); handlePreChatSubmit(data); }}
                isLoading={isCreatingConversation}
                serverErrors={preChatServerErrors}
              />
            </div>
          );
        } else {
          return (
            <>
              {/* Scrollable Messages Area */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <MessageList
                  items={messages}
                  inboundAvatarUrl={ui.avatarUrl}
                  onRetry={(_id, text) => handleSend(text)}
                  onReply={handleReplyToMessage}
                  onSelectOption={handleSelectOption}
                  widgetColor={ui.color || '#00d4aa'}
                  onLoadMore={loadOlderMessages}
                  isLoadingMore={isLoadingOlderMessages}
                  hasMore={hasMoreMessages}
                  onEmailSubmitted={(email) => {
                    setCurrentUser(prev => ({ ...prev, email }));
                  }}
                />

                {/* Typing indicator */}
                <TypingIndicator
                  isVisible={isAgentTyping}
                  avatarUrl={ui.avatarUrl}
                  agentName={t('chat.agent')}
                />
              </div>

              {/* Fixed Footer Area */}
              <div className="flex-shrink-0 bg-white">
                {/* Show pending uploads */}
                {pendingUploads.length > 0 && (
                  <div className="border-t border-gray-200 p-3 bg-white">
                    <div className="text-sm text-gray-600 mb-2">{t('chat.uploadingFiles')}</div>
                    {pendingUploads.map(upload => (
                      <div key={upload.id} className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500 flex-1 truncate">
                          {upload.file.name}
                        </span>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Email Transcript Button - show only if user has email */}
                {enhancedConfig.showEmailTranscriptButton && messages.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
                    <div className="flex justify-end">
                      <EmailTranscriptButton
                        websiteToken={
                          new URLSearchParams(window.location.search).get('website_token') || ''
                        }
                        onSuccess={() => showToast(t('toast.emailTranscriptSuccess'), 'success')}
                        onError={error => showToast(error, 'error')}
                        widgetColor={ui.color || '#00d4aa'}
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Footer - either input or start new conversation button */}
                {enhancedConfig.hideReplyBox ? (
                  <StartNewConversationButton
                    onStartNew={handleStartNewConversation}
                    widgetColor={ui.color || '#00d4aa'}
                  />
                ) : (
                  <FooterReplyTo
                    replyToMessage={replyToMessage}
                    onClearReply={handleClearReply}
                    onSend={handleSend}
                    onUpload={handleFileUpload}
                    isUploading={pendingUploads.length > 0}
                    widgetColor={ui.color || '#00d4aa'}
                    onTyping={toggleUserTyping}
                  />
                )}
              </div>

              {/* Toast Notifications */}
              {toastMessage && (
                <Toast
                  message={toastMessage}
                  type={toastType}
                  onClose={() => setToastMessage(null)}
                />
              )}
            </>
          );
        }
      })()}
    </div>
  );
}
