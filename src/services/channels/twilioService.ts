import i18n from '@/i18n/config';
import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { TwilioWhatsappVerifyPayload, TwilioWhatsappVerifyResponse } from '@/types/channels/inbox';

class TwilioService {
  /**
   * Verify Twilio WhatsApp connection before creating channel
   */
  async verifyConnection(
    payload: TwilioWhatsappVerifyPayload,
  ): Promise<TwilioWhatsappVerifyResponse> {
    const response = await api.post(`/channels/twilio/verify`, {
      account_sid: payload.accountSid,
      auth_token: payload.authToken,
      api_key_sid: payload.apiKeySid,
      phone_number: payload.phoneNumber,
      messaging_service_sid: payload.messagingServiceSid,
      medium: 'whatsapp',
    });

    return {
      success: true,
      message: response.data?.message || i18n.t("channels:newChannel.messages.connectionVerified"),
      ...response.data,
    };
  }

  /**
   * List available phone numbers or messaging services from Twilio account
   */
  async listResources(
    payload: Pick<TwilioWhatsappVerifyPayload, 'accountSid' | 'authToken' | 'apiKeySid'>,
  ): Promise<{ phoneNumbers: string[]; messagingServices: Array<{ sid: string; name: string }> }> {
    const response = await api.post(`/channels/twilio/resources`, {
      account_sid: payload.accountSid,
      auth_token: payload.authToken,
      api_key_sid: payload.apiKeySid,
    });

    return extractData<any>(response);
  }
}

export default new TwilioService();
