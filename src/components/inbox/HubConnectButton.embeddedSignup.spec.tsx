import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HubConnectButton from './HubConnectButton';
import { api } from '@/services/core';
import { evolutionHubService } from '@/services/integrations';

vi.mock('@/services/core', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('@/services/integrations', () => ({
  evolutionHubService: {
    getConnectInfo: vi.fn(),
    connectWhatsapp: vi.fn(),
    getAvailableChannels: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => ({ hubAllowExistingChannels: false, setupRequired: false, setupLoading: false }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));

const INBOX_ID = 7;
const PUBLIC_LINK = 'http://localhost:8050/connect/tok';

let fbLogin: ReturnType<typeof vi.fn>;
let openSpy: ReturnType<typeof vi.fn>;

function comAppEConfig() {
  vi.mocked(evolutionHubService.getConnectInfo).mockResolvedValue({
    meta_app_id: 'app-123',
    meta_config_id: 'cfg-456',
    can_connect: true,
  });
}

async function criarInbox() {
  vi.mocked(api.post).mockResolvedValue({
    data: { data: { id: INBOX_ID, evolution_hub: { public_link: PUBLIC_LINK } } },
  } as never);

  render(<HubConnectButton channelType="whatsapp_cloud" name="Canal Teste" />);
  await userEvent.click(screen.getByRole('button', { name: /conectar/i }));
  await screen.findByTestId('hub-waiting');
}

async function concluirNaMeta(payload: Record<string, unknown>) {
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://www.facebook.com',
        data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: payload }),
      }),
    );
  });
}

describe('HubConnectButton — Embedded Signup na própria página', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fbLogin = vi.fn();
    window.FB = { init: vi.fn(), login: fbLogin };
    openSpy = vi.fn();
    window.open = openSpy as unknown as typeof window.open;
  });

  it('roda o FB.login na página com o config_id do canal e não abre outra aba', async () => {
    comAppEConfig();
    await criarInbox();

    await waitFor(() => expect(fbLogin).toHaveBeenCalled());
    expect(fbLogin.mock.calls[0][1]).toMatchObject({ config_id: 'cfg-456', response_type: 'code' });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('cai na aba do Hub quando o Hub não devolve app e config do canal', async () => {
    vi.mocked(evolutionHubService.getConnectInfo).mockResolvedValue({ can_connect: true });
    await criarInbox();

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith(PUBLIC_LINK, '_blank', 'noopener,noreferrer'));
    expect(fbLogin).not.toHaveBeenCalled();
  });

  it('cai na aba do Hub quando o connect_info falha', async () => {
    vi.mocked(evolutionHubService.getConnectInfo).mockRejectedValue(new Error('502'));
    await criarInbox();

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
  });

  it('envia ao Hub os ids da Meta junto do code', async () => {
    comAppEConfig();
    vi.mocked(evolutionHubService.connectWhatsapp).mockResolvedValue(undefined);
    await criarInbox();
    await waitFor(() => expect(fbLogin).toHaveBeenCalled());

    await act(async () => {
      fbLogin.mock.calls[0][0]({ authResponse: { code: 'code-abc' } });
    });
    await concluirNaMeta({ phone_number_id: '111', waba_id: '222', business_id: '333' });

    await waitFor(() =>
      expect(evolutionHubService.connectWhatsapp).toHaveBeenCalledWith(INBOX_ID, {
        phone_number_id: '111',
        waba_id: '222',
        business_id: '333',
        auth_code: 'code-abc',
      }),
    );
  });

  it('trata o callback sem authResponse em vez de ficar conectando para sempre', async () => {
    comAppEConfig();
    await criarInbox();
    await waitFor(() => expect(fbLogin).toHaveBeenCalled());

    await act(async () => {
      fbLogin.mock.calls[0][0]({ status: 'unknown' });
    });

    expect(toastError).toHaveBeenCalled();
    expect(evolutionHubService.connectWhatsapp).not.toHaveBeenCalled();
  });
});
