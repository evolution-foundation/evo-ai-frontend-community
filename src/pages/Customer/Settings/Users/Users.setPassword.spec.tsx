import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * CRM-210: who may set whose password.
 *
 * The rule is hierarchical, not a flat permission check:
 *   - super_admin sets anyone's password
 *   - an owner sets an agent's, but NEVER a super_admin's
 *   - nobody sets their own here (that is account settings)
 *
 * The backend enforces all three (users_controller#set_password). The screen
 * must not OFFER a button for a case the backend refuses, otherwise the admin
 * types a new password and only then gets a 403.
 */

const h = vi.hoisted(() => ({
  currentUser: { id: '1', name: 'Eu', role: { key: 'super_admin' } } as {
    id: string;
    name: string;
    role?: { key: string };
  },
  // users.read is what loadUsers gates on; without it the list never populates.
  granted: ['users.read', 'users.reset_password', 'users.manage'] as string[],
  users: [] as Array<{ id: string; name: string; email: string; role?: { key: string } }>,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt' }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => h.granted.includes(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ currentUser: h.currentUser }),
}));

vi.mock('@/services/users', () => ({
  usersService: {
    getUsers: () =>
      Promise.resolve({
        data: h.users,
        meta: {
          pagination: {
            page: 1,
            page_size: 20,
            total: h.users.length,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false,
          },
        },
      }),
  },
}));

vi.mock('@/services/roles/rolesService', () => ({
  rolesService: { list: () => Promise.resolve([]) },
}));

vi.mock('@/tours', () => ({ SettingsAgentsTour: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type CardProps = { user: { id: string; name: string }; onSetPassword?: unknown };

// The only thing under test is WHETHER the card is handed an onSetPassword.
vi.mock('@/components/users', () => ({
  UsersHeader: () => null,
  UsersPagination: () => null,
  UsersFilter: () => null,
  UsersTable: () => null,
  UserFormModal: () => null,
  BulkInviteModal: () => null,
  UserDetails: () => null,
  SetPasswordModal: () => null,
  UserCard: ({ user, onSetPassword }: CardProps) => (
    <div data-testid={`card-${user.id}`} data-can-set-password={onSetPassword ? 'yes' : 'no'} />
  ),
}));

import Users from './Users';

const SUPER_ADMIN = { id: '2', name: 'Super', email: 's@e.com', role: { key: 'super_admin' } };
const OWNER = { id: '3', name: 'Owner', email: 'o@e.com', role: { key: 'account_owner' } };
const AGENT = { id: '4', name: 'Agente', email: 'a@e.com', role: { key: 'agent' } };

const offersButtonFor = async (id: string) => {
  await waitFor(() => expect(screen.getByTestId(`card-${id}`)).toBeInTheDocument());
  return screen.getByTestId(`card-${id}`).getAttribute('data-can-set-password') === 'yes';
};

describe('CRM-210 — set-password button follows the role hierarchy', () => {
  beforeEach(() => {
    h.granted = ['users.read', 'users.reset_password', 'users.manage'];
    h.currentUser = { id: '1', name: 'Eu', role: { key: 'super_admin' } };
    h.users = [];
  });

  it('lets a super_admin set another super_admin password', async () => {
    h.users = [SUPER_ADMIN];
    render(<Users />);
    expect(await offersButtonFor('2')).toBe(true);
  });

  it('does NOT let an owner set a super_admin password', async () => {
    h.currentUser = { id: '1', name: 'Eu', role: { key: 'account_owner' } };
    h.users = [SUPER_ADMIN];
    render(<Users />);
    expect(await offersButtonFor('2')).toBe(false);
  });

  it('lets an owner set an agent password', async () => {
    h.currentUser = { id: '1', name: 'Eu', role: { key: 'account_owner' } };
    h.users = [AGENT];
    render(<Users />);
    expect(await offersButtonFor('4')).toBe(true);
  });

  it('lets an owner set another owner password', async () => {
    h.currentUser = { id: '1', name: 'Eu', role: { key: 'account_owner' } };
    h.users = [OWNER];
    render(<Users />);
    expect(await offersButtonFor('3')).toBe(true);
  });

  it('never offers it on your own card, not even for a super_admin', async () => {
    h.users = [{ id: '1', name: 'Eu', email: 'eu@e.com', role: { key: 'super_admin' } }];
    render(<Users />);
    expect(await offersButtonFor('1')).toBe(false);
  });

  it('does not offer it on your own card when the id arrives as a number', async () => {
    // currentUserId is stringified; a strict === against a numeric id would
    // wrongly offer the button on your own card.
    h.users = [{ id: 1 as unknown as string, name: 'Eu', email: 'eu@e.com', role: { key: 'super_admin' } }];
    render(<Users />);
    expect(await offersButtonFor('1')).toBe(false);
  });

  it('offers nothing without the standalone reset_password key', async () => {
    h.granted = ['users.read', 'users.manage'];
    h.users = [AGENT];
    render(<Users />);
    expect(await offersButtonFor('4')).toBe(false);
  });

  it('offers nothing without users.manage, even holding reset_password', async () => {
    h.granted = ['users.read', 'users.reset_password'];
    h.users = [AGENT];
    render(<Users />);
    expect(await offersButtonFor('4')).toBe(false);
  });

  it('treats a user with no role as an ordinary target', async () => {
    h.currentUser = { id: '1', name: 'Eu', role: { key: 'account_owner' } };
    h.users = [{ id: '5', name: 'Sem papel', email: 'x@e.com' }];
    render(<Users />);
    expect(await offersButtonFor('5')).toBe(true);
  });
});
