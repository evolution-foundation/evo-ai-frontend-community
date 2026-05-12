import { useCallback } from 'react';
import { toast } from 'sonner';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Conversation } from '@/types/chat/api';
import { isActionNotSupported } from '@/utils/chat/actionSupport';

export const useConversationHandlers = () => {
  const { can } = usePermissions();
  const { conversations } = useChatContext();

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
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'resolved', onReload);
      } catch (error) {
        console.error('❌ Error marking as resolved:', error);
        throw error;
      }
    },
    [conversations],
  );

  const handlePostpone = useCallback(
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'pending', onReload);
      } catch (error) {
        console.error('❌ Error marking as pending:', error);
      }
    },
    [conversations],
  );

  const handleMarkAsOpen = useCallback(
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'open', onReload);
      } catch (error) {
        console.error('❌ Error marking as open:', error);
      }
    },
    [conversations],
  );

  const handleMarkAsSnoozed = useCallback(
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.updateConversationStatus(conversation.id, 'snoozed', onReload);
      } catch (error) {
        console.error('❌ Error marking as snoozed:', error);
      }
    },
    [conversations],
  );

  const handleSetPriority = useCallback(
    async (
      conversation: Conversation,
      priority: 'low' | 'medium' | 'high' | 'urgent' | null,
      onReload?: () => Promise<void>,
    ) => {
      try {
        await conversations.updateConversationPriority(conversation.id, priority, onReload);
      } catch (error) {
        console.error('❌ Error updating priority:', error);
      }
    },
    [conversations],
  );

  const handlePinConversation = useCallback(
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.pinConversation(conversation.id, onReload);
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
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.unpinConversation(conversation.id, onReload);
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
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.archiveConversation(conversation.id, onReload);
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
    async (conversation: Conversation, onReload?: () => Promise<void>) => {
      try {
        await conversations.unarchiveConversation(conversation.id, onReload);
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
