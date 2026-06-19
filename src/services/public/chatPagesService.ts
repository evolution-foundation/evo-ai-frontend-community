import apiPublic from '@/services/core/apiPublic';

export interface ChatPageAppearance {
  primary_color?: string;
  logo_url?: string;
}

export interface ChatPageConfig {
  slug: string;
  title?: string;
  appearance: ChatPageAppearance;
  website_token: string;
}

/**
 * Service para a API pública (anônima) de páginas de chat (B14.03).
 * Endpoint: GET /public/api/v1/chat_pages/:slug — resolve o slug e devolve o
 * website_token do widget para montar o widget existente. Sem autenticação.
 */
class ChatPagesService {
  private baseURL = '/chat_pages';

  async getPage(slug: string): Promise<ChatPageConfig> {
    const { data } = await apiPublic.get<{ data: ChatPageConfig }>(`${this.baseURL}/${slug}`);
    return data.data;
  }
}

export const chatPagesService = new ChatPagesService();
export default chatPagesService;
