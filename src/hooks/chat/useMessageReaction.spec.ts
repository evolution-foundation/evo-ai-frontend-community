import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageReaction } from './useMessageReaction';
import type { Message } from '@/types/chat/api';

const chat = vi.hoisted(() => ({ reactToMessage: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@/services/chat/chatService', () => ({ default: chat }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const previous = { emoji: '❤️', from: 'me' as const, user_id: 'u1', at: 1 };
const target = { id: 'm1', content_attributes: { reactions: [previous] } } as unknown as Message;

describe('useMessageReaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the reaction at once and then keeps what the server saved', async () => {
    const saved = { emoji: '👍', from: 'me', user_id: 'u1', at: 9 };
    chat.reactToMessage.mockResolvedValue({ content_attributes: { reactions: [saved] } });
    const apply = vi.fn();
    const { result } = renderHook(() => useMessageReaction(apply));
    await act(() => result.current('c1', target, '👍'));
    expect(chat.reactToMessage).toHaveBeenCalledWith('c1', 'm1', '👍');
    expect(apply.mock.calls[0]).toEqual(['c1', 'm1', expect.objectContaining({ emoji: '👍', from: 'me' })]);
    expect(apply.mock.calls[1]).toEqual(['c1', 'm1', saved]);
  });

  it('removes with an empty emoji', async () => {
    chat.reactToMessage.mockResolvedValue({ content_attributes: { reactions: [] } });
    const apply = vi.fn();
    const { result } = renderHook(() => useMessageReaction(apply));
    await act(() => result.current('c1', target, ''));
    expect(apply.mock.calls).toEqual([['c1', 'm1', null], ['c1', 'm1', null]]);
  });

  it('warns and restores my previous reaction when it fails', async () => {
    chat.reactToMessage.mockRejectedValue(new Error('422'));
    const apply = vi.fn();
    const { result } = renderHook(() => useMessageReaction(apply));
    await act(() => result.current('c1', target, '👍'));
    expect(apply.mock.calls[1]).toEqual(['c1', 'm1', previous]);
    expect(toast.error).toHaveBeenCalledWith('messages.messageBubble.reactions.error');
  });

  it('ignores another click on the same message while one is pending', async () => {
    let finish: (value: unknown) => void = () => undefined;
    chat.reactToMessage.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useMessageReaction(vi.fn()));
    await act(async () => {
      void result.current('c1', target, '👍');
      void result.current('c1', target, '😂');
    });
    expect(chat.reactToMessage).toHaveBeenCalledTimes(1);
    await act(async () => finish({ content_attributes: {} }));
  });
});
