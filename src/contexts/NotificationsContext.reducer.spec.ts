import { describe, it, expect } from 'vitest';
import { notificationsReducer, initialState } from './NotificationsContext';
import type { Notification } from '@/services/notifications/NotificationsService';

const makeNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    id: 'n1',
    notification_type: 'assigned_conversation_new_message',
    primary_actor_id: 'c1',
    primary_actor: { id: 'c1' },
    push_message_title: '',
    last_activity_at: new Date().toISOString(),
    read_at: null,
    ...overrides,
  }) as Notification;

describe('notificationsReducer — remove-on-read behavior (EVO-1419)', () => {
  it('MARK_AS_READ removes the notification from the list and decrements both counts when it was unread', () => {
    const unread = makeNotification({ id: 'n1', read_at: null });
    const other = makeNotification({ id: 'n2', read_at: null });
    const state = {
      ...initialState,
      notifications: [unread, other],
      meta: { ...initialState.meta, count: 2, unreadCount: 2 },
    };

    const next = notificationsReducer(state, {
      type: 'MARK_AS_READ',
      payload: { id: 'n1', read_at: new Date().toISOString() },
    });

    expect(next.notifications.map(n => n.id)).toEqual(['n2']);
    expect(next.meta.count).toBe(1);
    expect(next.meta.unreadCount).toBe(1);
  });

  it('MARK_AS_READ on an already-read notification does not decrement unreadCount below the real value', () => {
    const alreadyRead = makeNotification({ id: 'n1', read_at: new Date().toISOString() });
    const state = {
      ...initialState,
      notifications: [alreadyRead],
      meta: { ...initialState.meta, count: 1, unreadCount: 0 },
    };

    const next = notificationsReducer(state, {
      type: 'MARK_AS_READ',
      payload: { id: 'n1', read_at: new Date().toISOString() },
    });

    expect(next.notifications).toHaveLength(0);
    expect(next.meta.count).toBe(0);
    expect(next.meta.unreadCount).toBe(0);
  });

  it('MARK_ALL_AS_READ empties the list and zeroes count and unreadCount', () => {
    const state = {
      ...initialState,
      notifications: [makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })],
      meta: { ...initialState.meta, count: 2, unreadCount: 2 },
    };

    const next = notificationsReducer(state, { type: 'MARK_ALL_AS_READ' });

    expect(next.notifications).toHaveLength(0);
    expect(next.meta.count).toBe(0);
    expect(next.meta.unreadCount).toBe(0);
  });
});
