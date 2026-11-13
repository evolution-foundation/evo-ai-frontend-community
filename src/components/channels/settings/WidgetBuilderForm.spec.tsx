import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WidgetBuilderForm from './WidgetBuilderForm';

// A stable `t`: the form keys effects on it.
const { t, toast } = vi.hoisted(() => ({
  t: (key: string) => key,
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t, currentLanguage: 'en' }) }));
vi.mock('sonner', () => ({ toast }));
vi.mock('./widget/WidgetPreview', () => ({ default: () => null }));

const inbox = { name: 'Site', avatar_url: 'https://cdn.example.com/avatar.png' };

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => vi.clearAllMocks());

const removeButton = () => screen.getByAltText('Avatar').parentElement!.querySelector('button')!;

describe('WidgetBuilderForm avatar removal', () => {
  it('removes the stored avatar on the server before clearing it from the form', async () => {
    const onAvatarDelete = vi.fn().mockResolvedValue(undefined);
    render(<WidgetBuilderForm inboxId="inbox-1" inbox={inbox} onAvatarDelete={onAvatarDelete} />);

    await userEvent.click(removeButton());

    expect(onAvatarDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByAltText('Avatar')).toBeNull());
  });

  it('keeps the avatar and reports the failure when the server refuses', async () => {
    const onAvatarDelete = vi.fn().mockRejectedValue(new Error('network'));
    render(<WidgetBuilderForm inboxId="inbox-1" inbox={inbox} onAvatarDelete={onAvatarDelete} />);

    await userEvent.click(removeButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('settings.errors.avatarDeleteError'));
    expect(screen.getByAltText('Avatar')).toBeInTheDocument();
  });
});
