import { ConversationsState, ConversationsAction } from '@/types/chat/conversations';
import { Conversation } from '@/types/chat/api';
import { matchesConversationId } from '@/utils/chat/conversationMatcher';

// Helper para verificar se uma conversa foi marcada como lida no localStorage
const getReadConversationsFromStorage = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem('crm-chat-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.readConversations || {};
    }
  } catch (error) {
    console.warn('Failed to load read conversations from localStorage:', error);
  }
  return {};
};

// Helper para salvar conversas lidas no localStorage
const saveReadConversationsToStorage = (readConversations: Record<string, boolean>) => {
  try {
    const saved = localStorage.getItem('crm-chat-state');
    const currentState = saved ? JSON.parse(saved) : {};
    localStorage.setItem('crm-chat-state', JSON.stringify({
      ...currentState,
      readConversations,
    }));
  } catch (error) {
    console.warn('Failed to save read conversations to localStorage:', error);
  }
};

export function conversationsReducer(
  state: ConversationsState,
  action: ConversationsAction,
): ConversationsState {
  switch (action.type) {
    case 'SET_CONVERSATIONS': {
      // 🔧 INICIALIZAR contadores locais apenas se não existem
      const initialUnreadCounts: Record<string, number> = {};

      // Carregar conversas marcadas como lidas do localStorage
      const readConversations = getReadConversationsFromStorage();

      // Verificar se há uma conversa selecionada na URL (para casos de primeira carga)
      const urlPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const urlMatch = urlPath.match(/\/conversations\/([^/]+)/);
      const urlConversationId = urlMatch ? urlMatch[1] : null;

      // Processar conversas preservando unread_count do estado local quando aplicável
      const processedConversations = action.payload.conversations.map(conv => {
        const convId = String(conv.id);
        const localUnreadCount = state.unreadCounts[convId];
        const isSelected = state.selectedConversationId === convId;
        const isInUrl = urlConversationId === convId;
        const wasMarkedAsRead = readConversations[convId] === true;

        // Se a conversa foi marcada como lida (no localStorage OU está selecionada/na URL com unreadCount = 0), preservar isso
        // Caso contrário, usar o valor local se existir, senão usar o valor do backend
        let syncedUnreadCount: number;
        if (wasMarkedAsRead || ((isSelected || isInUrl) && localUnreadCount === 0)) {
          // Se foi marcada como lida (localStorage ou estado local), preservar isso
          syncedUnreadCount = 0;
        } else if (localUnreadCount !== undefined) {
          // Se existe valor local, usar ele
          syncedUnreadCount = localUnreadCount;
        } else {
          // Caso contrário, usar o valor do backend
          syncedUnreadCount = conv.unread_count ?? 0;
        }

        // Inicializar contador local apenas se não existe e o valor do backend é > 0
        // Mas não inicializar se foi marcada como lida ou está na URL
        if (!(convId in state.unreadCounts) && conv.unread_count && conv.unread_count > 0 && !wasMarkedAsRead && !isInUrl) {
          initialUnreadCounts[convId] = conv.unread_count;
        }

        // Retornar conversa com unread_count sincronizado
        return {
          ...conv,
          unread_count: syncedUnreadCount,
        };
      });

      return {
        ...state,
        conversations: processedConversations,
        conversationsPagination: action.payload.pagination,
        conversationsLoading: false,
        conversationsError: null,
        // Manter contadores existentes e adicionar novos
        unreadCounts: {
          ...state.unreadCounts,
          ...initialUnreadCounts,
        },
      };
    }

    case 'APPEND_CONVERSATIONS': {
      const existingById = new Map(
        state.conversations
          .filter(conv => conv !== null && conv !== undefined && conv.id)
          .map(conv => [String(conv.id), conv]),
      );

      const readConversations = getReadConversationsFromStorage();
      const initialUnreadCounts: Record<string, number> = {};

      const incomingConversations = action.payload.conversations
        .filter(conv => conv !== null && conv !== undefined && conv.id)
        .map(conv => {
          const convId = String(conv.id);
          const localUnreadCount = state.unreadCounts[convId];
          const wasMarkedAsRead = readConversations[convId] === true;
          const existingConversation = existingById.get(convId);
          const backendUnreadCount =
            conv.unread_count ?? existingConversation?.unread_count ?? 0;

          const syncedUnreadCount = wasMarkedAsRead
            ? 0
            : (localUnreadCount ?? backendUnreadCount);

          if (
            !(convId in state.unreadCounts) &&
            backendUnreadCount > 0 &&
            !wasMarkedAsRead
          ) {
            initialUnreadCounts[convId] = backendUnreadCount;
          }

          return {
            ...(existingConversation || {}),
            ...conv,
            unread_count: syncedUnreadCount,
          } as Conversation;
        });

      incomingConversations.forEach(conv => {
        existingById.set(String(conv.id), conv);
      });

      return {
        ...state,
        conversations: Array.from(existingById.values()),
        conversationsPagination: action.payload.pagination,
        conversationsLoading: false,
        conversationsError: null,
        unreadCounts: {
          ...state.unreadCounts,
          ...initialUnreadCounts,
        },
      };
    }

    case 'SET_CONVERSATIONS_LOADING':
      return {
        ...state,
        conversationsLoading: action.payload,
      };

    case 'SET_CONVERSATIONS_ERROR':
      return {
        ...state,
        conversationsError: action.payload,
        conversationsLoading: false,
      };

    case 'SELECT_CONVERSATION': {
      // 🔧 FIX CRÍTICO: Normalizar tipos para comparação consistente
      const payloadStr = action.payload ? String(action.payload) : null;
      const currentStr = state.selectedConversationId ? String(state.selectedConversationId) : null;

      // 🔒 PROTEÇÃO: Se já é a conversa selecionada, não fazer nada (comparação normalizada)
      if (payloadStr === currentStr) {
        return state;
      }

      // Quando seleciona conversa, zera o unread_count
      const updatedConversations = state.conversations
        .filter(conv => conv !== null && conv !== undefined && conv.id)
        .map(conv => (conv.id === action.payload ? { ...conv, unread_count: 0 } : conv));

      // Encontrar a conversa selecionada para armazenar os dados
      const selectedConversation = payloadStr
        ? state.conversations.find(conv => String(conv.id) === payloadStr) || null
        : null;

      return {
        ...state,
        selectedConversationId: payloadStr, // 🔧 SEMPRE ARMAZENAR COMO STRING
        selectedConversationData: selectedConversation, // 🔧 ARMAZENAR DADOS DA CONVERSA
        conversations: updatedConversations,
        unreadCounts: {
          ...state.unreadCounts,
          ...(payloadStr ? { [payloadStr]: 0 } : {}), // Zera contador local também
        },
      };
    }

    case 'SET_SELECTED_CONVERSATION_DATA':
      return {
        ...state,
        selectedConversationData: action.payload,
      };

    case 'UPDATE_CONVERSATION': {
      // Verificar se payload é válido
      if (!action.payload || !action.payload.id) {
        console.warn('UPDATE_CONVERSATION: Invalid payload', action.payload);
        return state;
      }

      const conversationId = String(action.payload.id);

      // Atualizar na lista de conversas
      const cleanConversations = state.conversations
        .filter(conv => conv !== null && conv !== undefined && conv.id);

      // Resolve the canonical conversation in state regardless of whether the
      // payload arrived keyed by `id` or `uuid`. The reducer uses this to keep
      // selection + unread bookkeeping aligned with the update.
      const targetConv = cleanConversations.find(conv =>
        matchesConversationId(conv, conversationId),
      );
      const existsInList = targetConv != null;

      // Check selection against the resolved conversation (not the raw payload
      // id), so that a `selectedConversationId` stored as `id` still matches
      // when the WebSocket frame is keyed by `uuid` (and vice versa).
      // Race-safety: when the conv isn't in the list yet (e.g. SELECT_CONVERSATION
      // landed before SET_CONVERSATIONS completed), fall back to direct
      // comparison so `selectedConversationData` still tracks the incoming
      // payload — matches the previous reducer behaviour.
      const selectedIdStr = state.selectedConversationId
        ? String(state.selectedConversationId)
        : null;
      const isSelected =
        selectedIdStr != null &&
        (targetConv != null
          ? matchesConversationId(targetConv, selectedIdStr)
          : selectedIdStr === conversationId);

      // Sincronizar unread_count do objeto com o estado unreadCounts.
      // `selectConversation` canonicaliza a selection para `uuid` quando ele
      // existe, mas `SET_CONVERSATIONS` semeia `unreadCounts` por
      // `String(conv.id)`. As duas entradas coexistem para a mesma conv, então
      // checamos ambas — se qualquer uma marcar como lida (0) enquanto a conv
      // está selecionada, preservamos o 0 contra um payload stale.
      const canonicalKey = targetConv ? String(targetConv.id) : conversationId;
      const localUnreadCount = state.unreadCounts[canonicalKey];
      const selectedKeyUnreadCount =
        selectedIdStr != null && selectedIdStr !== canonicalKey
          ? state.unreadCounts[selectedIdStr]
          : undefined;
      const syncedUnreadCount =
        isSelected && (localUnreadCount === 0 || selectedKeyUnreadCount === 0)
          ? 0
          : (localUnreadCount ?? selectedKeyUnreadCount ?? action.payload.unread_count ?? 0);

      const updatedConversationsList = existsInList
        ? cleanConversations.map(conv =>
            matchesConversationId(conv, conversationId)
              ? {
                  ...conv,
                  ...action.payload,
                  unread_count: syncedUnreadCount,
                }
              : conv,
          )
        : [{ ...action.payload, unread_count: syncedUnreadCount }, ...cleanConversations];

      // Se é a conversa selecionada, atualizar os dados também
      const updatedSelectedData = isSelected
        ? {
            ...state.selectedConversationData,
            ...action.payload,
            unread_count: syncedUnreadCount, // Sincronizar também aqui
          }
        : state.selectedConversationData;

      return {
        ...state,
        conversations: updatedConversationsList,
        selectedConversationData: updatedSelectedData,
      };
    }

    case 'UPDATE_CONTACT_IN_CONVERSATIONS': {
      const updatedContact = action.payload;

      // Atualiza meta.sender em todas as conversas que usam esse contato
      const updatedConversations = state.conversations
      .filter(conv => conv !== null && conv !== undefined && conv.id)
      .map(conv => {
        const sender = conv.meta?.sender;
        if (!sender || String(sender.id) !== String(updatedContact.id)) {
          return conv;
        }

        return {
          ...conv,
          meta: {
            ...conv.meta,
            sender: {
              ...sender,
              name: updatedContact.name,
              email: updatedContact.email || sender.email,
              phone_number: updatedContact.phone_number || sender.phone_number,
              avatar_url: updatedContact.avatar_url || sender.avatar_url,
            },
          },
        };
      });

      // Atualizar dados da conversa selecionada, se for o mesmo contato
      let updatedSelectedConversationData = state.selectedConversationData;
      if(
        state.selectedConversationData?.meta?.sender &&
        String(state.selectedConversationData?.meta?.sender.id) === String(updatedContact.id)
      ) {
        updatedSelectedConversationData = {
          ...state.selectedConversationData,
          meta: {
            ...state.selectedConversationData.meta,
            sender: {
              ...state.selectedConversationData.meta.sender,
              name: updatedContact.name,
              email: updatedContact.email || state.selectedConversationData.meta.sender.email,
              phone_number: updatedContact.phone_number || state.selectedConversationData.meta.sender.phone_number,
              avatar_url: updatedContact.avatar_url || state.selectedConversationData.meta.sender.avatar_url,
            },
          },
        };
      }

      return {
        ...state,
        conversations: updatedConversations,
        selectedConversationData: updatedSelectedConversationData,
      };
    }

    case 'ADD_CONVERSATION': {
      // Verificar se payload é válido
      if (!action.payload || !action.payload.id) {
        console.warn('ADD_CONVERSATION: Invalid payload', action.payload);
        return state;
      }

      const incomingId = String(action.payload.id);

      const existingIndex = state.conversations.findIndex(conv =>
        matchesConversationId(conv, incomingId),
      );

      if (existingIndex >= 0) {
        const updatedConversation = { ...state.conversations[existingIndex], ...action.payload };
        return {
          ...state,
          conversations: state.conversations
            .filter(conv => conv !== null && conv !== undefined && conv.id)
            .map(conv =>
              matchesConversationId(conv, incomingId) ? updatedConversation : conv,
            ),
        };
      }

      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };
    }

    case 'REMOVE_CONVERSATION': {
      const targetId = String(action.payload);
      const removed = state.conversations.find(conv =>
        matchesConversationId(conv, targetId),
      );
      const filteredConversations = state.conversations.filter(
        conv => !matchesConversationId(conv, targetId),
      );

      // `unreadCounts` is keyed by the canonical `String(conv.id)`. When the
      // caller dispatches by uuid we still want to drop the right key.
      const unreadKey = removed ? String(removed.id) : targetId;
      const { [unreadKey]: _removed, ...remainingUnreadCounts } = state.unreadCounts; // eslint-disable-line @typescript-eslint/no-unused-vars

      return {
        ...state,
        conversations: filteredConversations,
        unreadCounts: remainingUnreadCounts,
      };
    }

    case 'CLEANUP_DUPLICATES': {
      const uniqueConversations = state.conversations.reduce((acc: Conversation[], current) => {
        const exists = acc.find(conv => String(conv.id) === String(current.id));
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      return {
        ...state,
        conversations: uniqueConversations,
      };
    }

    case 'UPDATE_UNREAD_COUNT': {
      const { conversationId, count } = action.payload;
      const conversationIdStr = String(conversationId);

      // Sync the persisted "read" marker so `SET_CONVERSATIONS` on the next
      // page load honors the most recent intent. Without the `else` branch a
      // mark-as-unread leaves a stale `readConversations[id] = true` behind
      // and F5 silently zeroes the badge again.
      const readConversations = getReadConversationsFromStorage();
      if (count === 0) {
        readConversations[conversationIdStr] = true;
        saveReadConversationsToStorage(readConversations);
      } else if (readConversations[conversationIdStr]) {
        delete readConversations[conversationIdStr];
        saveReadConversationsToStorage(readConversations);
      }

      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [conversationIdStr]: count,
        },
        conversations: state.conversations
          .filter(conv => conv !== null && conv !== undefined && conv.id)
          .map(conv =>
            matchesConversationId(conv, conversationIdStr)
              ? { ...conv, unread_count: count }
              : conv,
          ),
      };
    }

    case 'UPDATE_CONVERSATION_LAST_ACTIVITY': {
      const { conversationId, lastActivityAt } = action.payload;
      return {
        ...state,
        conversations: state.conversations
          .filter(conv => conv !== null && conv !== undefined && conv.id)
          .map(conv =>
            conv.id === conversationId ? { ...conv, last_activity_at: lastActivityAt } : conv,
          ),
      };
    }

    case 'INCREMENT_UNREAD_COUNT': {
      const { conversationId } = action.payload;
      const conversationIdStr = String(conversationId);
      const newCount = (state.unreadCounts[conversationIdStr] || 0) + 1;

      // Remover marcação de "lida" do localStorage quando incrementamos (nova mensagem chegou)
      try {
        const saved = localStorage.getItem('crm-chat-state');
        const currentState = saved ? JSON.parse(saved) : {};
        const readConversations = currentState.readConversations || {};
        delete readConversations[conversationIdStr]; // Remover marcação de lida
        localStorage.setItem('crm-chat-state', JSON.stringify({
          ...currentState,
          readConversations,
        }));
      } catch (error) {
        console.warn('Failed to remove read mark from localStorage:', error);
      }

      return {
        ...state,
        conversations: state.conversations
          .filter(conv => conv !== null && conv !== undefined && conv.id)
          .map(conv =>
            String(conv.id) === conversationIdStr
              ? { ...conv, unread_count: newCount }
              : conv,
          ),
        unreadCounts: {
          ...state.unreadCounts,
          [conversationIdStr]: newCount,
        },
        selectedConversationData:
          state.selectedConversationId === conversationIdStr
            ? { ...state.selectedConversationData, unread_count: newCount } as Conversation
            : state.selectedConversationData,
      };
    }

    case 'ADD_HIDDEN_CONVERSATION': {
      if (!action.payload || !action.payload.id) return state;
      const MAX_HIDDEN = 200;
      const alreadyHidden = state.hiddenConversations.some(
        c => String(c.id) === String(action.payload.id),
      );
      if (alreadyHidden) {
        return {
          ...state,
          hiddenConversations: state.hiddenConversations.map(c =>
            String(c.id) === String(action.payload.id) ? { ...c, ...action.payload } : c,
          ),
        };
      }
      const updated = [action.payload, ...state.hiddenConversations];
      return {
        ...state,
        hiddenConversations: updated.length > MAX_HIDDEN ? updated.slice(0, MAX_HIDDEN) : updated,
      };
    }

    case 'REVEAL_HIDDEN_CONVERSATIONS': {
      if (state.hiddenConversations.length === 0) return state;
      const visibleIds = new Set(state.conversations.map(c => String(c.id)));
      const newConversations = state.hiddenConversations.filter(
        c => !visibleIds.has(String(c.id)),
      );
      return {
        ...state,
        conversations: [...state.conversations, ...newConversations],
        hiddenConversations: [],
      };
    }

    default:
      return state;
  }
}
