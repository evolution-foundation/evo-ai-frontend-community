import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Inbox,
  InboxesResponse,
  InboxResponse,
  InboxDeleteResponse,
  ChannelPayload,
} from '@/types/channels/inbox';

const appendFormDataValue = (formData: FormData, key: string, value: unknown): void => {
  if (value === undefined || value === null) return;

  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => appendFormDataValue(formData, `${key}[]`, item));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
      appendFormDataValue(formData, `${key}[${nestedKey}]`, nestedValue);
    });
    return;
  }

  formData.append(key, String(value));
};

// Inbox service aligned with Evolution API
// Only endpoints needed for the Channels page are implemented initially.
const InboxesService = {
  async list(): Promise<InboxesResponse> {
    const response = await api.get('/inboxes');
    return extractResponse<Inbox>(response) as InboxesResponse;
  },

  async getById(inboxId: string): Promise<InboxResponse> {
    const response = await api.get(`/inboxes/${inboxId}`);
    // getById returns StandardResponse<Inbox> (single object), not PaginatedResponse
    return {
      success: response.data.success,
      data: extractData<Inbox>(response),
      meta: response.data.meta,
      message: response.data?.message || '',
    } as InboxResponse;
  },

  async remove(inboxId: string): Promise<InboxDeleteResponse> {
    const response = await api.delete(`/inboxes/${inboxId}`);
    return extractData<InboxDeleteResponse>(response);
  },

  async createChannel(payload: ChannelPayload): Promise<InboxResponse> {
    const response = await api.post('/inboxes', payload);
    return extractData<InboxResponse>(response);
  },

  async create(payload: ChannelPayload): Promise<InboxResponse> {
    const response = await api.post('/inboxes', payload);
    return extractData<InboxResponse>(response);
  },

  async getCampaigns(inboxId: string) {
    const response = await api.get(`/inboxes/${inboxId}/campaigns`);
    return extractData(response);
  },

  async deleteAvatar(inboxId: string): Promise<InboxDeleteResponse> {
    const response = await api.delete(`/inboxes/${inboxId}/avatar`);
    return extractData<InboxDeleteResponse>(response);
  },

  async getAgentBot(inboxId: string) {
    const response = await api.get(`/inboxes/${inboxId}/agent_bot`);
    return extractData(response);
  },

  async setAgentBot(inboxId: string, botId: string) {
    const response = await api.post(`/inboxes/${inboxId}/set_agent_bot`, {
      agent_bot: botId,
    });
    return extractData(response);
  },

  async setupChannelProvider(inboxId: string) {
    const response = await api.post(`/inboxes/${inboxId}/setup_channel_provider`);
    return extractData(response);
  },

  async disconnectChannelProvider(inboxId: string) {
    const response = await api.post(`/inboxes/${inboxId}/disconnect_channel_provider`);
    return extractData(response);
  },

  async syncWhatsappSubscription(inboxId: string) {
    const response = await api.post(`/inboxes/${inboxId}/sync_whatsapp_subscription`);
    return extractData(response);
  },

  async update(inboxId: string, payload: Record<string, unknown>): Promise<InboxResponse> {
    const response = await api.patch(`/inboxes/${inboxId}`, payload);
    return extractData<InboxResponse>(response);
  },

  async updateWithAvatar(
    inboxId: string,
    payload: Record<string, unknown>,
    avatar: File,
  ): Promise<InboxResponse> {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      appendFormDataValue(formData, key, value);
    });
    formData.append('avatar', avatar);

    const response = await api.patch(`/inboxes/${inboxId}`, formData);
    return extractData<InboxResponse>(response);
  },

  async getFacebookPosts(inboxId: string, limit: number = 20) {
    const response = await api.get(`/inboxes/${inboxId}/facebook_posts`, {
      params: { limit },
    });
    return extractData(response);
  },
};

export default InboxesService;
