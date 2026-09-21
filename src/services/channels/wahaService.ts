import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { WahaConnectionParams, WahaAuthorizationResponse } from '@/types/channels/inbox';

/**
 * WAHA WhatsApp provider service
 * Handles authorization, QR code retrieval, and logout operations
 */
const WahaService = {
  /**
   * Verify WAHA connection by posting authorization params
   * Returns the authorization response with inbox ID and session name
   */
  async verifyConnection(params: WahaConnectionParams): Promise<WahaAuthorizationResponse> {
    const requestData = {
      authorization: {
        base_url: params.baseUrl,
        api_key: params.apiKey,
        session_name: params.sessionName,
        phone_number: params.phoneNumber,
      },
    };
    const response = await api.post('/waha/authorization', requestData);
    return extractData<WahaAuthorizationResponse>(response);
  },

  /**
   * Fetch QR code for a WAHA inbox
   */
  async getQRCode(inboxId: string) {
    const response = await api.get(`/waha/qrcodes/${inboxId}`);
    return extractData<any>(response);
  },

  /**
   * Logout from a WAHA session
   */
  async logout(inboxId: string) {
    const response = await api.delete('/waha/authorization/logout', { params: { id: inboxId } });
    return extractData<any>(response);
  },
};

export default WahaService;
