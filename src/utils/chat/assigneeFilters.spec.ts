import { describe, expect, it } from 'vitest';
import { convertBaseFiltersToConversationFilters, convertConversationFiltersToBaseFilters } from './filterAdapters';
import { convertFiltersToApiFormat, convertFiltersToUrlParams, shouldUseAdvancedFilters } from './filterConverters';
import { doesConversationMatchFilters } from './conversationMatch';
import type { Conversation, ConversationFilter } from '@/types/chat/api';
import type { BaseFilter } from '@/types/core';

const users = (...values: string[]): ConversationFilter => ({
  attribute_key: 'assignee_id', filter_operator: 'equal_to', values, query_operator: 'and',
});
const status: ConversationFilter = {
  attribute_key: 'status', filter_operator: 'equal_to', values: ['open'], query_operator: 'and',
};

describe('current assignee filter contract', () => {
  it('sends a single selected user ID in the GET query', () => {
    expect(shouldUseAdvancedFilters([users('agent-a')])).toBe(false);
    expect(convertFiltersToUrlParams([users('agent-a')])).toEqual({ assignee_id: 'agent-a', status: 'all' });
  });

  it('retains every selected user ID in the GET query', () => {
    expect(shouldUseAdvancedFilters([users('agent-a', 'agent-b')])).toBe(false);
    expect(convertFiltersToUrlParams([users('agent-a', 'agent-b')])).toEqual({
      assignee_id: ['agent-a', 'agent-b'], status: 'all',
    });
  });

  it.each(['agent-a', 'agent-b'])('matches current assignee %s with OR semantics', assignee_id => {
    expect(doesConversationMatchFilters({ assignee_id } as Conversation, [users('agent-a', 'agent-b')])).toBe(true);
  });

  it.each(['agent-c', null])('excludes current assignee %s despite historical participation', assignee_id => {
    const conversation = { assignee_id, messages: [{ sender_id: 'agent-a' }], previous_assignee_id: 'agent-a' };
    expect(doesConversationMatchFilters(conversation as unknown as Conversation, [users('agent-a', 'agent-b')])).toBe(false);
  });

  it.each(['agent-a,agent-b', ['agent-a,agent-b'], ['agent-a', 'agent-b']])(
    'normalizes restored IDs %j for requests and the realtime matcher', values => {
      const restored = convertBaseFiltersToConversationFilters([{
        attributeKey: 'assignee_id', filterOperator: 'equal_to', values,
        queryOperator: 'and', attributeModel: 'standard',
      } as BaseFilter]);
      expect(restored).toEqual([users('agent-a', 'agent-b')]);
      expect(doesConversationMatchFilters({ assignee_id: 'agent-b' } as Conversation, restored)).toBe(true);
    },
  );

  it('round-trips persisted multi-user selection', () => {
    const saved = convertConversationFiltersToBaseFilters([users('agent-a', 'agent-b')]);
    expect(convertBaseFiltersToConversationFilters(saved)).toEqual([users('agent-a', 'agent-b')]);
  });

  it('combines selected users with status via the existing advanced endpoint', () => {
    const filters = [users('agent-a', 'agent-b'), status];
    expect(shouldUseAdvancedFilters(filters)).toBe(true);
    expect(convertFiltersToApiFormat(filters).filters).toEqual([
      { ...users('agent-a', 'agent-b'), query_operator: null }, { ...status, query_operator: 'AND' },
    ]);
    expect(doesConversationMatchFilters({ assignee_id: 'agent-b', status: 'resolved' } as Conversation, filters)).toBe(false);
  });

  it('removing users preserves the remaining status criterion', () => {
    expect(convertFiltersToUrlParams([status])).toEqual({ status: 'open' });
  });
});
