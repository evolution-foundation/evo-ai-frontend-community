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

function RegisterConversationUpdated({ onConversationUpdated }: { onConversationUpdated: (c: unknown) => void }) {
  const ws = useWebSocketContext();
  React.useEffect(() => {
    ws.registerHandlers({ onConversationUpdated });
  }, [ws, onConversationUpdated]);
  return null;
}

// conversation.updated / team.changed / assignee.changed are rebuilt from
// push_event_data, which has the agent and the team only under meta.
const pushEventData = (meta: Record<string, unknown>) => ({
  id: 'conv-1',
  status: 'open',
  created_at: 1,
  updated_at: 2,
  last_activity_at: 2,
  inbox_id: 'inbox-1',
  unread_count: 0,
  labels: [],
  meta: { sender: { id: 'contact-1', name: 'Ana' }, hmac_verified: false, ...meta },
});

describe('WebSocketContext conversation.updated assignment ids', () => {
  beforeEach(() => {
    capturedHandlers = {};
  });

  const deliver = (data: unknown) => {
    const external = vi.fn();
    render(
      <WebSocketProvider>
        <RegisterConversationUpdated onConversationUpdated={external} />
      </WebSocketProvider>,
    );
    capturedHandlers.onConversationUpdated?.(data);
    expect(external).toHaveBeenCalledTimes(1);
    return external.mock.calls[0][0] as Record<string, unknown>;
  };

  it('reads assignee_id and team_id from meta', () => {
    const conv = deliver(pushEventData({ assignee: { id: 'user-1', name: 'Fabio' }, team: { id: 'team-1', name: 'Suporte' } }));
    expect(conv.assignee_id).toBe('user-1');
    expect(conv.team_id).toBe('team-1');
  });

  it('turns a null meta assignee or team into a null id', () => {
    const conv = deliver(pushEventData({ assignee: null, team: null }));
    expect(conv.assignee_id).toBeNull();
    expect(conv.team_id).toBeNull();
  });

  it('leaves the ids out when the payload has neither, so the merge keeps the current ones', () => {
    const conv = deliver(pushEventData({}));
    expect('assignee_id' in conv).toBe(false);
    expect('team_id' in conv).toBe(false);
  });
});
