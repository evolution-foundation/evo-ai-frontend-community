import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationAPI } from './conversationService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('conversationAPI.moveChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs /conversations/:id/move_channel with the target inbox id', async () => {
    // The backend routes move_channel as a POST member action (config/routes.rb),
    // not PATCH — mirroring the real route here, not the plan's assumption.
    const postSpy = vi.mocked(api.post);
    postSpy.mockResolvedValue({ data: { data: { id: 'conv1' } } } as never);

    const result = await conversationAPI.moveChannel('conv1', 'inbox2');

    expect(postSpy).toHaveBeenCalledWith('/conversations/conv1/move_channel', {
      inbox_id: 'inbox2',
    });
    expect(result).toEqual({ id: 'conv1' });
  });
});
