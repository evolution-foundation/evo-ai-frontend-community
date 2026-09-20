import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captures the subscription callbacks so the test can feed the exact frame the
// Rails side broadcasts: `{ event, data }` (ActionCableBroadcastJob).
const handlers: Record<string, (frame: unknown) => void> = {};

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    subscriptions: {
      create: (_params: unknown, callbacks: Record<string, (frame: unknown) => void>) => {
        Object.assign(handlers, callbacks);
        return { unsubscribe: () => {} };
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
});
