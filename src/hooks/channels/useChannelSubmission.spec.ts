import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useChannelSubmission } from './useChannelSubmission';
import InboxesService from '@/services/channels/inboxesService';
import EvolutionService from '@/services/channels/evolutionService';
import EvolutionGoService from '@/services/channels/evolutionGoService';
import WahaService from '@/services/channels/wahaService';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}));

const { fetchInboxesMock } = vi.hoisted(() => ({ fetchInboxesMock: vi.fn() }));
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({ addInbox: vi.fn(), fetchInboxes: fetchInboxesMock }),
}));

// Validation is exercised by its own spec; here we let every payload through and
// keep the real `getStr` semantics the submission code relies on.
vi.mock('@/hooks/channels/useChannelValidation', () => ({
  useChannelValidation: () => ({
    validateByChannelAndProvider: () => true,
    getStr: (form: Record<string, unknown>, key: string, fallback = '') =>
      typeof form[key] === 'string' ? (form[key] as string) : fallback,
  }),
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: { createChannel: vi.fn(), checkArchivedMatch: vi.fn(), reactivate: vi.fn(), replaceArchivedChannel: vi.fn() },
}));
vi.mock('@/services/channels/evolutionService', () => ({
  default: { healthCheck: vi.fn(), verifyConnection: vi.fn() },
}));
vi.mock('@/services/channels/evolutionGoService', () => ({
  default: { healthCheck: vi.fn(), verifyConnection: vi.fn(), deleteInstance: vi.fn() },
}));
vi.mock('@/services/channels/twilioService', () => ({
  default: { verifyConnection: vi.fn().mockResolvedValue({ success: true }) },
}));
vi.mock('@/services/channels/notificameService', () => ({
  default: { verifyConnection: vi.fn().mockResolvedValue({ success: true }) },
}));
vi.mock('@/services/channels/wahaService', () => ({
  default: { verifyConnection: vi.fn() },
}));

const createChannelMock = vi.mocked(InboxesService.createChannel);
const checkArchivedMatchMock = vi.mocked(InboxesService.checkArchivedMatch);
const reactivateMock = vi.mocked(InboxesService.reactivate);
const replaceArchivedChannelMock = vi.mocked(InboxesService.replaceArchivedChannel);

const submit = async (channelType: string, providerId: string, form: Record<string, unknown>, config = {}) => {
  const { result } = renderHook(() => useChannelSubmission(form as never));
  await act(async () => {
    await result.current.submitCreate(
      { id: channelType, name: channelType, type: channelType } as never,
      { id: providerId, name: providerId } as never,
      form as never,
      config as never,
    );
  });
  return createChannelMock.mock.calls.at(-1)?.[0] as any;
};

describe('useChannelSubmission.submitCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createChannelMock.mockResolvedValue({ data: { id: 'inbox-1' } } as never);
    checkArchivedMatchMock.mockResolvedValue(null);
    reactivateMock.mockResolvedValue({} as never);
    replaceArchivedChannelMock.mockResolvedValue({ data: { id: 'archived-1' } } as never);
  });

  it('includes business_account_id in the WhatsApp Cloud provider_config (EVO-2093 regression)', async () => {
    const payload = await submit('whatsapp', 'whatsapp_cloud', {
      name: 'wa-cloud',
      display_name: 'WA Cloud',
      phone_number: '+5511999999999',
      api_key: 'key',
      phone_number_id: 'pnid',
      business_account_id: 'baid-123',
      waba_id: 'waba',
    });

    expect(payload.channel.provider).toBe('whatsapp_cloud');
    expect(payload.channel.provider_config).toMatchObject({
      api_key: 'key',
      phone_number_id: 'pnid',
      business_account_id: 'baid-123',
      waba_id: 'waba',
    });
  });

  it('builds the SMS Twilio payload', async () => {
    const payload = await submit('sms', 'twilio', {
      name: 'sms-twilio',
      account_sid: 'sid',
      auth_token: 'tok',
      phone_number: '+111',
    });
    expect(payload.channel.type).toBe('sms');
    expect(payload.channel.provider).toBe('twilio');
    expect(payload.channel.provider_config).toMatchObject({ account_sid: 'sid', auth_token: 'tok' });
  });

  it('builds the SMS Bandwidth payload', async () => {
    const payload = await submit('sms', 'bandwidth', {
      name: 'sms-bw',
      api_key: 'k',
      api_secret: 's',
      application_id: 'app',
      account_id: 'acc',
      phone_number: '+222',
    });
    expect(payload.channel.provider).toBe('bandwidth');
    expect(payload.channel.provider_config).toMatchObject({
      api_key: 'k',
      api_secret: 's',
      application_id: 'app',
      account_id: 'acc',
    });
  });

  it('builds the WhatsApp Evolution payload (global config skips health check)', async () => {
    vi.mocked(EvolutionService.verifyConnection).mockResolvedValue({} as never);
    const payload = await submit(
      'whatsapp',
      'evolution',
      { name: 'evo', phone_number: '+333' },
      { hasEvolutionConfig: true },
    );
    expect(payload.channel.provider).toBe('evolution');
    expect(EvolutionService.healthCheck).not.toHaveBeenCalled();
  });

  it('builds the WhatsApp Evolution Go payload from the verify response', async () => {
    vi.mocked(EvolutionGoService.verifyConnection).mockResolvedValue({
      instance_uuid: 'uuid-1',
      instance_token: 'tok-1',
    } as never);
    const payload = await submit(
      'whatsapp',
      'evolution_go',
      { name: 'evo-go', phone_number: '+444' },
      { hasEvolutionGoConfig: true },
    );
    expect(payload.channel.provider).toBe('evolution_go');
    expect(payload.channel.provider_config).toMatchObject({
      instance_uuid: 'uuid-1',
      instance_token: 'tok-1',
    });
  });

  it('builds the WhatsApp WAHA payload after verifying the connection', async () => {
    vi.mocked(WahaService.verifyConnection).mockResolvedValue({
      session_name: 'default',
      status: 'SCAN_QR_CODE',
      webhook_hmac_key: 'a'.repeat(64),
    } as never);

    const payload = await submit('whatsapp', 'waha', {
      name: 'waha-1',
      phone_number: '+5511999999999',
      base_url: 'https://waha.example.com',
      api_key: 'waha-key',
      session_name: 'default',
    });

    expect(WahaService.verifyConnection).toHaveBeenCalledWith({
      baseUrl: 'https://waha.example.com',
      apiKey: 'waha-key',
      sessionName: 'default',
      phoneNumber: '+5511999999999',
    });
    expect(payload.channel.type).toBe('whatsapp');
    expect(payload.channel.provider).toBe('waha');
    // webhook_hmac_key must be carried from the verifyConnection response into
    // provider_config, so the backend can verify inbound WAHA webhooks for the
    // channel that gets persisted from this payload (security fix: WAHA
    // webhooks previously had no authentication at all).
    expect(payload.channel.provider_config).toMatchObject({
      base_url: 'https://waha.example.com',
      api_key: 'waha-key',
      session_name: 'default',
      webhook_hmac_key: 'a'.repeat(64),
    });
  });

  it('does not create the channel when WAHA verification fails', async () => {
    vi.mocked(WahaService.verifyConnection).mockRejectedValue(new Error('WAHA unreachable'));

    await submit('whatsapp', 'waha', {
      name: 'waha-1',
      phone_number: '+5511999999999',
      base_url: 'https://waha.example.com',
      api_key: 'waha-key',
      session_name: 'default',
    });

    expect(createChannelMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('WAHA unreachable');
  });

  it('confirms the creation on screen', async () => {
    await submit('api', 'api', { name: 'api-inbox', webhook_url: 'https://hook' });

    expect(toast.success).toHaveBeenCalledWith('Canal criado com sucesso');
  });

  it('shows the reason the backend gave for refusing the create', async () => {
    createChannelMock.mockRejectedValue({
      response: {
        status: 422,
        data: {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Limite do plano excedido (5/5) para channels',
          },
        },
      },
      message: 'Request failed with status code 422',
    } as never);

    await submit('api', 'api', { name: 'api-inbox', webhook_url: 'https://hook' });

    expect(toast.error).toHaveBeenCalledWith('Limite do plano excedido (5/5) para channels');
  });

  it('falls back to its own message when the failure carries no envelope', async () => {
    createChannelMock.mockRejectedValue(new Error('Network Error') as never);

    await submit('api', 'api', { name: 'api-inbox', webhook_url: 'https://hook' });

    expect(toast.error).toHaveBeenCalledWith('Network Error');
  });

  // An envelope with a code and no message must fall THROUGH, not pick up the
  // English default extractError would have supplied for that shape.
  it('does not invent a message when the envelope carries none', async () => {
    createChannelMock.mockRejectedValue({
      response: { status: 422, data: { success: false, error: { code: 'QUOTA_EXCEEDED' } } },
      message: 'Request failed with status code 422',
    } as never);

    await submit('api', 'api', { name: 'api-inbox', webhook_url: 'https://hook' });

    expect(toast.error).not.toHaveBeenCalledWith('An error occurred');
    expect(toast.error).toHaveBeenCalledWith('Request failed with status code 422');
  });
});

describe('useChannelSubmission.testConnection — waha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wahaForm = {
    base_url: 'https://waha.example.com',
    api_key: 'waha-key',
    session_name: 'default',
    phone_number: '+5511999999999',
  };

  const testWahaConnection = async () => {
    const { result } = renderHook(() => useChannelSubmission(wahaForm as never));
    await act(async () => {
      await result.current.testConnection(
        { id: 'whatsapp', name: 'whatsapp', type: 'whatsapp' } as never,
        { id: 'waha', name: 'waha' } as never,
        wahaForm as never,
        {} as never,
      );
    });
  };

  it('shows a success toast when WahaService.verifyConnection resolves', async () => {
    vi.mocked(WahaService.verifyConnection).mockResolvedValue({
      session_name: 'default',
      status: 'SCAN_QR_CODE',
    } as never);

    await testWahaConnection();

    expect(WahaService.verifyConnection).toHaveBeenCalledWith({
      baseUrl: 'https://waha.example.com',
      apiKey: 'waha-key',
      sessionName: 'default',
      phoneNumber: '+5511999999999',
    });
    expect(toast.success).toHaveBeenCalledWith('Conexão verificada com sucesso');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows an error toast when WahaService.verifyConnection rejects', async () => {
    vi.mocked(WahaService.verifyConnection).mockRejectedValue(new Error('WAHA unreachable'));

    await testWahaConnection();

    expect(toast.error).toHaveBeenCalledWith('WAHA unreachable');
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('useChannelSubmission — archived match on WhatsApp creation (EVO-2159)', () => {
  const whatsappForm = { name: 'evo', phone_number: '+5511999999999' };

  beforeEach(() => {
    vi.clearAllMocks();
    createChannelMock.mockResolvedValue({ data: { id: 'inbox-1' } } as never);
    checkArchivedMatchMock.mockResolvedValue(null);
    reactivateMock.mockResolvedValue({} as never);
    replaceArchivedChannelMock.mockResolvedValue({ data: { id: 'archived-1' } } as never);
  });

  // Renders the hook and drives it through submitCreate for a WhatsApp/evolution
  // channel — the shared setup every test in this block starts from.
  const renderAndSubmitWhatsapp = async () => {
    const { result } = renderHook(() => useChannelSubmission(whatsappForm as never));
    await act(async () => {
      await result.current.submitCreate(
        { id: 'whatsapp', name: 'whatsapp', type: 'whatsapp' } as never,
        { id: 'evolution', name: 'evolution' } as never,
        whatsappForm as never,
        { hasEvolutionConfig: true } as never,
      );
    });
    return result;
  };

  // Sourcery finding (bug_risk, PR #395): checkArchivedMatch ran before the
  // create try/catch, so a failed lookup was an unhandled rejection with no
  // error toast instead of the standard creation-failure feedback.
  it('shows the creation error toast when the archived-match lookup itself fails', async () => {
    checkArchivedMatchMock.mockRejectedValueOnce(new Error('network down'));
    const result = await renderAndSubmitWhatsapp();

    expect(toast.error).toHaveBeenCalledWith('network down');
    expect(createChannelMock).not.toHaveBeenCalled();
    expect(result.current.archivedMatch).toBeNull();
  });

  it('checks for an archived match before creating, and holds off createChannel when one is found', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    const result = await renderAndSubmitWhatsapp();

    expect(checkArchivedMatchMock).toHaveBeenCalledWith('+5511999999999');
    expect(createChannelMock).not.toHaveBeenCalled();
    expect(result.current.archivedMatch).toEqual({ inboxId: 'archived-1' });
  });

  it('does not check for an archived match on non-WhatsApp channels', async () => {
    const { result } = renderHook(() => useChannelSubmission({ name: 'api-inbox' } as never));

    await act(async () => {
      await result.current.submitCreate(
        { id: 'api', name: 'api', type: 'api' } as never,
        { id: 'api', name: 'api' } as never,
        { name: 'api-inbox', webhook_url: 'https://hook' } as never,
        {} as never,
      );
    });

    expect(checkArchivedMatchMock).not.toHaveBeenCalled();
    expect(createChannelMock).toHaveBeenCalled();
  });

  it('reactivates the archived inbox, refreshes the list, and never creates a new channel', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmReactivate();
    });

    expect(reactivateMock).toHaveBeenCalledWith('archived-1');
    expect(fetchInboxesMock).toHaveBeenCalled();
    expect(createChannelMock).not.toHaveBeenCalled();
    expect(result.current.archivedMatch).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('overview.archived.reactivated:{"name":"evo"}');
  });

  it('sends the user to the reactivated inbox settings so they can re-scan the QR code', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmReactivate();
    });

    expect(navigateMock).toHaveBeenCalledWith('/channels/archived-1/settings');
  });

  it('shows the translated failure toast and does not navigate when reactivation fails', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    reactivateMock.mockRejectedValueOnce(new Error('boom'));
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmReactivate();
    });

    expect(toast.error).toHaveBeenCalledWith('overview.archived.reactivateFailed');
    expect(result.current.archivedMatch).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('replaces the archived channel in place instead of creating a new inbox, keeping history', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmCreateNew();
    });

    expect(reactivateMock).not.toHaveBeenCalled();
    expect(createChannelMock).not.toHaveBeenCalled();
    expect(replaceArchivedChannelMock).toHaveBeenCalledWith(
      'archived-1',
      expect.objectContaining({ provider: 'evolution' }),
    );
    expect(result.current.archivedMatch).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Canal criado com sucesso');
    expect(fetchInboxesMock).toHaveBeenCalled();
  });
});
