import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/chat/chatService', () => ({
  chatService: {
    getMessage: vi.fn(),
  },
}));

import { chatService } from '@/services/chat/chatService';
import { getCachedReplyMessage, fetchReplyMessage } from './replyMessageCache';
import type { Message } from '@/types/chat/api';

const mockMessage = (id: string): Message =>
  ({ id, content: `content-${id}` }) as unknown as Message;

describe('replyMessageCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined from the sync cache before anything was fetched', () => {
    expect(getCachedReplyMessage('never-fetched')).toBeUndefined();
  });

  it('fetches a message, caches it, and exposes it via getCachedReplyMessage', async () => {
    vi.mocked(chatService.getMessage).mockResolvedValue(mockMessage('msg-1'));

    const result = await fetchReplyMessage('conv-1', 'msg-1');

    expect(result).toEqual(mockMessage('msg-1'));
    expect(getCachedReplyMessage('msg-1')).toEqual(mockMessage('msg-1'));
    expect(chatService.getMessage).toHaveBeenCalledWith('conv-1', 'msg-1');
  });

  it('serves the cached value on a second call without hitting the API again', async () => {
    vi.mocked(chatService.getMessage).mockResolvedValue(mockMessage('msg-2'));

    await fetchReplyMessage('conv-1', 'msg-2');
    await fetchReplyMessage('conv-1', 'msg-2');

    expect(chatService.getMessage).toHaveBeenCalledTimes(1);
  });

  // Regression: several bubbles replying to the same older message all mount
  // around the same time and each used to fire its own request.
  it('dedupes concurrent in-flight requests for the same message id', async () => {
    let resolveFetch: (message: Message) => void = () => {};
    vi.mocked(chatService.getMessage).mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      }),
    );

    const first = fetchReplyMessage('conv-1', 'msg-3');
    const second = fetchReplyMessage('conv-1', 'msg-3');

    resolveFetch(mockMessage('msg-3'));

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(chatService.getMessage).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(mockMessage('msg-3'));
    expect(secondResult).toEqual(mockMessage('msg-3'));
  });

  it('resolves null (not a throw) when the fetch fails, e.g. the message was deleted', async () => {
    vi.mocked(chatService.getMessage).mockRejectedValue(new Error('404'));

    const result = await fetchReplyMessage('conv-1', 'msg-4');

    expect(result).toBeNull();
    expect(getCachedReplyMessage('msg-4')).toBeUndefined();
  });

  it('retries on the next call after a previous failure (does not poison the cache)', async () => {
    vi.mocked(chatService.getMessage)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(mockMessage('msg-5'));

    const failed = await fetchReplyMessage('conv-1', 'msg-5');
    expect(failed).toBeNull();

    const succeeded = await fetchReplyMessage('conv-1', 'msg-5');
    expect(succeeded).toEqual(mockMessage('msg-5'));
    expect(chatService.getMessage).toHaveBeenCalledTimes(2);
  });
});
