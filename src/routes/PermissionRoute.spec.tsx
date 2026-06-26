import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import PermissionRoute from './PermissionRoute';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUsePermissions = vi.fn();

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => mockUsePermissions(),
}));

// Build a usePermissions return value from a flat list of granted keys.
function permissions(granted: string[]) {
  return {
    can: (resource: string, action: string) => granted.includes(`${resource}.${action}`),
    canAny: (perms: string[]) => perms.some(p => granted.includes(p)),
    canAll: (perms: string[]) => perms.every(p => granted.includes(p)),
    isReady: true,
    loading: false,
  };
}

// /settings/users gates on users.read (no users.manage permission exists).
describe('PermissionRoute — /settings/users gated on users.read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects a profile without users.read (e.g. Conversas-only) away from /settings/users', async () => {
    mockUsePermissions.mockReturnValue(permissions(['conversations.read']));

    render(
      <PermissionRoute resource="users" action="read">
        <div data-testid="users-panel">Users Panel</div>
      </PermissionRoute>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });
    expect(screen.queryByTestId('users-panel')).toBeNull();
  });

  it('renders the panel for a profile that has users.read (admin roles)', () => {
    mockUsePermissions.mockReturnValue(permissions(['users.read']));

    render(
      <PermissionRoute resource="users" action="read">
        <div data-testid="users-panel">Users Panel</div>
      </PermissionRoute>,
    );

    expect(screen.getByTestId('users-panel')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
