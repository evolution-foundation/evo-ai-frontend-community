import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChannelSubmission } from './useChannelSubmission';
import InboxesService from '@/services/channels/inboxesService';
import EvolutionService from '@/services/channels/evolutionService';
import EvolutionGoService from '@/services/channels/evolutionGoService';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({ addInbox: vi.fn() }),
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
  default: { createChannel: vi.fn() },
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
});
