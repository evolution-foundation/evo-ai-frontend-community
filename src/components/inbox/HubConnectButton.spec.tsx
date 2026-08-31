import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HubConnectButton from './HubConnectButton';
import { api } from '@/services/core';

vi.mock('@/services/core', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

// useGlobalConfig returns the config flat (GlobalConfigContextValue extends
// GlobalConfig), so the mock has to be flat too — a nested { config } shape
// leaves hubAllowExistingChannels undefined and silently enables the mode.
vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => ({ hubAllowExistingChannels: false, setupRequired: false, setupLoading: false }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));

const INBOX_ID = 'inbox-42';

async function criarInbox() {
  vi.mocked(api.post).mockResolvedValue({
    data: { data: { id: INBOX_ID, evolution_hub: { public_link: 'http://localhost:8050/connect/tok' } } },
  } as never);

  render(<HubConnectButton channelType="whatsapp_cloud" name="Canal Teste" />);
  await userEvent.click(screen.getByRole('button', { name: /conectar|criar/i }));
  await screen.findByTestId('hub-waiting');
}

async function emitir(status: string, inboxId: string = INBOX_ID) {
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('evolution:hubChannelConnection', {
        detail: { inbox_id: inboxId, connection_status: status },
      }),
    );
  });
}

describe('HubConnectButton — estado real da conexão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('sai de "Aguardando" para conectado ao receber o evento do Hub', async () => {
    await criarInbox();

    await emitir('connected');

    await waitFor(() => expect(screen.getByTestId('hub-connected')).toBeInTheDocument());
    expect(screen.queryByTestId('hub-waiting')).not.toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith('Canal conectado.');
  });

  it('ignora evento de outra inbox', async () => {
    await criarInbox();

    await emitir('connected', 'inbox-outra');

    await waitFor(() => expect(screen.getByTestId('hub-waiting')).toBeInTheDocument());
    expect(screen.queryByTestId('hub-connected')).not.toBeInTheDocument();
  });

  it('volta para aguardando quando o Hub desconecta o canal', async () => {
    await criarInbox();
    await emitir('connected');
    await screen.findByTestId('hub-connected');

    await emitir('disconnected');

    await waitFor(() => expect(screen.getByTestId('hub-waiting')).toBeInTheDocument());
  });

  // O broadcast se perde se o socket estava fora quando o Hub avisou; a volta
  // para a aba tem que resolver o estado sem refresh manual.
  it('reconcilia pelo GET da inbox quando o evento do ActionCable se perdeu', async () => {
    await criarInbox();
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: INBOX_ID, connection_state: 'connected', health_source: 'provider_event' } },
    } as never);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByTestId('hub-connected')).toBeInTheDocument());
    expect(api.get).toHaveBeenCalledWith(`/inboxes/${INBOX_ID}`);
  });

  // `stored_flag` é o resolver ASSUMINDO que um canal token-based configurado
  // está vivo — não é confirmação do Hub, e não pode declarar conectado.
  it('nao declara conectado quando o estado veio de stored_flag', async () => {
    await criarInbox();
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: INBOX_ID, connection_state: 'connected', health_source: 'stored_flag' } },
    } as never);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByTestId('hub-waiting')).toBeInTheDocument();
  });
});
