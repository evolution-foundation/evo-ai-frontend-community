import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageStatus from './MessageStatus';
import { MESSAGE_TYPE, Message } from '@/types/chat/api';

type ToastOptions = { description?: string; action?: { label: string; onClick: () => void } };

const toastError = vi.fn();
const toastWarning = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (title: string, opts?: ToastOptions) => toastError(title, opts),
    warning: (title: string, opts?: ToastOptions) => toastWarning(title, opts),
    info: (title: string, opts?: ToastOptions) => toastInfo(title, opts),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const META_ERROR = '131042: Business eligibility payment issue';

function failedMessage(externalError?: string): Message {
  return {
    id: 'msg-1',
    content: 'hi',
    content_attributes: externalError === undefined ? {} : { external_error: externalError },
    content_type: 'text',
    conversation_id: 'conv-1',
    created_at: 1_756_330_000,
    external_source_ids: {},
    message_type: MESSAGE_TYPE.OUTGOING,
    private: false,
    sender: { id: 'user-1', name: 'Agent', type: 'user' },
    source_id: 'wamid.HBgMNTU3NDk5ODc5NDA5',
    status: 'failed',
    attachments: [],
  };
}

async function clickIndicator(message: Message, onRetry?: () => void) {
  render(<MessageStatus message={message} isOwn onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button'));
}

describe('MessageStatus — failed public message', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastWarning.mockClear();
    toastInfo.mockClear();
  });

  it('shows the reason the backend stored, without the generic guidance', async () => {
    await clickIndicator(failedMessage(META_ERROR));

    expect(toastError).toHaveBeenCalledWith(
      'messages.messageStatus.messageNotSent',
      expect.objectContaining({ description: META_ERROR }),
    );
    expect(toastWarning).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('labels the indicator as a send failure when the reason is known', async () => {
    render(<MessageStatus message={failedMessage(META_ERROR)} isOwn />);

    const indicator = screen.getByRole('button');
    expect(indicator).toHaveTextContent('messages.messageStatus.sendFailedText');
    expect(indicator).toHaveAttribute('title', 'messages.messageStatus.sendFailed');
  });

  it('keeps the generic guidance and its label when there is no reason', async () => {
    render(<MessageStatus message={failedMessage()} isOwn />);

    const indicator = screen.getByRole('button');
    expect(indicator).toHaveTextContent('messages.messageStatus.statusUnavailableText');
    await userEvent.click(indicator);

    expect(toastWarning).toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
  ])('treats a %s external_error as missing', async (_label, externalError) => {
    await clickIndicator(failedMessage(externalError));

    expect(toastWarning).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('caps a long reason so the toast stays readable', async () => {
    await clickIndicator(failedMessage('x'.repeat(1000)));

    const description = toastError.mock.calls[0][1].description;
    expect(description).toHaveLength(241);
    expect(description.endsWith('…')).toBe(true);
  });

  it('does not resend on click and offers the retry as an explicit action', async () => {
    const onRetry = vi.fn();
    await clickIndicator(failedMessage(META_ERROR), onRetry);

    expect(onRetry).not.toHaveBeenCalled();

    toastError.mock.calls[0][1].action.onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers the retry action on the generic path too', async () => {
    const onRetry = vi.fn();
    await clickIndicator(failedMessage(), onRetry);

    expect(onRetry).not.toHaveBeenCalled();

    toastWarning.mock.calls[0][1].action.onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
