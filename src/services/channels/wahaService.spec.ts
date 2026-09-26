import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/core/api';
import WahaService from './wahaService';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/utils/apiHelpers', () => ({
  extractData: vi.fn((response: { data: unknown }) => response.data),
  extractResponse: vi.fn(),
}));

describe('WahaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifyConnection posts to /waha/authorization with the expected body', async () => {
    const postMock = vi.mocked(api.post);
    postMock.mockResolvedValue({
      data: { session_name: 'default', status: 'SCAN_QR_CODE', webhook_hmac_key: 'hmac-key' },
    } as never);

    const result = await WahaService.verifyConnection({
      baseUrl: 'https://waha.example.com',
      apiKey: 'key',
      sessionName: 'default',
      phoneNumber: '+5511999999999',
    });

    expect(postMock).toHaveBeenCalledWith('/waha/authorization', {
      authorization: {
        base_url: 'https://waha.example.com',
        api_key: 'key',
        session_name: 'default',
        phone_number: '+5511999999999',
      },
    });
    expect(result).toEqual({
      session_name: 'default',
      status: 'SCAN_QR_CODE',
      webhook_hmac_key: 'hmac-key',
    });
  });

  it('getQRCode fetches the QR for an inbox', async () => {
    const getMock = vi.mocked(api.get);
    getMock.mockResolvedValue({ data: { qr_data_url: 'data:image/png;base64,AAA' } } as never);

    const result = await WahaService.getQRCode('inbox-1');

    expect(getMock).toHaveBeenCalledWith('/waha/qrcodes/inbox-1');
    expect(result).toEqual({ qr_data_url: 'data:image/png;base64,AAA' });
  });

  it('logout deletes the session', async () => {
    const deleteMock = vi.mocked(api.delete);
    deleteMock.mockResolvedValue({ data: {} } as never);

    await WahaService.logout('inbox-1');

    expect(deleteMock).toHaveBeenCalledWith('/waha/authorization/logout', { params: { id: 'inbox-1' } });
  });
});
