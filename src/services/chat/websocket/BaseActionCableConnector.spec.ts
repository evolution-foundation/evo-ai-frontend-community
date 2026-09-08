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

import {
  BaseActionCableConnector,
  CABLE_REJECTED_EVENT,
  type ConnectionParams,
} from './BaseActionCableConnector';

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

const lastCallbacks = () => createMock.mock.calls[createMock.mock.calls.length - 1][1] as Callbacks;

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

  it('retries a rejected subscription with a freshly resolved token', () => {
    let current = 'jwt-expired';
    const connector = new ProbeConnector({ ...params, resolveAccessToken: () => current }, 'http://crm.test');
    expect(createMock.mock.calls[0][0]).toMatchObject({ access_token: 'jwt-expired' });

    lastCallbacks().rejected?.();
    current = 'jwt-fresh';
    vi.advanceTimersByTime(5_000);

    expect(connector.rejectedCalls).toBe(1);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[1][0]).toMatchObject({ access_token: 'jwt-fresh' });
  });

  it('announces the rejection so the host can refresh the session', () => {
    const listener = vi.fn();
    window.addEventListener(CABLE_REJECTED_EVENT, listener);
    new ProbeConnector(params, 'http://crm.test');

    lastCallbacks().rejected?.();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CABLE_REJECTED_EVENT, listener);
  });

  it('stops retrying once the subscription is confirmed again', () => {
    new ProbeConnector(params, 'http://crm.test');

    lastCallbacks().rejected?.();
    vi.advanceTimersByTime(5_000);
    lastCallbacks().connected?.();
    vi.advanceTimersByTime(60_000);

    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
