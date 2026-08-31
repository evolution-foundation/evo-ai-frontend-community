import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import RouterGuard from './RouterGuard';

// CRM-164. The guard turns a failed permission load into a panel instead of a
// spinner that can never end. The path split is the part worth pinning: a
// logged-in visitor on /widget, /f/:slug or /chat/:slug must still get the page.

const mockLocation = { pathname: '/conversations', search: '' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => mockLocation,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true, logout: vi.fn() }),
}));

const mockUsePermissions = vi.fn();

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => ({ setupRequired: false, setupLoading: false }),
}));

vi.mock('@/utils/requestMonitor', () => ({
  markBootstrapPhaseStart: vi.fn(),
  markBootstrapPhaseEnd: vi.fn(),
}));

function permissions(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isReady: false,
    loadFailed: false,
    loading: false,
    refreshPermissions: vi.fn(),
    ...overrides,
  };
}

function renderGuard(pathname: string) {
  mockLocation.pathname = pathname;
  render(
    <RouterGuard>
      <span data-testid="app">app</span>
    </RouterGuard>,
  );
}

describe('RouterGuard — a failed permission load is not a denial (CRM-164)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the load-failure panel on a protected path instead of spinning forever', () => {
    mockUsePermissions.mockReturnValue(permissions({ loadFailed: true }));

    renderGuard('/conversations');

    expect(screen.getByTestId('permissions-load-failure')).toBeTruthy();
    expect(screen.queryByTestId('app')).toBeNull();
  });

  it('does not block a public path a logged-in visitor may legitimately open', () => {
    mockUsePermissions.mockReturnValue(permissions({ loadFailed: true }));

    renderGuard('/f/lead-form-slug');

    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
    expect(screen.getByTestId('app')).toBeTruthy();
  });

  it('still spins while the permissions are merely in flight', () => {
    mockUsePermissions.mockReturnValue(permissions());

    renderGuard('/conversations');

    // Not-ready without a failure is the boot window, not an error.
    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
    expect(screen.queryByTestId('app')).toBeNull();
  });

  it('renders the app once the permissions are ready', () => {
    mockUsePermissions.mockReturnValue(permissions({ isReady: true }));

    renderGuard('/conversations');

    expect(screen.getByTestId('app')).toBeTruthy();
    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
  });
});
