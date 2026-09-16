import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useChannelSubmission } from './useChannelSubmission';
import InboxesService from '@/services/channels/inboxesService';
import EvolutionService from '@/services/channels/evolutionService';
import EvolutionGoService from '@/services/channels/evolutionGoService';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
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
  default: { createChannel: vi.fn(), checkArchivedMatch: vi.fn(), reactivate: vi.fn() },
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

const createChannelMock = vi.mocked(InboxesService.createChannel);
const checkArchivedMatchMock = vi.mocked(InboxesService.checkArchivedMatch);
const reactivateMock = vi.mocked(InboxesService.reactivate);

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

describe('useChannelSubmission — archived match on WhatsApp creation (EVO-2159)', () => {
  const whatsappForm = { name: 'evo', phone_number: '+5511999999999' };

  beforeEach(() => {
    vi.clearAllMocks();
    createChannelMock.mockResolvedValue({ data: { id: 'inbox-1' } } as never);
    checkArchivedMatchMock.mockResolvedValue(null);
    reactivateMock.mockResolvedValue({} as never);
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

  it('shows the translated failure toast when reactivation fails', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    reactivateMock.mockRejectedValueOnce(new Error('boom'));
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmReactivate();
    });

    expect(toast.error).toHaveBeenCalledWith('overview.archived.reactivateFailed');
    expect(result.current.archivedMatch).toBeNull();
  });

  it('proceeds with the original creation when the user chooses Create new', async () => {
    checkArchivedMatchMock.mockResolvedValue({ inbox_id: 'archived-1' });
    const result = await renderAndSubmitWhatsapp();

    await act(async () => {
      await result.current.confirmCreateNew();
    });

    expect(reactivateMock).not.toHaveBeenCalled();
    expect(createChannelMock).toHaveBeenCalled();
    const payload = createChannelMock.mock.calls.at(-1)?.[0] as any;
    expect(payload.channel.provider).toBe('evolution');
    expect(result.current.archivedMatch).toBeNull();
  });
});
