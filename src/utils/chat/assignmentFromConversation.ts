import type { Conversation } from '@/types/chat/api';

export type AssignmentPatch = Partial<Pick<Conversation, 'assignee_id' | 'team_id' | 'assignee' | 'team'>>;

// The conversation endpoint omits `team` (and may omit `assignee`) when there is
// none, so a missing key means "cleared", not "unchanged".
export function assignmentFromConversation(conversation: Conversation): AssignmentPatch {
  return {
    assignee_id: conversation.assignee_id ?? null,
    team_id: conversation.team_id ?? null,
    assignee: conversation.assignee ?? null,
    team: conversation.team ?? null,
  };
}
