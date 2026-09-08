import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Callbacks = {
  connected?: () => void;
  disconnected?: () => void;
  rejected?: () => void;
  received?: (data: unknown) => void;
};

const createMock = vi.fn();
const subscriptionMock = { unsubscribe: vi.fn(), perform: vi.fn(), send: vi.fn() };

vi.mock('@rails/actioncable', () => ({
  createConsumer: vi.fn(() => ({
    subscriptions: {
      create: (params: Record<string, unknown>, callbacks: Callbacks) => {
        createMock(params, callbacks);
        return subscriptionMock;
      },
    },
    disconnect: vi.fn(),
  })),
}));

import { BaseActionCableConnector, type ConnectionParams } from './BaseActionCableConnector';

class ProbeConnector extends BaseActionCableConnector {
  public rejectedCalls = 0;

  protected onRejected(): void {
    this.rejectedCalls += 1;
  }
}

const params: ConnectionParams = {
  channel: 'RoomChannel',
  pubsub_token: 'pubsub-1',
  user_id: 'user-1',
  access_token: 'jwt-1',
};

describe('BaseActionCableConnector (CRM-537)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createMock.mockClear();
    BaseActionCableConnector.isDisconnected = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the auth-service access_token with the subscription params', () => {
    new ProbeConnector(params, 'http://crm.test');

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toEqual({
      channel: 'RoomChannel',
      pubsub_token: 'pubsub-1',
      user_id: 'user-1',
      access_token: 'jwt-1',
    });
  });

  it('forwards token_type only when given', () => {
    new ProbeConnector({ ...params, token_type: 'api_access_token' }, 'http://crm.test');

    expect(createMock.mock.calls[0][0]).toMatchObject({ token_type: 'api_access_token' });
  });

  it('does not retry a rejected subscription with the same params', () => {
    const connector = new ProbeConnector(params, 'http://crm.test');
    const callbacks = createMock.mock.calls[0][1] as Callbacks;

    callbacks.rejected?.();
    vi.advanceTimersByTime(60_000);

    expect(connector.rejectedCalls).toBe(1);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
