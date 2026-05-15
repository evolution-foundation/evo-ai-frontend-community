import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { usePersistence } from '@/hooks/chat/usePersistence';
import { MessagesProvider, useMessages as useMessagesOriginal } from '@/contexts/chat/MessagesContext';
import { ConversationsProvider } from '@/contexts/chat/ConversationsContext';
import { useConversations as useConversationsOriginal } from '@/hooks/chat/useConversations';
import { FiltersProvider, useFilters as useFiltersOriginal } from '@/contexts/chat/FiltersContext';
import {
  WebSocketProvider,
  useWebSocketContext as useWebSocketContextOriginal,
} from '@/contexts/chat/WebSocketContext';
import { UIProvider, useUI as useUIOriginal } from '@/contexts/chat/UIContext';
import {
  Conversation,
  Message,
  ConversationFilter,
  ConversationListParams,
  MESSAGE_TYPE,
} from '@/types/chat/api';
import { ConversationsContextValue } from '@/types/chat/conversations';
import { useAppDataStore } from '@/store/appDataStore';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound, getAudioSettings } from '@/utils/audioNotificationUtils';
import { normalizeToUnixSeconds } from '@/utils/time/timeHelpers';

function doesConversationMatchFilters(
  conversation: Conversation,
  activeFilters: ConversationFilter[],
  currentUserId?: string,
): boolean {
  if (!activeFilters || activeFilters.length === 0) return true;

  return activeFilters.every(filter => {
    const { attribute_key, filter_operator, values } = filter;
    if (!values || values.length === 0) return true;
    const stringValues = values.map(v => String(v));
    if (stringValues.some(v => v.toLowerCase() === 'all')) return true;

    let conversationValue: string | null | undefined;

    switch (attribute_key) {
      case 'status':
        conversationValue = conversation.status;
        break;
      case 'inbox_id':
        conversationValue = conversation.inbox_id ? String(conversation.inbox_id) : undefined;
        break;
      case 'assignee_id': {
        const val = String(values[0]);
        if (val === 'me') {
          const meMatches = currentUserId
            ? conversation.assignee_id != null && String(conversation.assignee_id) === String(currentUserId)
            : false;
          return filter_operator === 'not_equal_to' ? !meMatches : meMatches;
        }
        if (val === 'unassigned') {
          const isUnassigned = !conversation.assignee_id;
          return filter_operator === 'not_equal_to' ? !isUnassigned : isUnassigned;
        }
        if (val === 'assigned') {
          const isAssigned = !!conversation.assignee_id;
          return filter_operator === 'not_equal_to' ? !isAssigned : isAssigned;
        }
        conversationValue = conversation.assignee_id ? String(conversation.assignee_id) : null;
        break;
      }
      case 'team_id':
        conversationValue = conversation.team_id ? String(conversation.team_id) : null;
        break;
      case 'channel_type':
        conversationValue = conversation.channel || undefined;
        break;
      default:
        return true;
    }

    if (filter_operator === 'equal_to') {
      return conversationValue != null && stringValues.includes(String(conversationValue));
    }
    if (filter_operator === 'not_equal_to') {
      return conversationValue == null || !stringValues.includes(String(conversationValue));
    }
    if (filter_operator === 'contains') {
      return conversationValue != null && stringValues.some(v => String(conversationValue).includes(v));
    }
    if (filter_operator === 'does_not_contain') {
      return conversationValue == null || !stringValues.some(v => String(conversationValue).includes(v));
    }

    return true;
  });
}

interface ChatContextValue {
  // All sub-contexts
  messages: ReturnType<typeof useMessagesOriginal>;
  conversations: ConversationsContextValue;
  filters: ReturnType<typeof useFiltersOriginal>;
  websocket: ReturnType<typeof useWebSocketContextOriginal>;
  ui: ReturnType<typeof useUIOriginal>;

  // Computed values (combined from sub-contexts)
  selectedConversation: Conversation | null;
  selectedMessages: Message[];
  filteredConversations: Conversation[];

  // Integrated actions (combining multiple contexts)
  loadConversationsWithFilters: (params?: ConversationListParams) => Promise<void>;
  selectConversationAndLoadMessages: (conversationId: string | null) => Promise<void>;
  applyFiltersAndReload: (filters: ConversationFilter[]) => Promise<void>;
  applySearchAndReload: (searchTerm: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// Hook para integrar todas as funcionalidades
function useChatIntegration() {
  const messages = useMessagesOriginal();
  const conversations = useConversationsOriginal();
  const filters = useFiltersOriginal();
  const websocket = useWebSocketContextOriginal();
  const ui = useUIOriginal();
  const { saveState, loadState } = usePersistence();
  const { user: currentUser } = useAuth();
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const activeFiltersRef = useRef<ConversationFilter[]>(filters.state.activeFilters);
  const attachmentReloadTimersRef = useRef<Record<string, number>>({});
  useEffect(() => {
    activeFiltersRef.current = filters.state.activeFilters;
  }, [filters.state.activeFilters]);
  useEffect(() => {
    return () => {
      Object.values(attachmentReloadTimersRef.current).forEach(timerId => {
        window.clearTimeout(timerId);
      });
      attachmentReloadTimersRef.current = {};
    };
  }, []);
  const MAX_PROCESSED_IDS = 500;

  const shouldReloadMessageForMissingImageData = useCallback((message: Message): boolean => {
    const isImageByContentType = String(message.content_type || '').toLowerCase() === 'image';
    const attachments = message.attachments || [];
    const hasImageAttachment = attachments.some(
      attachment => String(attachment.file_type || '').toLowerCase() === 'image',
    );
    const hasRenderableImageAttachment = attachments.some(attachment => {
      const isImage = String(attachment.file_type || '').toLowerCase() === 'image';
      if (!isImage) return false;
      const hasDataUrl = !!(attachment.data_url && attachment.data_url.trim() !== '');
      const hasThumbUrl = !!(attachment.thumb_url && attachment.thumb_url.trim() !== '');
      return hasDataUrl || hasThumbUrl;
    });

    if (isImageByContentType && attachments.length === 0) {
      return true;
    }

    if (isImageByContentType && hasImageAttachment && !hasRenderableImageAttachment) {
      return true;
    }

    if (hasImageAttachment && !hasRenderableImageAttachment) {
      return true;
    }

    return false;
  }, []);

  // Computed values
  const selectedConversation = conversations.selectedConversation;
  const selectedMessages = selectedConversation
    ? messages.getMessages(selectedConversation.id)
    : [];
  // 🔧 FIX: Ordenar conversas por last_activity_at para garantir ordem correta em tempo real
  const filteredConversations = useMemo(() => {
    return [...conversations.state.conversations].sort((a, b) => {
      const aTime = new Date(a.last_activity_at || a.created_at).getTime();
      const bTime = new Date(b.last_activity_at || b.created_at).getTime();
      return bTime - aTime; // Mais recente primeiro
    });
  }, [conversations.state.conversations]);

  // Integrar WebSocket com outros contextos
  useEffect(() => {
    websocket.registerHandlers({
      onMessageCreated: (message: Message) => {
        if (!message || !message.id || !message.conversation_id) {
          console.warn('⚠️ WEBSOCKET: Mensagem inválida recebida, ignorando:', message);
          return;
        }

        const conversationId = String(message.conversation_id);
        const findConversationByAnyId = (id: string): Conversation | null => {
          const idStr = String(id);
          return (
            conversations.state.conversations.find(
              conv =>
                String(conv.id) === idStr ||
                String(conv.uuid || '') === idStr,
            ) || null
          );
        };
        const conversation = findConversationByAnyId(conversationId);

        if (!conversation && activeFiltersRef.current.length > 0) {
          return;
        }

        if (processedMessageIdsRef.current.has(message.id)) {
          return;
        }
        processedMessageIdsRef.current.add(message.id);
        if (processedMessageIdsRef.current.size > MAX_PROCESSED_IDS) {
          processedMessageIdsRef.current.clear();
          processedMessageIdsRef.current.add(message.id);
        }

        if (message.content === null || message.content === undefined) {
          message.content = '';
        }

        if (!Array.isArray(message.attachments)) {
          message.attachments = [];
        }

        message.attachments = message.attachments.map(att => ({
          ...att,
          data_url: att.data_url && att.data_url.trim() !== '' ? att.data_url : '',
          thumb_url: att.thumb_url || null,
          external_url: att.external_url || undefined,
        }));

        const targetConversationId = conversation ? String(conversation.id) : conversationId;
        const existingMessages = messages.getMessages(targetConversationId);
        const messageExistsById = existingMessages.some(msg => msg.id === message.id);

        if (messageExistsById) {
          return;
        }

        if (message.echo_id && message.message_type === MESSAGE_TYPE.OUTGOING) {
          messages.replaceMessage(targetConversationId, message.echo_id, message);
          if (conversation) {
            const validTs = normalizeToUnixSeconds(message.created_at);
            conversations.updateConversation({
              ...conversation,
              timestamp: validTs,
              last_activity_at: new Date(validTs * 1000).toISOString(),
              last_non_activity_message: {
                id: message.id,
                content: message.content ?? '',
                message_type: message.message_type,
                created_at:
                  typeof message.created_at === 'number'
                    ? String(message.created_at)
                    : (message.created_at ?? new Date(validTs * 1000).toISOString()),
                processed_message_content:
                  (message as { processed_message_content?: string }).processed_message_content ??
                  message.content ??
                  '',
                sender: message.sender ?? { id: '', name: '', type: 'contact' },
              },
            });
          }
          return;
        }

        messages.addMessage(targetConversationId, message);

        if (!conversation) {
          if (message.message_type === MESSAGE_TYPE.INCOMING) {
            conversations.incrementUnreadCount(targetConversationId);
          }
          return;
        }

        if (conversation && conversation.id) {
          // Verificar se a conversa está aberta (selecionada) - usar URL como fonte da verdade
          const urlPath = window.location.pathname;
          const urlMatch = urlPath.match(/\/conversations\/([^/]+)/);
          const urlConversationId = urlMatch ? urlMatch[1] : null;
          const urlConversation = urlConversationId ? findConversationByAnyId(urlConversationId) : null;
          const canonicalUrlConversationId = urlConversation
            ? String(urlConversation.uuid || urlConversation.id)
            : urlConversationId;
          const currentConversationId =
            canonicalUrlConversationId ||
            (conversations.state.selectedConversationId
              ? String(conversations.state.selectedConversationId)
              : null);
          const messageConversationId = targetConversationId;
          const isConversationOpen = currentConversationId === messageConversationId;
          const isIncomingMessage = message.message_type === MESSAGE_TYPE.INCOMING;

          // Se a conversa está aberta e é mensagem recebida, marcar como lida automaticamente
          if (isConversationOpen && isIncomingMessage) {
            // Marcar como lida no localStorage
            try {
              const saved = localStorage.getItem('crm-chat-state');
              const currentState = saved ? JSON.parse(saved) : {};
              const readConversations = currentState.readConversations || {};
              readConversations[targetConversationId] = true; // Marcar como lida
              localStorage.setItem(
                'crm-chat-state',
                JSON.stringify({
                  ...currentState,
                  readConversations,
                }),
              );
            } catch (error) {
              console.warn('Failed to update read conversation in localStorage:', error);
            }

            // Atualizar estado local para garantir que está marcada como lida
            conversations.updateUnreadCount(targetConversationId, 0);
          } else if (!isConversationOpen && isIncomingMessage) {
            try {
              const saved = localStorage.getItem('crm-chat-state');
              const currentState = saved ? JSON.parse(saved) : {};
              const readConversations = currentState.readConversations || {};
              delete readConversations[targetConversationId]; // Remover marcação de lida
              localStorage.setItem(
                'crm-chat-state',
                JSON.stringify({
                  ...currentState,
                  readConversations,
                }),
              );
            } catch (error) {
              console.warn('Failed to remove read mark from localStorage:', error);
            }

            // Incrementar contador de não lidas
            conversations.incrementUnreadCount(targetConversationId);
          }

          const validTimestamp = normalizeToUnixSeconds(message.created_at);

          // Preservar unread_count atual do estado ao atualizar conversa via WebSocket
          const currentUnreadCount = conversations.getUnreadCount(targetConversationId);

          const updatedConversation: Conversation = {
            ...conversation,
            timestamp: validTimestamp,
            last_activity_at: new Date(validTimestamp * 1000).toISOString(),
            unread_count: currentUnreadCount ?? conversation.unread_count ?? 0,
            last_non_activity_message: {
              id: message.id,
              content: message.content ?? '',
              message_type: message.message_type,
              created_at:
                typeof message.created_at === 'number'
                  ? String(message.created_at)
                  : (message.created_at ?? new Date(validTimestamp * 1000).toISOString()),
              processed_message_content:
                (message as { processed_message_content?: string }).processed_message_content ??
                message.content ??
                '',
              sender: message.sender ?? { id: '', name: '', type: 'contact' },
            },
          };

          conversations.updateConversation(updatedConversation);

          if (shouldReloadMessageForMissingImageData(message)) {
            const existingTimer = attachmentReloadTimersRef.current[targetConversationId];
            if (existingTimer) {
              window.clearTimeout(existingTimer);
            }

            attachmentReloadTimersRef.current[targetConversationId] = window.setTimeout(() => {
              messages.loadMessages(targetConversationId).catch(() => {
                return;
              });
              delete attachmentReloadTimersRef.current[targetConversationId];
            }, 1200);
          }

          // Toast e som apenas se a conversa NÃO está aberta e é mensagem recebida
          if (!isConversationOpen && isIncomingMessage) {
            // 🧹 LIMPAR HTML do content para toast
            const stripHtml = (html: string): string => {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;
              return tempDiv.textContent || tempDiv.innerText || '';
            };

            const cleanContent = message.content
              ? stripHtml(message.content).substring(0, 100)
              : 'Mensagem recebida';

            toast.info(`Nova mensagem de ${message.sender?.name || 'Contato'}`, {
              description: cleanContent,
            });

            // Play notification sound if enabled and conversation is assigned to current user
            if (currentUser) {
              const isAssignedToMe = conversation.assignee_id === currentUser.id;

              if (isAssignedToMe) {
                const audioSettings = getAudioSettings();

                if (audioSettings.enable_audio_alerts) {
                  // Play sound for assigned conversations when conversation is closed
                  setTimeout(() => {
                    playNotificationSound(audioSettings, () => true).catch(error => {
                      console.error('❌ Error playing notification sound for new message:', error);
                    });
                  }, 100);
                }
              }
            }
          }
        } else {
          console.warn('onNewMessage: Invalid conversation data', conversation);
        }
      },

      onMessageUpdated: (message: Message) => {
        const conversationId = String(message.conversation_id);
        messages.updateMessage(conversationId, message);

        const conversation = conversations.getConversation(conversationId);
        if (!conversation) {
          return;
        }

        const validTimestamp = normalizeToUnixSeconds(message.created_at);
        const updatedConversationBase: Conversation = {
          ...conversation,
          timestamp: validTimestamp,
          last_activity_at: new Date(validTimestamp * 1000).toISOString(),
        };

        if (message.message_type === MESSAGE_TYPE.ACTIVITY) {
          conversations.updateConversation(updatedConversationBase);
          return;
        }

        conversations.updateConversation({
          ...updatedConversationBase,
          last_non_activity_message: {
            id: message.id,
            content: message.content ?? '',
            message_type: message.message_type,
            created_at:
              typeof message.created_at === 'number'
                ? String(message.created_at)
                : (message.created_at ?? new Date(validTimestamp * 1000).toISOString()),
            processed_message_content:
              (message as { processed_message_content?: string }).processed_message_content ??
              message.content ??
              '',
            sender: message.sender ?? { id: '', name: '', type: 'contact' },
          },
        });

        if (shouldReloadMessageForMissingImageData(message)) {
          const existingTimer = attachmentReloadTimersRef.current[conversationId];
          if (existingTimer) {
            window.clearTimeout(existingTimer);
          }

          attachmentReloadTimersRef.current[conversationId] = window.setTimeout(() => {
            messages.loadMessages(conversationId).catch(() => {
              return;
            });
            delete attachmentReloadTimersRef.current[conversationId];
          }, 1200);
        }
      },

      onConversationCreated: (conversation: Conversation) => {
        if (!doesConversationMatchFilters(conversation, activeFiltersRef.current, currentUser?.id)) {
          conversations.addHiddenConversation(conversation);
          return;
        }
        conversations.addConversation(conversation);
      },

      onConversationUpdated: (conversation: Partial<Conversation> & { id: string }) => {
        if (!conversation || !conversation.id) {
          console.warn('⚠️ WebSocket: Dados inválidos recebidos', conversation);
          return;
        }

        const conversationId = String(conversation.id);
        const existingConversation = conversations.getConversation(conversationId);

        // Merge WS partial data with existing conversation.
        // When existing data is present, spread produces a complete Conversation.
        // For unknown conversations (no existing), cast the partial — filter checks
        // gracefully handle missing fields via optional chaining.
        const mergedConversation: Conversation = existingConversation
          ? { ...existingConversation, ...conversation }
          : conversation as Conversation;

        const matchesFilters = doesConversationMatchFilters(mergedConversation, activeFiltersRef.current, currentUser?.id);
        const existsInList = !!existingConversation;

        if (!matchesFilters) {
          conversations.addHiddenConversation(mergedConversation);
          if (existsInList) {
            conversations.removeConversation(conversationId);
          }
          return;
        }

        // Conversation now matches filters but wasn't in the list (e.g. just
        // assigned to me while viewing "Mine" tab) — add it so the list updates
        // without requiring a manual refresh. Fall through to updateConversation
        // which handles both add-if-missing and update-if-exists.

        // 🔒 PROTEÇÃO: Se esta conversa está selecionada (foi marcada como lida),
        // preservar o unread_count do estado local em vez de usar o valor do WebSocket
        const isSelected = String(conversations.state.selectedConversationId) === conversationId;
        const localUnreadCount = conversations.getUnreadCount(conversationId);

        // Se está selecionada e foi marcada como lida (unreadCount = 0), preservar isso
        const updatedConversation =
          isSelected && localUnreadCount === 0
            ? { ...mergedConversation, unread_count: 0 }
            : mergedConversation;

        // Preservar preview atual quando o payload WS vier sem preview
        // ou com preview mais antigo (evita "piscar" conteúdo antigo na sidebar).
        const existingPreview = existingConversation?.last_non_activity_message;
        const incomingPreview = conversation.last_non_activity_message;

        const toUnix = (value?: string | number): number => {
          if (value == null || value === '') return 0;
          if (typeof value === 'number') return value;
          const asNumber = Number(value);
          if (!Number.isNaN(asNumber)) return asNumber;
          const asDate = Date.parse(value);
          return Number.isNaN(asDate) ? 0 : Math.floor(asDate / 1000);
        };

        let resolvedPreview = existingPreview;
        if (incomingPreview) {
          const incomingTs = toUnix(incomingPreview.created_at);
          const existingTs = toUnix(existingPreview?.created_at);
          if (!existingPreview || incomingTs >= existingTs) {
            resolvedPreview = incomingPreview;
          }
        }

        // Preservar labels existentes quando WS envia dados incompletos (sem título ou cor)
        const existingLabels = existingConversation?.labels || [];
        const incomingLabels = conversation.labels || [];
        const incomingLabelsComplete =
          incomingLabels.length === 0 ||
          incomingLabels.every((l: { title?: string; color?: string }) => l.title && l.color);
        const resolvedLabels = incomingLabelsComplete ? incomingLabels : existingLabels;

        // Deep-merge custom_attributes to preserve nested keys (e.g. pinned)
        const incomingCustomAttrs = conversation.custom_attributes;
        const resolvedCustomAttributes = incomingCustomAttrs
          ? { ...(existingConversation?.custom_attributes || {}), ...incomingCustomAttrs }
          : undefined;

        conversations.updateConversation({
          ...updatedConversation,
          ...(incomingLabels.length > 0 || existingLabels.length > 0 ? { labels: resolvedLabels } : {}),
          ...(resolvedCustomAttributes ? { custom_attributes: resolvedCustomAttributes } : {}),
          ...(resolvedPreview ? { last_non_activity_message: resolvedPreview } : {}),
        });

        // Recarregar inboxes se for uma conversa Z-API para obter provider_connection atualizado
        const channelType = conversation.inbox?.channel_type || '';
        const isWhatsAppChannel = channelType === 'Channel::Whatsapp';
        const channelProvider = conversation.inbox?.provider;
        const isZapiChannel = isWhatsAppChannel && channelProvider?.toLowerCase() === 'zapi';

        if (isZapiChannel) {
          // Recarregar inboxes para obter provider_connection atualizado
          const { fetchInboxes } = useAppDataStore.getState();
          fetchInboxes(true).catch(console.error);
        }
      },

      onConversationStatusChanged: (conversationId: string, status: Conversation['status'], updatedAt?: string) => {
        const existingConversation = conversations.getConversation(conversationId);
        if (!existingConversation) {
          return;
        }

        conversations.updateConversation({
          ...existingConversation,
          status,
          ...(updatedAt ? { updated_at: updatedAt } : {}),
        });
      },

      onConversationRead: (conversationId: string, unreadCount: number) => {
        conversations.updateUnreadCount(conversationId, unreadCount);

        const conversation = conversations.getConversation(conversationId);
        if (conversation) {
          conversations.updateConversation({
            ...conversation,
            unread_count: unreadCount,
          });
        }
      },

      onConversationLastActivity: (conversationId: string, lastActivityAt: string) => {
        conversations.updateConversationLastActivity(conversationId, lastActivityAt);
      },
    });
  }, [websocket, messages, conversations, currentUser, shouldReloadMessageForMissingImageData]);

  // Integrated actions
  const loadConversationsWithFilters = useCallback(
    async (params?: ConversationListParams) => {
      await conversations.loadConversations(params);
    },
    [conversations],
  );

  const selectConversationAndLoadMessages = useCallback(
    async (conversationId: string | null) => {
      // Selecionar conversa (passa accountId para marcar como lida)
      await conversations.selectConversation(conversationId);

      // Carregar mensagens se há conversa selecionada
      if (conversationId) {
        await messages.loadMessages(conversationId);
      }
    },
    [conversations, messages],
  );

  const applyFiltersAndReload = useCallback(
    async (filtersToApply: ConversationFilter[]) => {
      await filters.applyFilters(
        filtersToApply,
        () => {
          conversations.revealHiddenConversations();
        },
        (error: string) => {
          console.error('Error loading conversations:', error);
        },
      );
    },
    [filters, conversations],
  );

  const applySearchAndReload = useCallback(
    async (searchTerm: string) => {
      await filters.applySearch(
        searchTerm,
        () => {
          // Note: Direct state mutation is not correct in this context
          // This would need to be handled differently with proper actions
        },
        (error: string) => {
          console.error('Error in search:', error);
        },
      );
    },
    [filters],
  );

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedState = loadState();
    if (savedState.activeFilters) {
      filters.setFilters(savedState.activeFilters);
    }
    if (savedState.quickFilterTab) {
      filters.setQuickFilter(savedState.quickFilterTab);
    }
    if (savedState.searchTerm) {
      filters.setSearchTerm(savedState.searchTerm);
    }
    // Não restaurar conversa selecionada do localStorage automaticamente
    // Deixar que a URL ou seleção manual faça isso para garantir que seja marcada como lida
    // if (savedState.selectedConversationId !== undefined) {
    //   conversations.selectConversation(savedState.selectedConversationId);
    // }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Executar apenas uma vez no mount para restaurar estado
  // Incluir loadState, filters, conversations causaria loops infinitos

  // Save state changes to localStorage
  useEffect(() => {
    saveState({
      selectedConversationId: conversations.state.selectedConversationId,
      activeFilters: filters.state.activeFilters,
      quickFilterTab: filters.state.quickFilterTab,
      searchTerm: filters.state.searchTerm,
    });
  }, [
    conversations.state.selectedConversationId,
    filters.state.activeFilters,
    filters.state.quickFilterTab,
    filters.state.searchTerm,
    saveState,
  ]);

  return {
    messages,
    conversations,
    filters,
    websocket,
    ui,
    selectedConversation,
    selectedMessages,
    filteredConversations,
    loadConversationsWithFilters,
    selectConversationAndLoadMessages,
    applyFiltersAndReload,
    applySearchAndReload,
  };
}

// Componente Provider interno que usa todos os hooks
function ChatProviderInternal({ children }: { children: React.ReactNode }) {
  const chatIntegration = useChatIntegration();

  return <ChatContext.Provider value={chatIntegration}>{children}</ChatContext.Provider>;
}

// Provider principal que encapsula todos os sub-providers
export function ChatProvider({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketProvider>
      <UIProvider>
        <ConversationsProvider>
          <MessagesProvider>
            <FiltersProvider>
              <ChatProviderInternal>{children}</ChatProviderInternal>
            </FiltersProvider>
          </MessagesProvider>
        </ConversationsProvider>
      </UIProvider>
    </WebSocketProvider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    console.error(
      '❌ useChatContext: Context is undefined. This usually means:',
      '\n1. The component is not wrapped in ChatProvider',
      '\n2. The ChatProvider is still mounting',
      '\n3. There was an error during provider initialization',
      '\nCurrent location:',
      window.location.pathname,
      '\nComponent tree should be: ChatPage > ChatProvider > Chat',
    );
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
