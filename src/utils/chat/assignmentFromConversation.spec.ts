import { describe, expect, it } from 'vitest';
import type { Conversation } from '@/types/chat/api';
import { assignmentFromConversation } from './assignmentFromConversation';

const conv = (fields: Record<string, unknown>) => ({ id: 'c1', ...fields }) as unknown as Conversation;

describe('assignmentFromConversation', () => {
  it('takes both ids and the embedded assignee and team', () => {
    const assignee = { id: 'u1', name: 'Fabio' };
    const team = { id: 't1', name: 'Suporte' };
    expect(assignmentFromConversation(conv({ assignee_id: 'u1', team_id: 't1', assignee, team }))).toStrictEqual({
      assignee_id: 'u1',
      team_id: 't1',
      assignee,
      team,
    });
  });

  it('clears what the endpoint omits, such as an agent dropped by a team change', () => {
    expect(assignmentFromConversation(conv({ team_id: 't1', team: { id: 't1', name: 'Suporte' } }))).toStrictEqual({
      assignee_id: null,
      team_id: 't1',
      assignee: null,
      team: { id: 't1', name: 'Suporte' },
    });
  });
});
