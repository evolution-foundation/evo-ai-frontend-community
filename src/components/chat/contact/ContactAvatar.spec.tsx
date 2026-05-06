import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ContactAvatar from './ContactAvatar';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/channels/ChannelIcon', () => ({
  default: () => <span data-testid="channel-icon" />,
}));

// Radix Avatar gates AvatarImage behind a loading-state check that does not
// resolve in jsdom. Replace it with primitives so the assertions can target the
// field-priority logic in ContactAvatar.tsx, which is what EVO-1012 needs to
// regression-pin (a rename like `thumbnail` → `avatar_thumb` in the API would
// silently break the conversation list, header, sidebar, and /contacts pages).
vi.mock('@evoapi/design-system/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar-root" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
    src ? <img data-testid="avatar-image" src={src} alt={alt ?? ''} /> : null,
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@evoapi/design-system/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ContactAvatar (EVO-1012)', () => {
  it('renders avatar_url when present (priority 1)', () => {
    render(
      <ContactAvatar
        contact={{ id: '1', name: 'Jane Doe', avatar_url: 'https://cdn.example.com/avatar.jpg' }}
      />,
    );

    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.jpg');
  });

  it('falls back to thumbnail (backend ContactSerializer field) when avatar_url is missing', () => {
    render(
      <ContactAvatar
        contact={{
          id: '2',
          name: 'John Doe',
          avatar_url: null,
          thumbnail: 'https://cdn.example.com/from-thumbnail.jpg',
        }}
      />,
    );

    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/from-thumbnail.jpg');
  });

  it('falls back to avatar field as a last resort', () => {
    render(
      <ContactAvatar
        contact={{
          id: '3',
          name: 'Bob',
          avatar_url: null,
          thumbnail: null,
          avatar: 'https://cdn.example.com/from-avatar.jpg',
        }}
      />,
    );

    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/from-avatar.jpg');
  });

  it('skips <img> entirely when no avatar field is populated and shows initials fallback', () => {
    render(
      <ContactAvatar
        contact={{ id: '4', name: 'Alice Smith', avatar_url: null, thumbnail: null, avatar: null }}
      />,
    );

    expect(screen.queryByTestId('avatar-image')).toBeNull();
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('AS');
  });

  it('skips <img> when contact is null', () => {
    render(<ContactAvatar contact={null} />);

    expect(screen.queryByTestId('avatar-image')).toBeNull();
  });

  it('renders the channel icon badge when channelType is provided', () => {
    render(
      <ContactAvatar
        contact={{ id: '5', name: 'Channel User', avatar_url: 'https://cdn.example.com/x.jpg' }}
        channelType="Channel::Whatsapp"
        channelProvider="evolution"
      />,
    );

    expect(screen.getByTestId('channel-icon')).toBeInTheDocument();
  });
});
