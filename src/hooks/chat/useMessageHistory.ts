import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { chatService } from '@/services/chat/chatService';
import { Message } from '@/types/chat/api';
import { extractMessagesWithMeta } from '@/utils/chat/responseHelpers';

interface UseMessageHistoryProps {
  conversationId: string;
  enabled?: boolean;
}

interface MessageHistoryState {
  messages: Message[];
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  oldestMessageId: string | null;
  error: string | null;
}

export const useMessageHistory = ({ conversationId, enabled = true }: UseMessageHistoryProps) => {
  const { t: tUi } = useUiTranslation();
  const [state, setState] = useState<MessageHistoryState>({
    messages: [],
    hasMoreMessages: true,
    isLoadingMore: false,
    isInitialLoading: true,
    oldestMessageId: null,
    error: null,
  });

  // Ref para evitar requests duplicados
  const loadingRef = useRef(false);

  // 🔒 RACE CONDITION FIX: Ref para controlar conversa ativa
  const activeConversationRef = useRef<string | null>(null);

  // Carregar mensagens iniciais
  const loadInitialMessages = useCallback(async () => {
    if (!enabled || !conversationId || loadingRef.current) return;

    // 🔒 Definir conversa ativa para detectar race conditions
    activeConversationRef.current = conversationId;

    loadingRef.current = true;
    setState(prev => ({ ...prev, isInitialLoading: true, error: null }));

    try {
      // Evolution backend limits: 20 messages for latest, 20 for before, 100 for after
      const response = await chatService.getMessages(conversationId);

      // 🔒 CRITICAL: Verificar se ainda é a conversa ativa após API call
      if (activeConversationRef.current !== conversationId) {
        loadingRef.current = false;
        return; // Descartar resultado de conversa antiga
      }

      if (!response) {
        // Verificar novamente antes de atualizar estado
        if (activeConversationRef.current !== conversationId) {
          loadingRef.current = false;
          return;
        }

        setState(prev => ({
          ...prev,
          messages: [],
          hasMoreMessages: false,
          isInitialLoading: false,
        }));
        return;
      }

      const { messages: newMessages } = extractMessagesWithMeta(response);

      // 🔒 FINAL CHECK: Última verificação antes de atualizar estado
      if (activeConversationRef.current !== conversationId) {
        loadingRef.current = false;
        return;
      }

      // Evolution sempre retorna no máximo 20 mensagens iniciais
      // Se retornou 20, provavelmente há mais mensagens
      const hasMore = newMessages.length === 20;

      setState(prev => ({
        ...prev,
        messages: newMessages,
        oldestMessageId: newMessages.length > 0 ? newMessages[0].id : null,
        hasMoreMessages: hasMore,
        isInitialLoading: false,
        error: null,
      }));

      // ✅ DESABILITAR auto-loading temporariamente para debugar scroll
      // TODO: Reabilitar depois que o scroll estiver funcionando perfeitamente
      // if (false && hasMore && newMessages.length === 20) {
      //   setTimeout(() => {
      //     loadMoreMessagesRecursive(1);
      //   }, 500);
      // }
    } catch (error) {
      console.error('Error loading initial messages:', error);
      const errorMessage = error instanceof Error ? error.message : tUi("widget:errors.loadMessages");

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isInitialLoading: false,
      }));

      toast.error(tUi("widget:errors.loadMessages"), {
        description: errorMessage,
        action: {
          label: tUi("common:base.errorBoundary.retry"),
          onClick: () => loadInitialMessages(),
        },
      });
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, enabled, tUi]);

  // Carregar mensagens mais antigas (com botão)
  const loadMoreMessages = useCallback(async () => {
    if (
      !state.hasMoreMessages ||
      state.isLoadingMore ||
      !state.oldestMessageId ||
      loadingRef.current ||
      activeConversationRef.current !== conversationId
    ) {
      return;
    }

    loadingRef.current = true;
    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      // Evolution backend: usar 'before' para carregar mensagens anteriores (limit 20)
      const response = await chatService.getMessages(conversationId, {
        before: state.oldestMessageId,
      });

      // 🔒 Verificar se ainda é a conversa ativa após API call
      if (activeConversationRef.current !== conversationId) {
        loadingRef.current = false;
        setState(prev => ({ ...prev, isLoadingMore: false }));
        return;
      }

      if (!response) {
        setState(prev => ({ ...prev, hasMoreMessages: false, isLoadingMore: false }));
        return;
      }

      const { messages: olderMessages } = extractMessagesWithMeta(response);

      if (olderMessages.length > 0) {
        setState(prev => {
          const allMessages = [...olderMessages, ...prev.messages];

          // Evolution retorna no máximo 20 mensagens com 'before'
          // Se retornou 20, provavelmente há mais mensagens
          const hasMore = olderMessages.length === 20;

          return {
            ...prev,
            messages: allMessages,
            oldestMessageId: olderMessages[0].id,
            hasMoreMessages: hasMore,
            isLoadingMore: false,
          };
        });
      } else {
        setState(prev => ({
          ...prev,
          hasMoreMessages: false,
          isLoadingMore: false,
        }));
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setState(prev => ({ ...prev, isLoadingMore: false }));

      toast.error(tUi("interface:usemessagehistory.couldNotLoadPreviousMessages"), {
        description: error instanceof Error ? error.message : tUi("chat:contexts.conversations.tryAgainDescription"),
      });
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, state.hasMoreMessages, state.isLoadingMore, state.oldestMessageId, tUi]);

  // Função recursiva para carregar múltiplas páginas automaticamente
  const loadMoreMessagesRecursive = useCallback(
    async (pagesRemaining: number) => {
      if (
        pagesRemaining <= 0 ||
        !state.hasMoreMessages ||
        state.isLoadingMore ||
        !state.oldestMessageId
      ) {
        return;
      }

      try {
        const response = await chatService.getMessages(conversationId, {
          before: state.oldestMessageId,
        });

        if (!response) return;

        const { messages: olderMessages } = extractMessagesWithMeta(response);

        if (olderMessages.length > 0) {
          setState(prev => {
            const allMessages = [...olderMessages, ...prev.messages];
            const hasMore = olderMessages.length === 20;

            return {
              ...prev,
              messages: allMessages,
              oldestMessageId: olderMessages[0].id,
              hasMoreMessages: hasMore,
            };
          });

          // Continue carregando se ainda há páginas restantes e mensagens disponíveis
          if (olderMessages.length === 20 && pagesRemaining > 1) {
            setTimeout(() => {
              loadMoreMessagesRecursive(pagesRemaining - 1);
            }, 200); // 200ms delay between auto-loads
          }
        }
      } catch (error) {
        console.error('Error in recursive message loading:', error);
      }
    },
    [conversationId, state.hasMoreMessages, state.isLoadingMore, state.oldestMessageId],
  );

  // Adicionar nova mensagem (para mensagens enviadas/recebidas em tempo real)
  const addMessage = useCallback((message: Message) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  // Atualizar status de mensagem
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => (msg.id === messageId ? { ...msg, status } : msg)),
    }));
  }, []);

  // Resetar histórico (útil ao trocar de conversa)
  const resetHistory = useCallback(() => {
    // 🔒 Reset da conversa ativa para evitar race conditions
    activeConversationRef.current = null;

    setState({
      messages: [],
      hasMoreMessages: true,
      isLoadingMore: false,
      isInitialLoading: true,
      oldestMessageId: null,
      error: null,
    });
    loadingRef.current = false;
  }, []);

  // Adicionar mensagem enviada à lista
  const addSentMessage = useCallback((message: Message) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  return {
    ...state,
    loadInitialMessages,
    loadMoreMessages,
    addMessage,
    updateMessageStatus,
    resetHistory,
    addSentMessage, // ✅ Novo método para mensagens enviadas
  };
};
