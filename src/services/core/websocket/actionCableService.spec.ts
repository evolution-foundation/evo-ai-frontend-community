import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captures the subscription callbacks so the test can feed the exact frame the
// Rails side broadcasts: `{ event, data }` (ActionCableBroadcastJob).
const handlers: Record<string, (frame: unknown) => void> = {};

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    subscriptions: {
      create: (_params: unknown, callbacks: Record<string, (frame: unknown) => void>) => {
        Object.assign(handlers, callbacks);
        // `consumer` is what the service's isConnected() inspects.
        return { unsubscribe: () => {}, consumer: {} };
      },
    },
    disconnect: () => {},
  }),
}));

describe('actionCableService — contrato do frame do ActionCable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reemite hub_channel.connection_changed com o payload que veio em `data`', async () => {
    const { actionCableService } = await import('./actionCableService');
    actionCableService.init('tok', 'user-1');

    let detail: unknown = null;
    window.addEventListener('evolution:hubChannelConnection', (event) => {
      detail = (event as CustomEvent).detail;
    });

    handlers.received({
      event: 'hub_channel.connection_changed',
      data: { inbox_id: 42, channel_type: 'Channel::Whatsapp', connection_status: 'connected' },
    });

    expect(detail).toEqual({
      inbox_id: 42,
      channel_type: 'Channel::Whatsapp',
      connection_status: 'connected',
    });
  });

  it('reemite os demais eventos pelo mesmo caminho', async () => {
    const { actionCableService } = await import('./actionCableService');
    actionCableService.init('tok', 'user-1');

    let detail: unknown = null;
    window.addEventListener('evolution:message', (event) => {
      detail = (event as CustomEvent).detail;
    });

    handlers.received({ event: 'message.created', data: { id: 7 } });

    expect(detail).toEqual({ id: 7 });
  });

  // CRM-537: this subscriber is LIVE (AuthContext -> ReconnectService -> init) and
  // HubConnectButton depends on the event only it emits.
  it('announces the rejection and stops reporting itself connected', async () => {
    const { actionCableService } = await import('./actionCableService');
    const { CABLE_REJECTED_EVENT } = await import('@/services/chat/websocket/BaseActionCableConnector');
    actionCableService.init('tok', 'user-1');
    expect(actionCableService.isConnected()).toBe(true);

    const listener = vi.fn();
    window.addEventListener(CABLE_REJECTED_EVENT, listener);

    handlers.rejected(undefined);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(actionCableService.isConnected()).toBe(false);
    window.removeEventListener(CABLE_REJECTED_EVENT, listener);
  });
});
