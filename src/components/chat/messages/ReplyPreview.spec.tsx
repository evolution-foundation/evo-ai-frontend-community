import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

import ReplyPreview from './ReplyPreview';
import type { Message } from '@/types/chat/api';

const mockMessage = (overrides: Partial<Message> = {}): Message =>
  ({
    id: 'quoted-msg-1',
    content: '<p>Olá, tudo bem?</p>',
    sender: { name: 'Rebeca' },
    ...overrides,
  }) as unknown as Message;

describe('ReplyPreview', () => {
  it('calls onJumpToMessage with the quoted message id when clicked', () => {
    const onJumpToMessage = vi.fn();
    render(
      <ReplyPreview message={mockMessage()} isOwn={false} onJumpToMessage={onJumpToMessage} />,
    );

    fireEvent.click(screen.getByText('Olá, tudo bem?'));

    expect(onJumpToMessage).toHaveBeenCalledWith('quoted-msg-1');
  });

  it('does nothing on click when the quoted message never resolved', () => {
    const onJumpToMessage = vi.fn();
    render(<ReplyPreview message={null} isOwn={false} onJumpToMessage={onJumpToMessage} />);

    fireEvent.click(screen.getByText('messages.replyPreview.previousMessage'));

    expect(onJumpToMessage).not.toHaveBeenCalled();
  });

  // Regression guard: without a jump handler wired up (a caller that hasn't
  // adopted it yet), clicking must not throw - it just no-ops beyond the
  // DOM-query fallback.
  it('does not throw when no onJumpToMessage handler is provided', () => {
    render(<ReplyPreview message={mockMessage()} isOwn={false} />);

    expect(() => fireEvent.click(screen.getByText('Olá, tudo bem?'))).not.toThrow();
  });
});
