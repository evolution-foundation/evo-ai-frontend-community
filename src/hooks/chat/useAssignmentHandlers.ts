import { useTranslation as useUiTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAppDataStore } from '@/store/appDataStore';
import { Conversation } from '@/types/chat/api';
import type { AssignmentType } from '@/components/chat/assignment';

export const useAssignmentHandlers = () => {
  const { t: tUi } = useUiTranslation();
  const { can } = usePermissions();
  const { conversations } = useChatContext();
  const {
    agents,
    teams,
    labels,
    fetchAgents,
    fetchTeams,
    fetchLabels,
    isLoadingAgents,
    isLoadingTeams,
    isLoadingLabels,
  } = useAppDataStore();

  const [isLoadingAssignmentData, setIsLoadingAssignmentData] = useState(false);

  // Load assignment data
  const loadAssignmentData = useCallback(
    async (type: AssignmentType) => {
      setIsLoadingAssignmentData(true);
      try {
        switch (type) {
          case 'agent':
            await fetchAgents();
            break;
          case 'team':
            await fetchTeams();
            break;
          case 'label':
            await fetchLabels(true);
            break;
        }
      } catch (error) {
        console.error('Error loading assignment data:', error);
      } finally {
        setIsLoadingAssignmentData(false);
      }
    },
    [fetchAgents, fetchTeams, fetchLabels],
  );

  const handleAssignAgent = useCallback(
    async (conversation: Conversation) => {
      if (!can('conversations', 'update')) {
        toast.error(tUi("interface:useassignmenthandlers.youDoNotHavePermissionToAssignConversations"));
        return;
      }

      await loadAssignmentData('agent');
      return { conversation, type: 'agent' as AssignmentType };
    },
    [can, loadAssignmentData, tUi],
  );

  const handleAssignTeam = useCallback(
    async (conversation: Conversation) => {
      if (!can('conversations', 'update')) {
        toast.error(tUi("interface:useassignmenthandlers.youDoNotHavePermissionToAssignConversations"));
        return;
      }

      await loadAssignmentData('team');
      return { conversation, type: 'team' as AssignmentType };
    },
    [can, loadAssignmentData, tUi],
  );

  const handleAssignTag = useCallback(
    async (conversation: Conversation) => {
      if (!can('conversations', 'update')) {
        toast.error(tUi("interface:useassignmenthandlers.youDoNotHavePermissionToAddLabels"));
        return;
      }

      await loadAssignmentData('label');
      return { conversation, type: 'label' as AssignmentType };
    },
    [can, loadAssignmentData, tUi],
  );

  const handleAssignmentConfirm = useCallback(
    async (conversation: Conversation, type: AssignmentType, selectedIds: string[]) => {
      const conversationId = String(conversation.id);

      try {
        switch (type) {
          case 'agent':
            await conversations.assignAgent(conversationId, selectedIds[0] || null);
            break;
          case 'team':
            await conversations.assignTeam(conversationId, selectedIds[0] || null);
            break;
          case 'label':
            await conversations.assignLabels(conversationId, selectedIds);
            break;
        }
      } catch (error) {
        console.error('Error in assignment:', error);
        throw error; // Re-throw to let modal handle it
      }
    },
    [conversations],
  );

  return {
    users: agents,
    teams,
    labels,
    isLoadingAssignmentData:
      isLoadingAssignmentData || isLoadingAgents || isLoadingTeams || isLoadingLabels,
    loadAssignmentData,
    handleAssignAgent,
    handleAssignTeam,
    handleAssignTag,
    handleAssignmentConfirm,
  };
};
