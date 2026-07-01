import api from '@/services/core/api';
import { withRetry } from '@/utils/retry/retryHelper';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  ConversationsListResponse,
  ConversationResponse,
  Message,
  MessagesResponse,
  FilterRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  SendMessageRequest,
  ConversationListParams,
  MessageListParams,
  Label,
  Team,
  Inbox,
  Pipeline,
} from '@/types/chat/api';
import { extractData } from '@/utils/apiHelpers';

class ChatService {
  // ===== CONVERSATIONS =====

  async getConversations(params?: ConversationListParams): Promise<ConversationsListResponse> {
    return withRetry(async () => {
      const response = await api.get('/conversations', {
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? params?.page_size ?? params?.pageSize ?? DEFAULT_PAGE_SIZE,
          ...params,
        },
      });
      return response.data;
    });
  }

  async filterConversations(filterRequest: FilterRequest): Promise<ConversationsListResponse> {
    const response = await api.post('/conversations/filter', filterRequest);
    return response.data;
  }

  // ✅ Novos métodos para carregar opções de filtro
  async getAvailableLabels(): Promise<Label[]> {
    return withRetry(async () => {
      const response = await api.get('/labels');
      return response.data;
    });
  }

  async getAvailableTeams(): Promise<Team[]> {
    return withRetry(async () => {
      const response = await api.get('/teams');
      return response.data;
    });
  }

  async getAvailableInboxes(): Promise<Inbox[]> {
    return withRetry(async () => {
      const response = await api.get('/inboxes');
      return response.data;
    });
  }

  async getAvailablePipelines(): Promise<Pipeline[]> {
    return withRetry(async () => {
      const response = await api.get('/pipelines');
      return extractData<Pipeline[]>(response);
    });
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    return withRetry(async () => {
      await api.post(`/conversations/${conversationId}/update_last_seen`);
    });
  }

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversation(
    conversationData: CreateConversationRequest,
  ): Promise<ConversationResponse> {
    const response = await api.post('/conversations', conversationData);
    return response.data;
  }

  async updateConversation(
    conversationId: string,
    conversationData: UpdateConversationRequest,
  ): Promise<ConversationResponse> {
    const response = await api.patch(`/conversations/${conversationId}`, conversationData);
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`);
  }

  // ===== CONVERSATION ACTIONS =====

  async toggleStatus(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/toggle_status`);
    return response.data;
  }

  async updateConversationStatus(
    conversationId: string,
    status: 'open' | 'resolved' | 'pending' | 'snoozed',
  ): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/toggle_status`, { status });
    return response.data;
  }

  // EVO-1680 — reverse human→bot handoff. Backend moves the conversation to
  // pending, clears the assignee, persists a timeline activity, and dispatches
  // CONVERSATION_HUMAN_HANDOFF so the BotProcessorService picks it up on the
  // next incoming message.
  async returnConversationToBot(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/return_to_bot`);
    return response.data;
  }

  async updateConversationPriority(
    conversationId: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
  ): Promise<ConversationResponse> {
    const response = await api.patch(`/conversations/${conversationId}`, { priority });
    return response.data;
  }

  async pinConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/pin`);
    return response.data;
  }

  async unpinConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/unpin`);
    return response.data;
  }

  async archiveConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/archive`);
    return response.data;
  }

  async unarchiveConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/unarchive`);
    return response.data;
  }

  async updateConversationCustomAttributes(
    conversationId: string,
    customAttributes: Record<string, unknown>,
  ): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/custom_attributes`, {
      custom_attributes: customAttributes,
    });
    return response.data;
  }

  async assignConversation(
    conversationId: string,
    assigneeId?: string,
  ): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/assignments`, {
      assignee_id: assigneeId,
    });
    return response.data;
  }

  async addLabels(conversationId: string, labels: string[]): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/labels`, { labels });
    return response.data;
  }

  async removeLabels(conversationId: string, labels: string[]): Promise<ConversationResponse> {
    const response = await api.delete(`/conversations/${conversationId}/labels`, {
      data: { labels },
    });
    return response.data;
  }

  async muteConversation(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/mute`);
  }

  async unmuteConversation(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/unmute`);
  }

  async snoozeConversation(
    conversationId: string,
    untilTime?: string,
  ): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/snooze`, {
      until: untilTime,
    });
    return response.data;
  }

  // ===== MESSAGES =====

  async getMessages(conversationId: string, params?: MessageListParams): Promise<MessagesResponse> {
    const response = await api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  }

  async sendMessage(conversationId: string, messageData: SendMessageRequest): Promise<Message> {
    return withRetry(async () => {
      const response = await api.post(`/conversations/${conversationId}/messages`, messageData);
      return extractData<Message>(response);
    });
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<Message> {
    const response = await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
    return extractData<Message>(response);
  }

  async sendMessageWithAttachments(
    conversationId: string,
    content: string,
    files: File[],
    isPrivate: boolean = false,
    cannedResponseId?: string | null,
    onUploadProgress?: (progress: number, fileName: string) => void,
    inReplyTo?: string | number,
    echoId?: string,
    isRecordedAudio?: boolean | string[], // boolean: all attachments | string[]: filenames marked as PTT
  ): Promise<Message> {
    return withRetry(async () => {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('message_type', 'outgoing');
      formData.append('private', String(isPrivate));

      if (inReplyTo) {
        formData.append('content_attributes[in_reply_to]', String(inReplyTo));
      }

      if (cannedResponseId) {
        formData.append('canned_response_id', cannedResponseId);
      }

      if (echoId) {
        formData.append('echo_id', echoId);
      }

      // Sinaliza ao backend que o(s) áudio(s) é(são) PTT/voice message.
      // - true: todos os attachments são PTT (caso do recorder).
      // - string[]: apenas os filenames listados são PTT (mistura audio+outros).
      // Backend (message_builder.rb) aceita boolean OU array (JSON string).
      if (isRecordedAudio === true) {
        formData.append('is_recorded_audio', 'true');
      } else if (Array.isArray(isRecordedAudio) && isRecordedAudio.length > 0) {
        formData.append('is_recorded_audio', JSON.stringify(isRecordedAudio));
      }

      files.forEach(file => {
        formData.append('attachments[]', file);
      });

      const response = await api.post(`/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (onUploadProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Para simplificar, usar o primeiro arquivo como referência
            onUploadProgress(progress, files[0]?.name || 'arquivo');
          }
        },
      });
      return extractData<Message>(response);
    });
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    messageData: Partial<SendMessageRequest>,
  ): Promise<Message> {
    const response = await api.patch(
      `/conversations/${conversationId}/messages/${messageId}`,
      messageData,
    );
    return extractData<Message>(response);
  }

  // Atualiza o status de N conversas via o endpoint dedicado /bulk_actions
  // (1 request, reconcilia a view no chamador). Mudar status é uma ação
  // deliberada — dispara automações/webhooks/atividade no backend (correto).
  async bulkUpdateStatus(
    displayIds: string[],
    status: 'open' | 'pending' | 'resolved',
  ): Promise<{ success_ids: number[]; failed_ids: number[] }> {
    const response = await api.post('/bulk_actions', {
      type: 'Conversation',
      ids: displayIds,
      fields: { status },
    });
    const data = response.data?.data;
    return data ?? { success_ids: [], failed_ids: [] };
  }

  async bulkResolve(displayIds: string[]): Promise<{ success_ids: number[]; failed_ids: number[] }> {
    return this.bulkUpdateStatus(displayIds, 'resolved');
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
