import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// The row action is the only way into a role's detail screen, so its icon must
// match what that screen allows, and `read` alone must be enough to open it.

const navigateStub = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateStub,
}));

const tStub = (k: string) => k;
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: tStub, currentLanguage: 'en' }),
}));

// Which permissions the caller holds, per test.
let granted = new Set<string>(['roles.read', 'roles.update', 'roles.bulk_update_permissions', 'roles.create', 'roles.delete']);
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => granted.has(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

const role = (over: Partial<Record<string, unknown>>) => ({
  id: 'r1',
  key: 'agent',
  name: 'Agent',
  description: '',
  system: false,
  type: 'account',
  permissions_by_resource: {},
  permissions_count: 3,
  users_count: 0,
  created_at: '',
  updated_at: '',
  ...over,
});

let listed: unknown[] = [];
vi.mock('@/services/roles/rolesService', () => ({
  rolesService: {
    list: vi.fn().mockImplementation(() => Promise.resolve(listed)),
    create: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock('@/services/permissions', () => ({
  permissionsService: { clearPermissionsCache: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RolesList from './RolesList';

beforeEach(() => {
  navigateStub.mockClear();
  granted = new Set(['roles.read', 'roles.update', 'roles.bulk_update_permissions', 'roles.create', 'roles.delete']);
  listed = [];
});

const rowAction = () => screen.queryByTitle('editRole') ?? screen.queryByTitle('viewRole');

describe('RolesList — the row action tells the truth about the detail screen', () => {
  it('offers "view", not "edit", on a system role even to a full admin', async () => {
    listed = [role({ id: 'sys', system: true })];
    render(<RolesList />);

    await waitFor(() => expect(rowAction()).not.toBeNull());
    expect(screen.queryByTitle('editRole')).toBeNull();
    expect(screen.getByTitle('viewRole')).toBeTruthy();
  });

  it('offers "edit" on a custom role the caller can actually change', async () => {
    listed = [role({ id: 'custom', system: false })];
    render(<RolesList />);

    await waitFor(() => expect(rowAction()).not.toBeNull());
    expect(screen.getByTitle('editRole')).toBeTruthy();
  });

  it('falls back to "view" on a custom role when the caller holds neither write grant', async () => {
    granted = new Set(['roles.read']);
    listed = [role({ id: 'custom', system: false })];
    render(<RolesList />);

    await waitFor(() => expect(rowAction()).not.toBeNull());
    expect(screen.getByTitle('viewRole')).toBeTruthy();
  });

  it('still lets a read-only caller open the detail screen at all', async () => {
    granted = new Set(['roles.read']);
    listed = [role({ id: 'sys', system: true })];
    render(<RolesList />);

    await waitFor(() => expect(rowAction()).not.toBeNull());
    screen.getByTitle('viewRole').click();
    expect(navigateStub).toHaveBeenCalledWith('/settings/roles/sys');
  });

  it('never offers delete on a system role', async () => {
    listed = [role({ id: 'sys', system: true })];
    render(<RolesList />);

    await waitFor(() => expect(rowAction()).not.toBeNull());
    expect(screen.queryByTitle('deleteRole')).toBeNull();
  });
});
