/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { doesConversationMatchFilters } from './conversationMatch';
import { DEFAULT_CONVERSATION_FILTER } from '@/types/core/filters';
import type { Conversation, ConversationFilter } from '@/types/chat/api';

const conv = (over: Partial<Conversation> = {}): Conversation =>
  ({
    id: '1',
    status: 'open',
    priority: null,
    labels: [],
    unread_count: 0,
    is_group: false,
    ...over,
  } as Conversation);

const filter = (
  attribute_key: string,
  values: (string | number)[],
  filter_operator = 'equal_to',
): ConversationFilter =>
  ({ attribute_key, filter_operator, values, query_operator: 'and' } as ConversationFilter);

describe('doesConversationMatchFilters', () => {
  it('empty filters → match all', () => {
    expect(doesConversationMatchFilters(conv(), [])).toBe(true);
  });

  it("status 'all' short-circuits to match (any status)", () => {
    expect(
      doesConversationMatchFilters(conv({ status: 'resolved' }), [filter('status', ['all'])]),
    ).toBe(true);
  });

  it('status equal_to keeps matching / evicts non-matching', () => {
    expect(doesConversationMatchFilters(conv({ status: 'open' }), [filter('status', ['open'])])).toBe(true);
    expect(doesConversationMatchFilters(conv({ status: 'resolved' }), [filter('status', ['open'])])).toBe(false);
  });

  it('status not_equal_to (the "Ativas"-style filter)', () => {
    expect(
      doesConversationMatchFilters(conv({ status: 'open' }), [filter('status', ['resolved'], 'not_equal_to')]),
    ).toBe(true);
    expect(
      doesConversationMatchFilters(conv({ status: 'resolved' }), [filter('status', ['resolved'], 'not_equal_to')]),
    ).toBe(false);
  });

  // Regression: advanced priority filter must evict when a row's priority changes.
  describe('priority (advanced filter eviction)', () => {
    it('keeps a conversation that still matches', () => {
      expect(doesConversationMatchFilters(conv({ priority: 'high' }), [filter('priority', ['high'])])).toBe(true);
    });
    it('evicts a conversation whose priority no longer matches (incl. cleared)', () => {
      expect(doesConversationMatchFilters(conv({ priority: 'low' }), [filter('priority', ['high'])])).toBe(false);
      expect(doesConversationMatchFilters(conv({ priority: null }), [filter('priority', ['high'])])).toBe(false);
    });
  });

  // Regression: advanced labels filter must evict when labels change. Value = title.
  describe('labels (advanced filter eviction)', () => {
    const withLabels = (titles: string[]) => conv({ labels: titles.map(t => ({ title: t })) as any });
    it('keeps a conversation that has one of the filtered labels (contains)', () => {
      expect(doesConversationMatchFilters(withLabels(['VIP', 'Lead']), [filter('labels', ['VIP'])])).toBe(true);
    });
    it('evicts a conversation that lost the label / has none', () => {
      expect(doesConversationMatchFilters(withLabels(['Other']), [filter('labels', ['VIP'])])).toBe(false);
      expect(doesConversationMatchFilters(withLabels([]), [filter('labels', ['VIP'])])).toBe(false);
    });
    it('not_equal_to keeps conversations WITHOUT the label', () => {
      expect(
        doesConversationMatchFilters(withLabels(['Other']), [filter('labels', ['VIP'], 'not_equal_to')]),
      ).toBe(true);
      expect(
        doesConversationMatchFilters(withLabels(['VIP']), [filter('labels', ['VIP'], 'not_equal_to')]),
      ).toBe(false);
    });
  });

  describe('chip-nav axes', () => {
    it('unread', () => {
      expect(doesConversationMatchFilters(conv({ unread_count: 2 }), [filter('unread', ['true'])])).toBe(true);
      expect(doesConversationMatchFilters(conv({ unread_count: 0 }), [filter('unread', ['true'])])).toBe(false);
    });
    it('is_group', () => {
      expect(doesConversationMatchFilters(conv({ is_group: true }), [filter('is_group', ['true'])])).toBe(true);
      expect(doesConversationMatchFilters(conv({ is_group: false }), [filter('is_group', ['true'])])).toBe(false);
    });
  });
});

// Guards the HIGH regression: the advanced-modal seed must NOT be a chip-nav
// status row (which silently narrowed the default All view to status=open).
describe('DEFAULT_CONVERSATION_FILTER (advanced modal seed)', () => {
  it('is not a chip-nav (status/unread/is_group) attribute', () => {
    expect(['status', 'unread', 'is_group']).not.toContain(DEFAULT_CONVERSATION_FILTER.attributeKey);
  });
  it('seeds an empty value so an untouched Apply is dropped (no-op)', () => {
    expect(DEFAULT_CONVERSATION_FILTER.values).toBe('');
  });
});
