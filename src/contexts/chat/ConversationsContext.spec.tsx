import { beforeEach, describe, expect, it } from 'vitest';
import { conversationsReducer } from './ConversationsContextReducer';
import { initialState } from '@/types/chat/conversations';
import type { Conversation } from '@/types/chat/api';
import { matchesConversationId } from '@/utils/chat/conversationMatcher';

// Test fixtures admit numeric ids because the backend / WebSocket can deliver
// either form despite the strict `Conversation.id: string` typing. Cast back
// to `Conversation` at the boundary so the reducer sees its expected shape.
type ConversationFixture = Omit<Partial<Conversation>, 'id' | 'uuid'> & {
  id: string | number;
  uuid?: string | null;
};

const makeConversation = (
  overrides: Partial<ConversationFixture> = {},
): Conversation => {
  const base: ConversationFixture = {
    id: 'conversation-1',
    uuid: 'conversation-1',
    unread_count: 5,
    status: 'open',
    ...overrides,
  };
  return base as unknown as Conversation;
};

describe('ConversationsContext reducer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes selected conversation id and clears unread count on select', () => {
    const state = {
      ...initialState,
      conversations: [makeConversation()],
      unreadCounts: { 'conversation-1': 5 },
    };

    const nextState = conversationsReducer(state, {
      type: 'SELECT_CONVERSATION',
      payload: 'conversation-1',
    });

    expect(nextState.selectedConversationId).toBe('conversation-1');
    expect(nextState.unreadCounts['conversation-1']).toBe(0);
    expect(nextState.conversations[0].unread_count).toBe(0);
  });

  it('keeps selected conversation unread count at zero on UPDATE_CONVERSATION', () => {
    const state = {
      ...initialState,
      selectedConversationId: 'conversation-1',
      selectedConversationData: makeConversation({ unread_count: 0 }),
      conversations: [makeConversation({ unread_count: 0 })],
      unreadCounts: { 'conversation-1': 0 },
    };

    const nextState = conversationsReducer(state, {
      type: 'UPDATE_CONVERSATION',
      payload: makeConversation({ unread_count: 9 }),
    });

    expect(nextState.conversations[0].unread_count).toBe(0);
    expect(nextState.selectedConversationData?.unread_count).toBe(0);
  });

  it('honors localStorage read state when setting conversations', () => {
    localStorage.setItem(
      'crm-chat-state',
      JSON.stringify({ readConversations: { 'conversation-1': true } }),
    );

    const nextState = conversationsReducer(initialState, {
      type: 'SET_CONVERSATIONS',
      payload: {
        conversations: [makeConversation({ unread_count: 4 })],
        pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
      },
    });

    expect(nextState.conversations[0].unread_count).toBe(0);
  });

  describe('UPDATE_CONVERSATION id/uuid matching (EVO-1145)', () => {
    it('merges in place when payload.id matches existing conv.id', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', status: 'open' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({ id: 42, uuid: 'conv-uuid-42', status: 'resolved' }),
      });

      expect(nextState.conversations).toHaveLength(1);
      expect(nextState.conversations[0].id).toBe(42);
      expect(nextState.conversations[0].status).toBe('resolved');
    });

    it('merges in place when payload.id matches existing conv.uuid (regression for C3)', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', status: 'open' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({ id: 'conv-uuid-42', uuid: 'conv-uuid-42', status: 'pending' }),
      });

      expect(nextState.conversations).toHaveLength(1);
      expect(nextState.conversations[0].uuid).toBe('conv-uuid-42');
      expect(nextState.conversations[0].status).toBe('pending');
    });

    it('prepends when conversation is not in the list', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 1, uuid: 'conv-uuid-1' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({ id: 99, uuid: 'conv-uuid-99', status: 'open' }),
      });

      expect(nextState.conversations).toHaveLength(2);
      expect(nextState.conversations[0].id).toBe(99);
      expect(nextState.conversations[1].id).toBe(1);
    });
  });

  describe('ADD_CONVERSATION id/uuid dedupe (EVO-1145)', () => {
    it('merges in place when payload.id matches existing conv.uuid', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 7, uuid: 'conv-uuid-7', status: 'open' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'ADD_CONVERSATION',
        payload: makeConversation({ id: 'conv-uuid-7', uuid: 'conv-uuid-7', status: 'snoozed' }),
      });

      expect(nextState.conversations).toHaveLength(1);
      expect(nextState.conversations[0].uuid).toBe('conv-uuid-7');
      expect(nextState.conversations[0].status).toBe('snoozed');
    });

    it('prepends a brand-new conversation when no match by id or uuid', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 7, uuid: 'conv-uuid-7' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'ADD_CONVERSATION',
        payload: makeConversation({ id: 8, uuid: 'conv-uuid-8' }),
      });

      expect(nextState.conversations).toHaveLength(2);
      expect(nextState.conversations[0].id).toBe(8);
    });
  });

  describe('UPDATE_CONVERSATION selected-data alignment (EVO-1145 H1)', () => {
    it('updates selectedConversationData when selection is by id and payload is keyed by uuid', () => {
      // Selected by numeric id; WebSocket frame arrives keyed by uuid.
      const state = {
        ...initialState,
        selectedConversationId: '42',
        selectedConversationData: makeConversation({
          id: 42,
          uuid: 'conv-uuid-42',
          status: 'open',
        }),
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', status: 'open' }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({
          id: 'conv-uuid-42',
          uuid: 'conv-uuid-42',
          status: 'resolved',
        }),
      });

      expect(nextState.conversations).toHaveLength(1);
      expect(nextState.conversations[0].status).toBe('resolved');
      expect(nextState.selectedConversationData?.status).toBe('resolved');
    });

    it('updates selectedConversationData on prepend race when the selected conv is not in the list yet', () => {
      // Race: SELECT_CONVERSATION landed before SET_CONVERSATIONS completed,
      // so the selected conversation is not in `conversations` yet. The
      // UPDATE_CONVERSATION frame must still flow into `selectedConversationData`
      // so the right panel doesn't fall behind the prepended row.
      const state = {
        ...initialState,
        selectedConversationId: '99',
        selectedConversationData: makeConversation({
          id: 99,
          uuid: 'conv-uuid-99',
          status: 'open',
        }),
        conversations: [makeConversation({ id: 1, uuid: 'conv-uuid-1' })],
        unreadCounts: { '99': 0 },
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({
          id: 99,
          uuid: 'conv-uuid-99',
          status: 'resolved',
          unread_count: 5,
        }),
      });

      // Conv 99 prepended to the list, unread preserved at 0 (was marked read).
      expect(nextState.conversations).toHaveLength(2);
      expect(nextState.conversations[0].id).toBe(99);
      expect(nextState.conversations[0].unread_count).toBe(0);
      // Selected panel reflects the new status.
      expect(nextState.selectedConversationData?.status).toBe('resolved');
      expect(nextState.selectedConversationData?.unread_count).toBe(0);
    });

    it('preserves unread=0 when selection canonicalized to uuid while SET seeded unreadCounts by id', () => {
      // `selectConversation` canonicalizes the selection key to `uuid` when
      // available, while `SET_CONVERSATIONS` seeds `unreadCounts` by
      // `String(conv.id)`. Both entries coexist for the same conv. An incoming
      // UPDATE_CONVERSATION must honor the uuid-keyed `0` (the user just
      // opened the conversation), not the stale id-keyed seed.
      const state = {
        ...initialState,
        selectedConversationId: 'conv-uuid-42',
        selectedConversationData: makeConversation({
          id: 42,
          uuid: 'conv-uuid-42',
          unread_count: 0,
        }),
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', unread_count: 5 }),
        ],
        unreadCounts: { '42': 5, 'conv-uuid-42': 0 },
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({
          id: 'conv-uuid-42',
          uuid: 'conv-uuid-42',
          unread_count: 7,
        }),
      });

      expect(nextState.conversations[0].unread_count).toBe(0);
      expect(nextState.selectedConversationData?.unread_count).toBe(0);
    });

    it('preserves unread_count=0 for the selected conversation even when payload arrives by uuid', () => {
      // Selection marked the conv as read (localUnread = 0). An incoming
      // frame keyed by uuid must not reintroduce a non-zero unread_count.
      const state = {
        ...initialState,
        selectedConversationId: '42',
        selectedConversationData: makeConversation({
          id: 42,
          uuid: 'conv-uuid-42',
          unread_count: 0,
        }),
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', unread_count: 0 }),
        ],
        unreadCounts: { '42': 0 },
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_CONVERSATION',
        payload: makeConversation({
          id: 'conv-uuid-42',
          uuid: 'conv-uuid-42',
          unread_count: 9,
        }),
      });

      expect(nextState.conversations[0].unread_count).toBe(0);
      expect(nextState.selectedConversationData?.unread_count).toBe(0);
    });
  });

  describe('REMOVE_CONVERSATION id/uuid (EVO-1145 M1)', () => {
    it('removes the conversation when dispatched by uuid', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42' }),
          makeConversation({ id: 99, uuid: 'conv-uuid-99' }),
        ],
        unreadCounts: { '42': 3, '99': 1 },
      };

      const nextState = conversationsReducer(state, {
        type: 'REMOVE_CONVERSATION',
        payload: 'conv-uuid-42',
      });

      expect(nextState.conversations).toHaveLength(1);
      expect(nextState.conversations[0].id).toBe(99);
      expect(nextState.unreadCounts).not.toHaveProperty('42');
      expect(nextState.unreadCounts['99']).toBe(1);
    });
  });

  describe('UPDATE_UNREAD_COUNT id/uuid (EVO-1145 M1)', () => {
    it('updates the conversation unread_count when dispatched by uuid', () => {
      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', unread_count: 0 }),
        ],
      };

      const nextState = conversationsReducer(state, {
        type: 'UPDATE_UNREAD_COUNT',
        payload: { conversationId: 'conv-uuid-42', count: 7 },
      });

      expect(nextState.conversations[0].unread_count).toBe(7);
    });

    it('clears the localStorage read marker when count rises above zero (mark-as-unread, F5 stability)', () => {
      // Repro: user reads conv → reducer stamps localStorage. User marks the
      // same conv unread → without clearing the marker, `SET_CONVERSATIONS`
      // after F5 forces unread back to 0 because `wasMarkedAsRead` stays true.
      localStorage.setItem(
        'crm-chat-state',
        JSON.stringify({ readConversations: { '42': true } }),
      );

      const state = {
        ...initialState,
        conversations: [
          makeConversation({ id: 42, uuid: 'conv-uuid-42', unread_count: 0 }),
        ],
      };

      conversationsReducer(state, {
        type: 'UPDATE_UNREAD_COUNT',
        payload: { conversationId: '42', count: 1 },
      });

      const saved = JSON.parse(localStorage.getItem('crm-chat-state') || '{}');
      expect(saved.readConversations?.['42']).toBeUndefined();
    });
  });

  describe('matchesConversationId guards', () => {
    it('returns false for an empty idStr even when conv has a falsy uuid', () => {
      // Regression: previously `String(conv.uuid || '') === ''` matched every
      // conv whose uuid was null when callers passed an empty string by mistake.
      expect(matchesConversationId({ id: 1, uuid: null }, '')).toBe(false);
      expect(matchesConversationId({ id: 1, uuid: '' }, '')).toBe(false);
      expect(matchesConversationId({ id: 1 }, '')).toBe(false);
    });

    it('returns false for null/undefined conversations', () => {
      expect(matchesConversationId(null, 'anything')).toBe(false);
      expect(matchesConversationId(undefined, 'anything')).toBe(false);
    });

    it('with an ambiguous match across distinct conversations, .some() reports a hit but consumers must beware', () => {
      // Documents the current contract: if one conversation has `id=42` and a
      // different one has `uuid="42"`, both pass `matchesConversationId(_, '42')`.
      // Reducers using `.some()`+`.map()` then update BOTH rows with the same
      // payload. Callers must keep their dispatched ids unambiguous.
      const a = { id: 42, uuid: 'conv-uuid-a' };
      const b = { id: 99, uuid: '42' };
      expect(matchesConversationId(a, '42')).toBe(true);
      expect(matchesConversationId(b, '42')).toBe(true);
    });
  });
});
