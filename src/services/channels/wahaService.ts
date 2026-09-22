import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  WahaConnectionParams,
  WahaAuthorizationResponse,
  WahaQrCodeResponse,
  WahaLogoutResponse,
} from '@/types/channels/inbox';

/**
 * WAHA WhatsApp provider service
 * Handles authorization, QR code retrieval, and logout operations
 */
const WahaService = {
  /**
   * Verify WAHA connection by posting authorization params.
   * Returns the session name, the WAHA session status and the per-channel
   * webhook_hmac_key that must be threaded into the channel's provider_config.
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
   * Fetch the pairing QR code for a WAHA inbox, as a data URL.
   */
  async getQRCode(inboxId: string): Promise<WahaQrCodeResponse> {
    const response = await api.get(`/waha/qrcodes/${inboxId}`);
    return extractData<WahaQrCodeResponse>(response);
  },

  /**
   * Logout from a WAHA session (logs out and stops the remote session).
   */
  async logout(inboxId: string): Promise<WahaLogoutResponse> {
    const response = await api.delete('/waha/authorization/logout', { params: { id: inboxId } });
    return extractData<WahaLogoutResponse>(response);
  },
};

export default WahaService;
