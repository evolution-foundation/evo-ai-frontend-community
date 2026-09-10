import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { Role } from '@/types/auth/rbac';
import type { User } from '@/types/users';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/users/usersService', () => ({
  default: { createUser: vi.fn(), updateUser: vi.fn() },
}));

// useRoles is called twice: once with no args (all roles) and once with
// { type: 'account' }. Return roles based on the requested filter so the merge
// path is exercised.
const userRole: Role = {
  id: 'role-user-x',
  key: 'gerente',
  name: 'Gerente',
  description: '',
  system: false,
  type: 'user',
  created_at: '',
  updated_at: '',
};

const accountRole: Role = {
  id: 'role-account-converse',
  key: 'converse',
  name: 'Converse',
  description: '',
  system: false,
  type: 'account',
  created_at: '',
  updated_at: '',
};

// type:user like the seeded system role, so the panel filter (not the type
// filter) is what keeps it out of the list.
const superAdminRole: Role = { ...userRole, id: 'role-super-admin', key: 'super_admin', name: 'Super Admin', system: true };

vi.mock('@/hooks/useRoles', () => ({
  default: (options?: { type?: 'user' | 'account' }) => {
    if (options?.type === 'account') {
      return { roles: [accountRole], loading: false, error: null, refetch: vi.fn() };
    }
    // Default call (no type) — the "system" roles list. Include only a user
    // role here so we prove the account role comes from the dedicated fetch.
    return { roles: [userRole, superAdminRole], loading: false, error: null, refetch: vi.fn() };
  },
}));

// Stub the design-system Select so every SelectItem renders inline (Radix only
// mounts items when the dropdown is open, which is unreliable in jsdom).
vi.mock('@evoapi/design-system', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
      open ? <div>{children}</div> : null,
    DialogContent: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: Passthrough,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: Passthrough,
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    Select: Passthrough,
    SelectContent: Passthrough,
    SelectItem: ({
      children,
      value,
      disabled,
    }: {
      children?: React.ReactNode;
      value?: string;
      disabled?: boolean;
    }) => (
      <div data-testid="select-item" data-value={value} data-disabled={disabled ? 'true' : undefined}>
        {children}
      </div>
    ),
    SelectTrigger: Passthrough,
    SelectValue: Passthrough,
  };
});

import UserFormModal from './UserFormModal';

beforeEach(() => vi.clearAllMocks());

describe('UserFormModal — account roles in the create-agent modal (AC8)', () => {
  const renderModal = () =>
    render(
      <UserFormModal isOpen user={null} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

  it('shows a custom type:account role (Converse) in the role list', () => {
    renderModal();

    const items = screen.getAllByTestId('select-item');
    const values = items.map(el => el.getAttribute('data-value'));

    expect(values).toContain('converse');
    expect(screen.getByText('Converse')).toBeInTheDocument();
  });

  it('still includes the agent base role and the type:user roles, deduped by key', () => {
    renderModal();

    const items = screen.getAllByTestId('select-item');
    const values = items.map(el => el.getAttribute('data-value'));

    expect(values).toContain('agent');
    // type:user system role merged in
    expect(values).toContain('gerente');
    // no duplicate keys
    expect(new Set(values).size).toBe(values.length);
  });
});

// The panel never hands out the user-global roles: editing someone who holds
// one keeps it visible but locked, and an unchanged role stays out of the PATCH.
describe('UserFormModal — non-assignable roles', () => {
  const ownerUser = {
    id: 'u-owner',
    name: 'Dona',
    email: 'dona@example.com',
    role: { id: 'role-owner', key: 'account_owner', name: 'Account Owner' },
    availability: 'online',
  } as unknown as User;

  const values = () =>
    screen.getAllByTestId('select-item').map(el => el.getAttribute('data-value'));

  it('offers neither account_owner nor super_admin when creating', () => {
    render(<UserFormModal isOpen user={null} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(values()).not.toContain('account_owner');
    expect(values()).not.toContain('super_admin');
    expect(values()).toContain('agent');
  });

  it('shows the current non-assignable role locked when editing', () => {
    render(<UserFormModal isOpen user={ownerUser} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const locked = screen
      .getAllByTestId('select-item')
      .find(el => el.getAttribute('data-value') === 'account_owner');
    expect(locked).toBeDefined();
    expect(locked?.getAttribute('data-disabled')).toBe('true');
    expect(values().filter(v => v === 'account_owner')).toHaveLength(1);
  });

  it('omits role from the PATCH when the role did not change', async () => {
    const { default: usersService } = await import('@/services/users/usersService');
    vi.mocked(usersService.updateUser).mockResolvedValue(ownerUser);
    const { container } = render(
      <UserFormModal isOpen user={ownerUser} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.change(screen.getByDisplayValue('Dona'), { target: { value: 'Dona Renomeada' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(usersService.updateUser).toHaveBeenCalledTimes(1));
    const [, payload] = vi.mocked(usersService.updateUser).mock.calls[0];
    expect(payload).not.toHaveProperty('role');
    expect(payload.name).toBe('Dona Renomeada');
  });
});
