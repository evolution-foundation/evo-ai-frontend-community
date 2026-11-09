import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/core/api';
import { conversationAPI } from './conversationService';

vi.mock('@/services/core/api', () => ({
  default: { post: vi.fn() },
}));

describe('conversationAPI assignments', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } } as never);
  });

  const bodies = () => vi.mocked(api.post).mock.calls.map((c) => c[1]);

  it('assignTeam sends only team_id, so the agent is kept', async () => {
    await conversationAPI.assignTeam('c1', 'team-1');
    await conversationAPI.assignTeam('c1', null);
    expect(bodies()).toStrictEqual([{ team_id: 'team-1' }, { team_id: null }]);
  });

  it('assignAgent sends only assignee_id', async () => {
    await conversationAPI.assignAgent('c1', 'user-1');
    await conversationAPI.assignAgent('c1', null);
    expect(bodies()).toStrictEqual([{ assignee_id: 'user-1' }, { assignee_id: null }]);
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('/conversations/c1/assignments');
  });
});
