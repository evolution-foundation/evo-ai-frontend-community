import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import { ChatPage, ChatPagePayload, PaginationMeta, WebWidgetOption } from '@/types/chatPages';

interface InboxLike {
  id: string;
  name: string;
  channel_type?: string;
  website_token?: string;
}

/**
 * Service para o CRUD admin de páginas de chat (B14.08 / EVO-1847).
 * Usa o client autenticado e consome /api/v1/chat_pages.
 *
 * As chat pages embutem um web widget existente; o select do builder reusa
 * GET /api/v1/inboxes filtrando os inboxes do tipo web widget.
 */
class ChatPagesService {
  private readonly baseUrl = '/chat_pages';

  async list(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    published?: boolean;
  }): Promise<{ data: ChatPage[]; meta: { pagination?: PaginationMeta } }> {
    const response = await api.get(this.baseUrl, { params });
    const env = extractResponse<ChatPage>(response);
    return { data: env.data, meta: env.meta };
  }

  async create(payload: ChatPagePayload): Promise<ChatPage> {
    const response = await api.post(this.baseUrl, { chat_page: payload });
    // extractData already unwraps { success, data } -> the serialized page.
    return extractData<ChatPage>(response);
  }

  async update(id: string, payload: ChatPagePayload): Promise<ChatPage> {
    const response = await api.patch(`${this.baseUrl}/${id}`, { chat_page: payload });
    return extractData<ChatPage>(response);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // Existing web-widget inboxes available to embed (id + name + website_token).
  async listWebWidgets(): Promise<WebWidgetOption[]> {
    const response = await api.get('/inboxes');
    const env = extractResponse<InboxLike>(response);
    return (env.data || [])
      .filter((inbox) => inbox.channel_type === 'Channel::WebWidget' && !!inbox.website_token)
      .map((inbox) => ({
        inbox_id: inbox.id,
        name: inbox.name,
        website_token: inbox.website_token as string,
      }));
  }
}

export const chatPagesService = new ChatPagesService();
export default chatPagesService;
