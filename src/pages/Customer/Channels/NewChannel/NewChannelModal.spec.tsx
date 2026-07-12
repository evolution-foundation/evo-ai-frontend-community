import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewChannelModal from './NewChannelModal';

// Stands in for NewChannel's real unmount cleanup (Evolution Go deletes the
// remote instance it provisioned during "test connection" when the component
// unmounts). Asserting this fires proves closing the modal unmounts NewChannel
// rather than merely hiding it — the orphaned-instance risk called out in the spec.
const { cleanupSpy } = vi.hoisted(() => ({ cleanupSpy: vi.fn() }));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@evoapi/design-system', () => ({
  // Controlled Dialog: render nothing when closed, mirroring Radix behavior.
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('./index', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: ({ initialChannelId }: { initialChannelId?: string }) => {
      React.useEffect(() => () => cleanupSpy(), []);
      return React.createElement(
        'div',
        { 'data-testid': 'new-channel' },
        `channel:${initialChannelId ?? ''}`,
      );
    },
  };
});

describe('NewChannelModal', () => {
  beforeEach(() => cleanupSpy.mockClear());

  it('mounts the embedded NewChannel with initialChannelId when open', () => {
    render(<NewChannelModal open onOpenChange={vi.fn()} initialChannelId="whatsapp" />);
    expect(screen.getByTestId('new-channel')).toHaveTextContent('channel:whatsapp');
  });

  it('unmounts NewChannel when closed so its cleanup runs', () => {
    const { rerender } = render(
      <NewChannelModal open onOpenChange={vi.fn()} initialChannelId="whatsapp" />,
    );
    expect(cleanupSpy).not.toHaveBeenCalled();

    rerender(<NewChannelModal open={false} onOpenChange={vi.fn()} initialChannelId="whatsapp" />);

    expect(screen.queryByTestId('new-channel')).toBeNull();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
