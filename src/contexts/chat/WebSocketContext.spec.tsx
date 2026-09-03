import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Capture the low-level handlers WebSocketProvider hands to useWebSocket, so the
// test can invoke the real onContactUpdated the provider builds. Before the fix
// the provider never supplied one, so the captured object had no such key.
let capturedHandlers: Record<string, ((data: unknown) => void) | undefined> = {};

vi.mock('@/hooks/chat/useWebSocket', () => ({
  useWebSocket: (_userId: string, _token: string, opts: { handlers?: typeof capturedHandlers }) => {
    capturedHandlers = opts?.handlers ?? {};
    return { isConnected: false, sendTypingOn: vi.fn(), sendTypingOff: vi.fn() };
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', pubsub_token: 'token-1' } }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import { WebSocketProvider, useWebSocketContext } from './WebSocketContext';
import type { Contact } from '@/types/chat/api';

function RegisterExternalHandler({ onContactUpdated }: { onContactUpdated: (c: Contact) => void }) {
  const ws = useWebSocketContext();
  React.useEffect(() => {
    ws.registerHandlers({ onContactUpdated });
  }, [ws, onContactUpdated]);
  return null;
}

describe('WebSocketContext contact.updated wiring', () => {
  beforeEach(() => {
    capturedHandlers = {};
  });

  it('provides an onContactUpdated handler to the socket layer (regression: it used to be missing → no-op)', () => {
    render(
      <WebSocketProvider>
        <div />
      </WebSocketProvider>,
    );

    // The pre-fix provider never included onContactUpdated, so the connector's
    // contact.updated registration resolved to undefined and every rename was
    // dropped. This assertion is what fails without the fix.
    expect(typeof capturedHandlers.onContactUpdated).toBe('function');
  });

  it('maps ContactUpdatedEvent to a domain Contact and forwards it to the registered handler', () => {
    const external = vi.fn();

    render(
      <WebSocketProvider>
        <RegisterExternalHandler onContactUpdated={external} />
      </WebSocketProvider>,
    );

    capturedHandlers.onContactUpdated?.({
      id: 'contact-1',
      name: 'João Silva',
      email: 'joao@example.com',
      phone_number: '5541999999999',
      // The frame names the avatar `thumbnail` (Contact#push_event_data); reading
      // `avatar_url` here silently dropped every avatar change.
      thumbnail: 'https://cdn.example.com/joao.png',
      account_id: 'account-1',
      custom_attributes: {},
      additional_attributes: {},
    });

    expect(external).toHaveBeenCalledTimes(1);
    expect(external).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'contact-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone_number: '5541999999999',
        avatar_url: 'https://cdn.example.com/joao.png',
      }),
    );
  });

  it('ignores a contact.updated event with no id', () => {
    const external = vi.fn();

    render(
      <WebSocketProvider>
        <RegisterExternalHandler onContactUpdated={external} />
      </WebSocketProvider>,
    );

    capturedHandlers.onContactUpdated?.({ name: 'no id' } as unknown);

    expect(external).not.toHaveBeenCalled();
  });
});
