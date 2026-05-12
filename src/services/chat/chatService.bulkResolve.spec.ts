import { beforeEach, describe, expect, it, vi } from 'vitest';
import chatService from './chatService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/utils/retry/retryHelper', () => ({
  withRetry: <T>(op: () => Promise<T>) => op(),
}));

describe('chatService.bulkResolve', () => {
  const postMock = vi.mocked(api.post);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends POST /bulk_actions with correct payload', async () => {
    postMock.mockResolvedValue({
      data: { data: { success_ids: [1, 2], failed_ids: [] } },
    } as never);

    await chatService.bulkResolve(['1', '2']);

    expect(postMock).toHaveBeenCalledWith('/bulk_actions', {
      type: 'Conversation',
      ids: ['1', '2'],
      fields: { status: 'resolved' },
    });
  });

  it('returns success_ids and failed_ids from response', async () => {
    postMock.mockResolvedValue({
      data: { data: { success_ids: [10, 11], failed_ids: [12] } },
    } as never);

    const result = await chatService.bulkResolve(['10', '11', '12']);

    expect(result.success_ids).toEqual([10, 11]);
    expect(result.failed_ids).toEqual([12]);
  });

  it('returns empty arrays when response data is absent', async () => {
    postMock.mockResolvedValue({ data: {} } as never);

    const result = await chatService.bulkResolve(['1']);

    expect(result.success_ids).toEqual([]);
    expect(result.failed_ids).toEqual([]);
  });

  it('caps selection toggle at MAX_BULK_SELECTION (200) items', () => {
    const MAX = 200;
    let selection = new Set<string>();

    const toggle = (id: string) => {
      const next = new Set(selection);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX) {
        next.add(id);
      }
      selection = next;
    };

    for (let i = 0; i < MAX + 10; i++) {
      toggle(String(i));
    }
    expect(selection.size).toBe(MAX);

    toggle('0');
    expect(selection.size).toBe(MAX - 1);

    toggle('9999');
    expect(selection.size).toBe(MAX);
  });
});
