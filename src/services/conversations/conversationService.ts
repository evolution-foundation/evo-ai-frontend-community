import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Conversation,
  Message,
  ConversationParams,
  MessageParams,
  MessageDeleteResponse,
  ConversationDeleteResponse,
  ConversationUpdateResponse,
  ConversationCreateData,
  ConversationResponse,
  ConversationsResponse,
} from '@/types/chat/api';

export const conversationAPI = {
  // Create new conversation
  async create(data: ConversationCreateData): Promise<Conversation> {
    const response = await api.post('/conversations', data);
    return extractData<Conversation>(response);
  },

  // Get conversations list
  async getConversations(params: ConversationParams = {}): Promise<{
    data: { payload: Conversation[] };
    meta: any;
  }> {
    const response = await api.get('/conversations', {
      params,
    });
    return extractData<any>(response);
  },

  // List conversations (alternative method name for compatibility)
  async list(params?: ConversationParams): Promise<ConversationsResponse> {
    const response = await api.get('/conversations', { params });
    return extractResponse<Conversation>(response) as ConversationsResponse;
  },

  // Get single conversation
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get(`/conversations/${conversationId}`);
    return extractData<any>(response);
  },

  // Get single conversation (alternative method name for compatibility)
  async get(conversationId: string): Promise<ConversationResponse> {
    const response = await api.get(`/conversations/${conversationId}`);
    return extractData<ConversationResponse>(response);
  },

  // Update conversation
  async updateConversation(
    conversationId: string,
    data: Partial<Conversation>,
  ): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}`, data);
    return extractData<any>(response);
  },

  // Get conversation messages
  async getMessages(conversationId: string): Promise<{ data: Message[] }> {
    const response = await api.get(`/conversations/${conversationId}/messages`);
    return extractData<any>(response);
  },

  // Send message
  async sendMessage(conversationId: string, messageData: MessageParams): Promise<Message> {
    const formData = new FormData();

    formData.append('content', messageData.content);
    formData.append('message_type', messageData.message_type || 'outgoing');

    if (messageData.private) {
      formData.append('private', 'true');
    }

    if (messageData.content_attributes) {
      formData.append('content_attributes', JSON.stringify(messageData.content_attributes));
    }

    if (messageData.attachments) {
      messageData.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await api.post(`/conversations/${conversationId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return extractData<any>(response);
  },

  // Update message
  async updateMessage(
    conversationId: string,
    messageId: string,
    data: Partial<Message>,
  ): Promise<Message> {
    const response = await api.put(`/conversations/${conversationId}/messages/${messageId}`, data);
    return extractData<any>(response);
  },

  // Delete message
  async deleteMessage(conversationId: string, messageId: string): Promise<MessageDeleteResponse> {
    const response = await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
    return extractData<MessageDeleteResponse>(response);
  },

  // Assign conversation
  async assignConversation(
    conversationId: string,
    assigneeId: string | null,
    teamId?: string | null,
  ): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/assignments`, {
      assignee_id: assigneeId,
      team_id: teamId,
    });
    return extractData<any>(response);
  },

  // Update conversation status
  async updateStatus(
    conversationId: string,
    status: 'open' | 'resolved' | 'pending',
  ): Promise<Conversation> {
    return this.updateConversation(conversationId, { status });
  },

  // Update conversation status (alternative method using toggle_status endpoint)
  async toggleStatus(conversationId: string, status: string): Promise<ConversationResponse> {
    const response = await api.post(`/conversations/${conversationId}/toggle_status`, { status });
    return extractData<ConversationResponse>(response);
  },

  // Add labels to conversation
  async addLabels(conversationId: string, labels: string[]): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/labels`, { labels });
    return extractData<any>(response);
  },

  // Remove labels from conversation
  async removeLabels(conversationId: string, labels: string[]): Promise<Conversation> {
    const response = await api.delete(`/conversations/${conversationId}/labels`, {
      data: { labels },
    });
    return extractData<any>(response);
  },

  // Mute conversation
  async muteConversation(conversationId: string): Promise<ConversationUpdateResponse> {
    const response = await api.post(`/conversations/${conversationId}/mute`);
    return extractData<ConversationUpdateResponse>(response);
  },

  // Unmute conversation
  async unmuteConversation(conversationId: string): Promise<ConversationUpdateResponse> {
    const response = await api.post(`/conversations/${conversationId}/unmute`);
    return extractData<ConversationUpdateResponse>(response);
  },

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<ConversationDeleteResponse> {
    const response = await api.delete(`/conversations/${conversationId}`);
    return extractData<ConversationDeleteResponse>(response);
  },

  // Mark conversation as read
  async markAsRead(conversationId: string): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/update_last_seen`);
    return extractData<any>(response);
  },

  // Aggregate unread incoming-message count across all accessible conversations
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await api.get('/conversations/unread_count');
    return extractData<{ unread_count: number }>(response);
  },

  // Mark conversation as unread
  async markAsUnread(conversationId: string): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/unread`);
    return extractData<any>(response);
  },

  // Get conversation counts
  async getConversationCounts(): Promise<{
    open_count: number;
    resolved_count: number;
    pending_count: number;
    mine_count: number;
    unassigned_count: number;
    all_count: number;
  }> {
    const response = await api.get('/conversations/meta');
    return extractData<any>(response);
  },
};
