import React, { useReducer, useCallback, useRef, useMemo } from 'react';

import { ConversationsContextValue, initialState } from '@/types/chat/conversations';
import { conversationsReducer } from '@/contexts/chat/ConversationsContextReducer';
import { ConversationsContext } from '@/contexts/chat/ConversationsContextInstance';

import { useLanguage } from '@/hooks/useLanguage';

import { chatService } from '@/services/chat/chatService';
import { conversationAPI } from '@/services/conversations/conversationService';
import { useUnreadConversationsStore } from '@/store/unreadConversationsStore';

import { toast } from 'sonner';

import { extractConversationsData } from '@/utils/chat/responseHelpers';
import { isActionNotSupported } from '@/utils/chat/actionSupport';

import { Contact, Conversation, ConversationListParams } from '@/types/chat/api';
import { PaginationMeta } from '@/types/core';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { matchesConversationId } from '@/utils/chat/conversationMatcher';

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage('chat');
  const [state, dispatch] = useReducer(conversationsReducer, initialState);

  // Refs para evitar chamadas múltiplas simultâneas
  const loadingRef = useRef(false);
  const loadingSpecificRef = useRef<Set<string>>(new Set());
  const selectionLockRef = useRef(false);
  const lastCleanupRef = useRef(0);

  const findConversationByAnyId = useCallback(
    (conversationId: string) => {
      const idStr = String(conversationId);
      return (
        state.conversations.find(conv => matchesConversationId(conv, idStr)) || null
      );
    },
    [state.conversations],
  );

  // Conversation actions
  const loadConversations = useCallback(
    async (params?: ConversationListParams) => {
      // Evitar carregamento duplo usando ref (mais rápido que state)
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      dispatch({ type: 'SET_CONVERSATIONS_LOADING', payload: true });

      try {
        const requestedPage = Number(params?.page || 1);
        const shouldAppend = requestedPage > 1;
        const response = await chatService.getConversations(params);

        if (!response || !response.data) {
          dispatch({
            type: 'SET_CONVERSATIONS',
            payload: {
              conversations: [],
              pagination: {
                page: 1,
                page_size: DEFAULT_PAGE_SIZE,
                total: 0,
                total_pages: 0,
              },
            },
          });
          return;
        }

        const { conversations, pagination } = extractConversationsData(response);

        dispatch({
          type: shouldAppend ? 'APPEND_CONVERSATIONS' : 'SET_CONVERSATIONS',
          payload: {
            conversations: conversations, // Sem enrichment automático
            pagination,
          },
        });
      } catch (error) {
        console.error('Erro ao carregar conversas da API:', error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : t('contexts.conversations.errors.loadConversations');
        dispatch({
          type: 'SET_CONVERSATIONS_ERROR',
          payload: errorMessage,
        });

        toast.error(t('contexts.conversations.errors.loadConversations'), {
          description: errorMessage,
          action: {
            label: t('contexts.conversations.tryAgain'),
            onClick: () => loadConversations(params),
          },
        });
      } finally {
        // Reset ref always
        loadingRef.current = false;
      }
    },
    [t], // Adicionado t para traduções
  );

  const loadMoreConversations = useCallback(async () => {
    const pagination = state.conversationsPagination;
    const currentPage = pagination?.page || 1;
    const totalPages = pagination?.total_pages || 1;
    const hasNextPage = pagination?.has_next_page ?? currentPage < totalPages;

    if (!hasNextPage || loadingRef.current || state.conversationsLoading) {
      return;
    }

    await loadConversations({ page: currentPage + 1 });
  }, [state.conversationsPagination, state.conversationsLoading, loadConversations]);

  const loadSpecificConversation = useCallback(
    async (conversationId: string): Promise<Conversation | null> => {
      const conversationKey = String(conversationId);
      // 🔒 PROTEÇÃO: Evitar carregamentos simultâneos da mesma conversa
      if (loadingSpecificRef.current.has(conversationKey)) {
        return null;
      }

      // 🔍 VERIFICAÇÃO: Se conversa já existe na lista atual
      const existingConversation = findConversationByAnyId(conversationKey);

      if (existingConversation) {
        return existingConversation;
      }

      // Marcar como sendo carregada
      loadingSpecificRef.current.add(conversationKey);

      try {
        const response = await chatService.getConversation(conversationKey);

        if (!response) {
          return null;
        }

        const envelope = response as unknown as {
          data?: Conversation;
        } & Partial<Conversation>;
        const conversation = (envelope?.data?.id ? envelope.data : envelope) as unknown as Conversation;

        // Validar se conversation é válida
        if (!conversation || !conversation.id) {
          return null;
        }

        // 🔒 DUPLA VERIFICAÇÃO: Verificar novamente se não foi adicionada durante o carregamento
        const finalCheck = findConversationByAnyId(conversationKey);

        if (!finalCheck) {
          dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
        } else {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: conversation });
        }

        return conversation;
      } catch (error) {
        console.error('❌ Erro ao carregar conversa específica:', error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : t('contexts.conversations.errors.loadConversation');

        toast.error(t('contexts.conversations.errors.conversationNotFound'), {
          description: errorMessage,
        });

        return null;
      } finally {
        // 🧹 CLEANUP: Remover da lista de carregamento
        loadingSpecificRef.current.delete(conversationKey);
      }
    },
    [findConversationByAnyId, t],
  );

  const setConversations = useCallback(
    (conversations: Conversation[], pagination: PaginationMeta) => {
      dispatch({ type: 'SET_CONVERSATIONS', payload: { conversations, pagination } });
    },
    [],
  );

  const selectConversation = useCallback(
    async (conversationId: string | null) => {
      // 🔒 PROTEÇÃO: Evitar seleções simultâneas
      if (selectionLockRef.current) {
        return;
      }

      // Marcar seleção em andamento
      selectionLockRef.current = true;

      const targetConversation = conversationId ? findConversationByAnyId(conversationId) : null;
      const canonicalConversationId = targetConversation?.uuid || targetConversation?.id || conversationId;

      dispatch({ type: 'SELECT_CONVERSATION', payload: canonicalConversationId });

      // 🔧 CARREGAR CONVERSA: Se não está na lista atual, carregar do backend
      if (canonicalConversationId) {
        const conversationInList = findConversationByAnyId(canonicalConversationId);

        if (!conversationInList) {
          try {
            const conversationData = await loadSpecificConversation(canonicalConversationId);
            if (conversationData) {
              dispatch({ type: 'SET_SELECTED_CONVERSATION_DATA', payload: conversationData });
            }
          } catch (error) {
            console.error('❌ Erro ao carregar conversa específica:', error);
          }
        }

        // 🎯 PERSISTIR: Marcar conversa como lida no backend
        try {
          await chatService.markConversationAsRead(canonicalConversationId);

          // Atualizar estado local para garantir persistência
          dispatch({
            type: 'UPDATE_UNREAD_COUNT',
            payload: { conversationId: canonicalConversationId, count: 0 },
          });

          // Também atualizar o objeto da conversa para manter sincronizado
          const conversationInList = findConversationByAnyId(canonicalConversationId);
          if (conversationInList) {
            dispatch({
              type: 'UPDATE_CONVERSATION',
              payload: { ...conversationInList, unread_count: 0 },
            });
          }

          // Salvar no localStorage que esta conversa foi marcada como lida
          try {
            const saved = localStorage.getItem('crm-chat-state');
            const currentState = saved ? JSON.parse(saved) : {};
            const readConversations = currentState.readConversations || {};
            readConversations[canonicalConversationId] = true;
            localStorage.setItem(
              'crm-chat-state',
              JSON.stringify({
                ...currentState,
                readConversations,
              }),
            );
          } catch (error) {
            console.warn('Failed to save read conversation to localStorage:', error);
          }
        } catch (error) {
          console.error('❌ Erro ao marcar conversa como lida:', error);
          // Não bloquear a seleção da conversa por erro de persistência
        }
      }

      // Liberar lock após um delay mínimo
      setTimeout(() => {
        selectionLockRef.current = false;
      }, 50);
    },
    [findConversationByAnyId, loadSpecificConversation],
  );

  const updateConversationStatus = useCallback(
    async (
      conversationId: string,
      status: 'open' | 'resolved' | 'pending' | 'snoozed',
      onFilterReload?: () => Promise<void>,
    ) => {
      try {
        const response = await chatService.updateConversationStatus(conversationId, status);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('updateConversationStatus: Invalid response', response);
        }

        useUnreadConversationsStore.getState().fetch();

        const statusName = t(`contexts.conversations.statusNames.${status}`);

        toast.success(t('contexts.conversations.success.statusChanged', { status: statusName }));

        // Recarregar lista com filtros atuais se callback fornecido
        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        console.error('Error updating conversation status:', error);
        toast.error(t('contexts.conversations.errors.updateStatus'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const updateConversationPriority = useCallback(
    async (
      conversationId: string,
      priority: 'low' | 'medium' | 'high' | 'urgent' | null,
      onFilterReload?: () => Promise<void>,
    ) => {
      try {
        const response = await chatService.updateConversationPriority(conversationId, priority);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('updateConversationPriority: Invalid response', response);
        }

        const priorityKey = priority || 'none';
        const priorityName = t(`contexts.conversations.priorityNames.${priorityKey}`);

        toast.success(
          t('contexts.conversations.success.priorityChanged', { priority: priorityName }),
        );

        // Recarregar lista com filtros atuais se callback fornecido
        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        console.error('Error updating conversation priority:', error);
        toast.error(t('contexts.conversations.errors.updatePriority'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const pinConversation = useCallback(
    async (conversationId: string, onFilterReload?: () => Promise<void>) => {
      try {
        const response = await chatService.pinConversation(conversationId);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('pinConversation: Invalid response', response);
        }

        toast.success(t('contexts.conversations.success.pinned'));

        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        if (isActionNotSupported(error)) {
          toast.error(t('contexts.conversations.errors.pinNotSupported'), {
            description: t('contexts.conversations.errors.pinNotSupportedDescription'),
          });
          throw error;
        }

        console.error('Error pinning conversation:', error);
        toast.error(t('contexts.conversations.errors.pinConversation'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const unpinConversation = useCallback(
    async (conversationId: string, onFilterReload?: () => Promise<void>) => {
      try {
        const response = await chatService.unpinConversation(conversationId);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('unpinConversation: Invalid response', response);
        }

        toast.success(t('contexts.conversations.success.unpinned'));

        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        if (isActionNotSupported(error)) {
          toast.error(t('contexts.conversations.errors.pinNotSupported'), {
            description: t('contexts.conversations.errors.pinNotSupportedDescription'),
          });
          throw error;
        }

        console.error('Error unpinning conversation:', error);
        toast.error(t('contexts.conversations.errors.pinConversation'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const archiveConversation = useCallback(
    async (conversationId: string, onFilterReload?: () => Promise<void>) => {
      try {
        const response = await chatService.archiveConversation(conversationId);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('archiveConversation: Invalid response', response);
        }

        toast.success(t('contexts.conversations.success.archived'));

        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        if (isActionNotSupported(error)) {
          toast.error(t('contexts.conversations.errors.archiveNotSupported'), {
            description: t('contexts.conversations.errors.archiveNotSupportedDescription'),
          });
          throw error;
        }

        console.error('Error archiving conversation:', error);
        toast.error(t('contexts.conversations.errors.archiveConversation'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const unarchiveConversation = useCallback(
    async (conversationId: string, onFilterReload?: () => Promise<void>) => {
      try {
        const response = await chatService.unarchiveConversation(conversationId);

        if (response && response.data && response.data.id) {
          dispatch({ type: 'UPDATE_CONVERSATION', payload: response.data });
        } else {
          console.warn('unarchiveConversation: Invalid response', response);
        }

        toast.success(t('contexts.conversations.success.unarchived'));

        if (onFilterReload) {
          await onFilterReload();
        }

        return response as unknown as Conversation;
      } catch (error) {
        if (isActionNotSupported(error)) {
          toast.error(t('contexts.conversations.errors.archiveNotSupported'), {
            description: t('contexts.conversations.errors.archiveNotSupportedDescription'),
          });
          throw error;
        }

        console.error('Error unarchiving conversation:', error);
        toast.error(t('contexts.conversations.errors.archiveConversation'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const updateContactInConversations = useCallback((updatedContact: Contact) => {
    dispatch({ type: 'UPDATE_CONTACT_IN_CONVERSATIONS', payload: updatedContact });
  }, []);

  // Direct state manipulation (for WebSocket integration)
  const updateConversation = useCallback((conversation: Conversation) => {
    if (!conversation || !conversation.id) {
      console.warn('updateConversation: Invalid conversation data', conversation);
      return;
    }
    dispatch({ type: 'UPDATE_CONVERSATION', payload: conversation });
  }, []);

  const addConversation = useCallback((conversation: Conversation) => {
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    dispatch({ type: 'REMOVE_CONVERSATION', payload: conversationId });
  }, []);

  const cleanupDuplicates = useCallback(() => {
    dispatch({ type: 'CLEANUP_DUPLICATES' });
  }, []);

  // 🧹 AUTO-CLEANUP: Detectar e limpar duplicatas automaticamente
  React.useEffect(() => {
    const now = Date.now();

    // Executar limpeza a cada 2 segundos no máximo
    if (now - lastCleanupRef.current < 2000) {
      return;
    }

    // Verificar se há duplicatas
    const ids = state.conversations.map(conv => String(conv.id));
    const uniqueIds = new Set(ids);

    if (ids.length > uniqueIds.size) {
      lastCleanupRef.current = now;
      dispatch({ type: 'CLEANUP_DUPLICATES' });
    }
  }, [state.conversations]);

  const updateUnreadCount = useCallback(
    (conversationId: string, count: number) => {
      const previousCount = state.unreadCounts[conversationId] ?? 0;
      dispatch({
        type: 'UPDATE_UNREAD_COUNT',
        payload: { conversationId, count },
      });
      const wasZero = previousCount === 0;
      const isZero = count === 0;
      if (wasZero && !isZero) {
        useUnreadConversationsStore.getState().incrementBy(1);
      } else if (!wasZero && isZero) {
        useUnreadConversationsStore.getState().decrementBy(1);
      }
    },
    [state.unreadCounts],
  );

  const updateConversationLastActivity = useCallback(
    (conversationId: string, lastActivityAt: string) => {
      dispatch({
        type: 'UPDATE_CONVERSATION_LAST_ACTIVITY',
        payload: { conversationId, lastActivityAt },
      });
    },
    [],
  );

  const incrementUnreadCount = useCallback(
    (conversationId: string) => {
      const previousCount = state.unreadCounts[conversationId] ?? 0;
      dispatch({
        type: 'INCREMENT_UNREAD_COUNT',
        payload: { conversationId },
      });
      if (previousCount === 0) {
        useUnreadConversationsStore.getState().incrementBy(1);
      }
    },
    [state.unreadCounts],
  );

  const addHiddenConversation = useCallback((conversation: Conversation) => {
    dispatch({ type: 'ADD_HIDDEN_CONVERSATION', payload: conversation });
  }, []);

  const revealHiddenConversations = useCallback(() => {
    dispatch({ type: 'REVEAL_HIDDEN_CONVERSATIONS' });
  }, []);

  // Context menu actions
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await conversationAPI.deleteConversation(conversationId);

        // Remove from local state
        dispatch({ type: 'REMOVE_CONVERSATION', payload: conversationId });

        // If this was the selected conversation, clear selection
        if (String(state.selectedConversationId) === String(conversationId)) {
          dispatch({ type: 'SELECT_CONVERSATION', payload: null });
        }

        toast.success(t('contexts.conversations.success.deleted'));
      } catch (error) {
        console.error('Error deleting conversation:', error);
        toast.error(t('contexts.conversations.errors.deleteConversation'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [state.selectedConversationId, t],
  );

  const markAsRead = useCallback(
    async (conversationId: string, options?: { silent?: boolean }) => {
      try {
        await conversationAPI.markAsRead(conversationId);

        dispatch({
          type: 'UPDATE_UNREAD_COUNT',
          payload: { conversationId, count: 0 },
        });
        useUnreadConversationsStore.getState().fetch();

        if (!options?.silent) {
          toast.success(t('contexts.conversations.success.markedAsRead'));
        }
      } catch (error) {
        console.error('Error marking conversation as read:', error);
        toast.error(t('contexts.conversations.errors.markAsRead'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const markAsUnread = useCallback(
    async (conversationId: string) => {
      try {
        await conversationAPI.markAsUnread(conversationId);

        const currentCount = state.unreadCounts[conversationId] || 0;
        dispatch({
          type: 'UPDATE_UNREAD_COUNT',
          payload: { conversationId, count: Math.max(1, currentCount) },
        });
        useUnreadConversationsStore.getState().fetch();

        toast.success(t('contexts.conversations.success.markedAsUnread'));
      } catch (error) {
        console.error('Error marking conversation as unread:', error);
        toast.error(t('contexts.conversations.errors.markAsUnread'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [state.unreadCounts, t],
  );

  const markAsResolved = useCallback(
    async (conversationId: string) => {
      try {
        const updatedConversation = await conversationAPI.updateStatus(conversationId, 'resolved');

        // Update local state
        if (updatedConversation && updatedConversation.id) {
          dispatch({
            type: 'UPDATE_CONVERSATION',
            payload: updatedConversation as unknown as Conversation,
          });
        } else {
          console.warn('Invalid updatedConversation', updatedConversation);
        }

        useUnreadConversationsStore.getState().fetch();

        toast.success(t('contexts.conversations.success.markedAsResolved'));
      } catch (error) {
        console.error('Error marking conversation as resolved:', error);
        toast.error(t('contexts.conversations.errors.markAsResolved'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const markAsPending = useCallback(
    async (conversationId: string) => {
      try {
        const updatedConversation = await conversationAPI.updateStatus(conversationId, 'pending');

        // Update local state
        if (updatedConversation && updatedConversation.id) {
          dispatch({
            type: 'UPDATE_CONVERSATION',
            payload: updatedConversation as unknown as Conversation,
          });
        } else {
          console.warn('Invalid updatedConversation', updatedConversation);
        }

        toast.success(t('contexts.conversations.success.markedAsPending'));
      } catch (error) {
        console.error('Error marking conversation as pending:', error);
        toast.error(t('contexts.conversations.errors.markAsPending'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const assignAgent = useCallback(
    async (conversationId: string, assigneeId: string | null) => {
      try {
        const updatedConversation = await conversationAPI.assignConversation(
          conversationId,
          assigneeId,
        );
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: updatedConversation as unknown as Conversation,
        });
        toast.success(
          assigneeId
            ? t('contexts.conversations.success.agentAssigned')
            : t('contexts.conversations.success.agentRemoved'),
        );
      } catch (error) {
        console.error('Error assigning agent:', error);
        toast.error(t('contexts.conversations.errors.assignAgent'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const assignTeam = useCallback(
    async (conversationId: string, teamId: string | null) => {
      try {
        const updatedConversation = await conversationAPI.assignConversation(
          conversationId,
          null,
          teamId,
        );

        // Update local state
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: updatedConversation as unknown as Conversation,
        });

        toast.success(
          teamId
            ? t('contexts.conversations.success.teamAssigned')
            : t('contexts.conversations.success.teamRemoved'),
        );
      } catch (error) {
        console.error('Error assigning team:', error);
        toast.error(t('contexts.conversations.errors.assignTeam'), {
          description:
            error instanceof Error
              ? error.message
              : t('contexts.conversations.tryAgainDescription'),
        });
        throw error;
      }
    },
    [t],
  );

  const assignLabels = useCallback(async (conversationId: string, labels: string[]) => {
    try {
      await conversationAPI.addLabels(conversationId, labels);
    } catch (error) {
      console.error('Error assigning labels:', error);
      toast.error(t('contexts.conversations.errors.assignLabels'), {
        description:
          error instanceof Error ? error.message : t('contexts.conversations.tryAgainDescription'),
      });
      throw error;
    }

    try {
      const refreshed = await conversationAPI.getConversation(conversationId);
      if (refreshed && refreshed.id) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: refreshed });
      }
    } catch (error) {
      console.warn('Labels assigned but failed to refresh conversation:', error);
    }

    toast.success(t('contexts.conversations.success.labelsAssigned'));
  }, []);

  // Computed values
  // 🔧 FIX: Manter conversa selecionada mesmo quando ela não está na lista filtrada
  const selectedConversation = useMemo(() => {
    if (!state.selectedConversationId) return null;

    // Primeiro: tentar encontrar na lista atual (pode ter dados mais atualizados)
    const conversationInList = findConversationByAnyId(state.selectedConversationId);

    if (conversationInList) {
      return conversationInList;
    }

    // Segundo: usar dados armazenados se a conversa não está na lista atual
    if (
      state.selectedConversationData &&
      String(state.selectedConversationData.id) === String(state.selectedConversationId)
    ) {
      return state.selectedConversationData;
    }

    // Se não temos dados, retornar null
    return null;
  }, [state.selectedConversationId, state.selectedConversationData, findConversationByAnyId]);

  const getConversation = useCallback(
    (conversationId: string) => {
      return findConversationByAnyId(conversationId);
    },
    [findConversationByAnyId],
  );

  const getUnreadCount = useCallback(
    (conversationId: string) => {
      return state.unreadCounts[conversationId] || 0;
    },
    [state.unreadCounts],
  );

  const contextValue: ConversationsContextValue = {
    state,
    loadConversations,
    loadMoreConversations,
    setConversations,
    loadSpecificConversation,
    selectConversation,
    updateConversationStatus,
    updateConversationPriority,
    pinConversation,
    unpinConversation,
    archiveConversation,
    unarchiveConversation,
    updateConversation,
    updateContactInConversations,
    addConversation,
    removeConversation,
    cleanupDuplicates,
    updateUnreadCount,
    updateConversationLastActivity,
    incrementUnreadCount,
    addHiddenConversation,
    revealHiddenConversations,
    selectedConversation,
    getConversation,
    getUnreadCount,
    // Context menu actions
    deleteConversation,
    markAsRead,
    markAsUnread,
    markAsResolved,
    markAsPending,
    assignAgent,
    assignTeam,
    assignLabels,
  };

  return (
    <ConversationsContext.Provider value={contextValue}>{children}</ConversationsContext.Provider>
  );
}
