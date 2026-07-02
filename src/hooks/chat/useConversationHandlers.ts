import { useCallback } from 'react';
import { toast } from 'sonner';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/types/chat/api';
import { isActionNotSupported } from '@/utils/chat/actionSupport';
import { doesConversationMatchFilters } from '@/utils/chat/conversationMatch';

export const useConversationHandlers = () => {
  const { can } = usePermissions();
  const { conversations, filters } = useChatContext();
  const { user: currentUser } = useAuth();

  // Após uma mutação, reconcilia SÓ esta conversa contra a view ativa: se ela
  // não casa mais o filtro atual (ex.: resolvi enquanto via "Abertas"), some da
  // lista localmente (vai pro buffer hidden) — sem refetch da lista inteira.
  // Mesma regra que o realtime (WebSocket) já usa.
  const reconcileWithActiveView = useCallback(
    (updated: Conversation) => {
      if (!doesConversationMatchFilters(updated, filters.state.activeFilters, currentUser?.id)) {
        conversations.addHiddenConversation(updated);
        conversations.removeConversation(String(updated.id));
      }
    },
    [conversations, filters.state.activeFilters, currentUser?.id],
  );

  const handleMarkAsRead = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.markAsRead(conversation.id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    },
    [conversations],
  );

  const handleMarkAsUnread = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.markAsUnread(conversation.id);
      } catch (error) {
        console.error('Error marking as unread:', error);
      }
    },
    [conversations],
  );

  const handleMarkAsResolved = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'resolved');
        // Eixo A: em vez de refetch da lista, reconcilia só esta conversa.
        reconcileWithActiveView({ ...conversation, status: 'resolved' });
      } catch (error) {
        console.error('❌ Error marking as resolved:', error);
        throw error;
      }
    },
    [conversations, reconcileWithActiveView],
  );

  const handlePostpone = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'pending');
        reconcileWithActiveView({ ...conversation, status: 'pending' });
      } catch (error) {
        console.error('❌ Error marking as pending:', error);
      }
    },
    [conversations, reconcileWithActiveView],
  );

  const handleMarkAsOpen = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'open');
        reconcileWithActiveView({ ...conversation, status: 'open' });
      } catch (error) {
        console.error('❌ Error marking as open:', error);
      }
    },
    [conversations, reconcileWithActiveView],
  );

  const handleMarkAsSnoozed = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'snoozed');
        reconcileWithActiveView({ ...conversation, status: 'snoozed' });
      } catch (error) {
        console.error('❌ Error marking as snoozed:', error);
      }
    },
    [conversations, reconcileWithActiveView],
  );

  const handleSetPriority = useCallback(
    async (
      conversation: Conversation,
      priority: 'low' | 'medium' | 'high' | 'urgent' | null,
    ) => {
      try {
        await conversations.updateConversationPriority(conversation.id, priority);
        // Prioridade não é eixo das views padrão, então o reconcile normalmente
        // mantém a conversa (correto); mas roda por consistência e p/ filtros avançados.
        reconcileWithActiveView({ ...conversation, priority });
      } catch (error) {
        console.error('❌ Error updating priority:', error);
      }
    },
    [conversations, reconcileWithActiveView],
  );

  // Pin/arquivar não precisam de reconcile-por-filtro: o memo visibleConversations
  // já re-ordena por custom_attributes.pinned e filtra por archived. Basta o patch
  // (UPDATE_CONVERSATION com response.data) e NÃO refetchar a lista.
  const handlePinConversation = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.pinConversation(conversation.id);
      } catch (error) {
        if (isActionNotSupported(error)) {
          return;
        }
        console.error('❌ Error pinning conversation:', error);
      }
    },
    [conversations],
  );

  const handleUnpinConversation = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.unpinConversation(conversation.id);
      } catch (error) {
        if (isActionNotSupported(error)) {
          return;
        }
        console.error('❌ Error unpinning conversation:', error);
      }
    },
    [conversations],
  );

  const handleArchiveConversation = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.archiveConversation(conversation.id);
      } catch (error) {
        if (isActionNotSupported(error)) {
          return;
        }
        console.error('❌ Error archiving conversation:', error);
      }
    },
    [conversations],
  );

  const handleUnarchiveConversation = useCallback(
    async (conversation: Conversation) => {
      try {
        await conversations.unarchiveConversation(conversation.id);
      } catch (error) {
        if (isActionNotSupported(error)) {
          return;
        }
        console.error('❌ Error unarchiving conversation:', error);
      }
    },
    [conversations],
  );

  const handleDeleteConversation = useCallback(
    (conversation: Conversation) => {
      if (!can('conversations', 'delete')) {
        toast.error('Você não tem permissão para deletar conversas');
        return;
      }
      return conversation; // Retorna para o componente pai gerenciar o modal
    },
    [can],
  );

  return {
    handleMarkAsRead,
    handleMarkAsUnread,
    handleMarkAsResolved,
    handlePostpone,
    handleMarkAsOpen,
    handleMarkAsSnoozed,
    handleSetPriority,
    handlePinConversation,
    handleUnpinConversation,
    handleArchiveConversation,
    handleUnarchiveConversation,
    handleDeleteConversation,
  };
};
