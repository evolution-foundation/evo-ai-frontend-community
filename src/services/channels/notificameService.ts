import api from '@/services/core/api';
import type {
  NotificameVerifyPayload,
  NotificameChannel,
  NotificameVerifyResponse,
} from '@/types/channels/inbox';

interface NotificameChannelsResponse {
  channels: NotificameChannel[];
}

/**
 * Notificame Service
 * Handles all API calls related to Notificame WhatsApp integration
 */
class NotificameService {
  /**
   * Verify Notificame connection and list available channels
   */
  async verifyConnection(payload: NotificameVerifyPayload): Promise<NotificameVerifyResponse> {
    const response = await api.post(`/channels/notificame/verify`, {
      api_token: payload.api_token,
      channel_id: payload.channel_id,
      phone_number: payload.phone_number,
    });

    // Backend envelope is `{ success, data: { channels: [...] }, message }`.
    // The previous version read `response.data?.channels` (wrong nesting) and
    // also spread `...response.data` at the end, which clobbered the literal
    // `success` and `message` with values from a higher level of the response.
    const body = response.data ?? {};
    const inner = body.data ?? {};
    return {
      success: body.success ?? true,
      message: body.message || 'Conexão verificada com sucesso',
      channels: inner.channels ?? [],
    };
  }

  /**
   * List available channels from Notificame account
   */
  async listChannels(apiToken: string): Promise<{ channels: NotificameChannel[] }> {
    const response = await api.post(`/channels/notificame/channels`, {
      api_token: apiToken,
    });

    return {
      channels: response.data?.channels || [],
    };
  }

  /**
   * Get available Notificame channels by API token
   * @param apiToken - Notificame API token
   * @returns List of available channels
   */
  async getChannels(apiToken: string): Promise<NotificameChannel[]> {
    const response = await api.get<NotificameChannelsResponse>(`/notificame/channels`, {
      params: { token: apiToken },
    });

    return response.data?.channels || [];
  }
}

export default new NotificameService();
