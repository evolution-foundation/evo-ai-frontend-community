import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// A stable `t`, as the real i18n gives: the component re-loads when `t` changes.
const t = (key: string, opts?: Record<string, unknown>) =>
  opts && 'count' in opts ? `${key}:${opts.count}` : key;
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@evoapi/design-system', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Card: Passthrough, CardContent: Passthrough, Switch: () => <input type="checkbox" /> };
});

const getAccountUsersMock = vi.fn();
vi.mock('@/services/users/usersService', () => ({
  default: { getAccountUsers: (...args: unknown[]) => getAccountUsersMock(...args) },
}));
const inboxMembersGetMock = vi.fn();
vi.mock('@/services/channels/inboxMembersService', () => ({
  default: { get: (...args: unknown[]) => inboxMembersGetMock(...args), update: vi.fn() },
}));

import CollaboratorsForm from './CollaboratorsForm';

const person = (id: number, name: string) => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  role: { key: 'agent', name: 'agent' },
  availability_status: 'online',
});

// CRM-539: "Atendentes" lists the account directory (single scoped source),
// marks the current inbox members, and the total is the size of that list —
// not of a cross-account union, not of the auth's default page.
describe('CollaboratorsForm — account-scoped agents (CRM-539)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountUsersMock.mockResolvedValue([person(1, 'Ana'), person(2, 'Bia'), person(3, 'Caio')]);
    inboxMembersGetMock.mockResolvedValue([person(2, 'Bia')]);
  });

  it('reads the universe from the account directory, once, for the inbox', async () => {
    render(<CollaboratorsForm inboxId="inbox-9" />);

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    expect(getAccountUsersMock).toHaveBeenCalledTimes(1);
    expect(inboxMembersGetMock).toHaveBeenCalledWith('inbox-9');
  });

  it('shows the total of the directory and the count of current members', async () => {
    render(<CollaboratorsForm inboxId="inbox-9" />);

    await waitFor(() => expect(screen.getByText('Caio')).toBeInTheDocument());
    expect(screen.getByText(/settings\.collaborators\.agents\.selectedCount:1/)).toBeInTheDocument();
    expect(screen.getByText(/\(3 settings\.collaborators\.agents\.total\)/)).toBeInTheDocument();
  });

  it('marks only the users who are already inbox members', async () => {
    render(<CollaboratorsForm inboxId="inbox-9" />);

    await waitFor(() => expect(screen.getByText('Bia')).toBeInTheDocument());
    const rowOf = (name: string) => screen.getByText(name).closest('[class*="cursor-pointer"]') as HTMLElement;
    // ring-2 is the selected-only class; border-primary also matches the hover of unselected rows.
    expect(rowOf('Bia').className).toContain('ring-2');
    expect(rowOf('Ana').className).not.toContain('ring-2');
    expect(rowOf('Caio').className).not.toContain('ring-2');
  });

  it('reports a failed directory load instead of showing "no agents"', async () => {
    const { toast } = await import('sonner');
    getAccountUsersMock.mockRejectedValue(new Error('403'));
    render(<CollaboratorsForm inboxId="inbox-9" />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('settings.collaborators.errors.loadError'));
  });

  it('renders the empty state when the directory is empty', async () => {
    getAccountUsersMock.mockResolvedValue([]);
    inboxMembersGetMock.mockResolvedValue([]);
    render(<CollaboratorsForm inboxId="inbox-9" />);

    await waitFor(() =>
      expect(screen.getByText('settings.collaborators.agents.noAgents.title')).toBeInTheDocument(),
    );
    expect(screen.getByText(/\(0 settings\.collaborators\.agents\.total\)/)).toBeInTheDocument();
  });
});
