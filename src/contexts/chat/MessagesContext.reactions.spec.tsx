import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider, useMessages } from './MessagesContext';
import type { Message } from '@/types/chat/api';

vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const contact = { emoji: '🙏', from: 'contact' as const, user_id: null, at: 1 };
const message = { id: 'm1', conversation_id: 'c1', created_at: 1, content: 'Olá', content_attributes: { in_reply_to: 'm0', reactions: [contact] } } as unknown as Message;

describe('MessagesContext setMyReaction', () => {
  it('changes only my reaction on that message', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MessagesProvider>{children}</MessagesProvider>;
    const { result } = renderHook(() => useMessages(), { wrapper });
    act(() => result.current.setMessages('c1', [message]));
    const mine = { emoji: '👍', from: 'me' as const, user_id: null, at: 2 };
    act(() => result.current.setMyReaction('c1', 'm1', mine));
    expect(result.current.getMessages('c1')[0].content_attributes).toEqual({ in_reply_to: 'm0', reactions: [contact, mine] });
    act(() => result.current.setMyReaction('c1', 'm1', null));
    expect(result.current.getMessages('c1')[0].content_attributes.reactions).toEqual([contact]);
  });
});
