import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { PermissionsProvider, usePermissions } from './PermissionsContext';

// Data-driven guard. The backend has no RBAC bypass for the installation owner
// (the resource gate and /permissions are row-based), so `can()` must answer
// strictly from the granted permission list. A role short-circuit here — e.g.
// "super_admin sees everything" — would render controls the API then 403s, and
// would hide the seed drift the backend guard exists to surface. These examples
// pin that behaviour: the exact same permission list must produce the exact
// same answers no matter which role the user carries.

const mockUser = vi.fn();

const mockLogout = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser(), logout: mockLogout }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ isLoggedIn: true }) },
}));

const mockAccountPermissions = vi.fn<[], Promise<string[]>>();
const mockUserPermissions = vi.fn<[], Promise<string[]>>();

vi.mock('@/services/permissions', () => ({
  permissionsService: {
    getResourceActions: () =>
      Promise.resolve({
        data: {
          all_permissions: [
            { key: 'contacts.read', display_name: 'Contacts - Read' },
            { key: 'installation_configs.manage', display_name: 'Installation Configs - Manage' },
          ],
        },
      }),
    getUserPermissions: () => mockUserPermissions(),
    getAccountPermissions: () => mockAccountPermissions(),
  },
}));

const Probe: React.FC = () => {
  const { can, isReady, loadFailed, refreshPermissions } = usePermissions();
  return (
    <>
      <span data-testid="ready">{String(isReady)}</span>
      <span data-testid="load-failed">{String(loadFailed)}</span>
      <button
        onClick={() => {
          void refreshPermissions();
        }}
      >
        retry
      </button>
      {isReady ? (
        <>
          <span data-testid="contacts-read">{String(can('contacts', 'read'))}</span>
          <span data-testid="installation-manage">{String(can('installation_configs', 'manage'))}</span>
        </>
      ) : (
        <span>loading</span>
      )}
    </>
  );
};

// `blockOnLoadFailure={false}` mirrors the standalone app, where RouterGuard
// owns the panel. The default is covered by its own describe below.
function renderProbe(role = 'agent') {
  mockUser.mockReturnValue({ id: 'user-1', name: 'Someone', role });
  render(
    <PermissionsProvider blockOnLoadFailure={false}>
      <Probe />
    </PermissionsProvider>,
  );
}

async function renderWith(role: string, granted: string[]) {
  mockUserPermissions.mockResolvedValue([]);
  mockAccountPermissions.mockResolvedValue(granted);
  renderProbe(role);

  await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
}

describe('PermissionsContext — can() stays data-driven (no role short-circuit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies a permission the user was not granted, even for super_admin', async () => {
    await renderWith('super_admin', ['contacts.read']);

    expect(screen.getByTestId('contacts-read').textContent).toBe('true');
    // The seed grants this key to super_admin; a stale installation may not
    // have it yet. The UI must reflect the grants, not the role name.
    expect(screen.getByTestId('installation-manage').textContent).toBe('false');
  });

  it('grants a permission the user holds, regardless of role', async () => {
    await renderWith('agent', ['contacts.read', 'installation_configs.manage']);

    expect(screen.getByTestId('contacts-read').textContent).toBe('true');
    expect(screen.getByTestId('installation-manage').textContent).toBe('true');
  });

  it('denies everything when the permission list is empty, even for super_admin', async () => {
    await renderWith('super_admin', []);

    expect(screen.getByTestId('contacts-read').textContent).toBe('false');
    expect(screen.getByTestId('installation-manage').textContent).toBe('false');
  });
});

// CRM-164. A swallowed fetch error used to flip `isReady` with an empty list,
// so every `can()` answered false — a load failure served as a denial. Both
// reported windows (reload, and account switch, which the shell serves with a
// full page reload) are this same boot path.
describe('PermissionsContext — a failed load is not a denial (CRM-164)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserPermissions.mockResolvedValue([]);
    mockAccountPermissions.mockResolvedValue([]);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('stays not-ready and reports loadFailed when the account fetch throws', async () => {
    mockAccountPermissions.mockRejectedValue(new Error('network down'));
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('load-failed').textContent).toBe('true'));
    expect(screen.getByTestId('ready').textContent).toBe('false');
    // Nothing evaluated `can()`, so no screen could have rendered a denial.
    expect(screen.queryByTestId('contacts-read')).toBeNull();
  });

  it('stays not-ready and reports loadFailed when the user fetch throws', async () => {
    mockUserPermissions.mockRejectedValue(new Error('network down'));
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('load-failed').textContent).toBe('true'));
    expect(screen.getByTestId('ready').textContent).toBe('false');
  });

  it('recovers on retry: refreshPermissions clears the failure and grants access', async () => {
    mockAccountPermissions.mockRejectedValueOnce(new Error('network down'));
    mockAccountPermissions.mockResolvedValue(['contacts.read']);
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('load-failed').textContent).toBe('true'));
    // Pinned so the recovery cannot be credited to an effect refiring on its own.
    const callsBeforeRetry = mockAccountPermissions.mock.calls.length;

    fireEvent.click(screen.getByText('retry'));

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('load-failed').textContent).toBe('false');
    expect(screen.getByTestId('contacts-read').textContent).toBe('true');
    expect(mockAccountPermissions.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('treats a successfully empty list as a real denial, not a failure', async () => {
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('load-failed').textContent).toBe('false');
    expect(screen.getByTestId('contacts-read').textContent).toBe('false');
  });
});

// CRM-164. The panel has two hosts: RouterGuard (see its spec) and this
// provider, the only one the embedded shell mounts — without it a failed load
// leaves every CRM screen rendering an empty list, with no message and no retry.
describe('PermissionsProvider — the failure panel replaces the tree it wraps (CRM-164)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserPermissions.mockResolvedValue([]);
    mockAccountPermissions.mockResolvedValue([]);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  function renderBlocking() {
    mockUser.mockReturnValue({ id: 'user-1', name: 'Someone', role: 'agent' });
    render(
      <PermissionsProvider>
        <span data-testid="app">app</span>
      </PermissionsProvider>,
    );
  }

  it('renders the panel instead of the children when the load fails', async () => {
    mockAccountPermissions.mockRejectedValue(new Error('network down'));
    renderBlocking();

    await waitFor(() => expect(screen.getByTestId('permissions-load-failure')).toBeTruthy());
    expect(screen.queryByTestId('app')).toBeNull();
  });

  it('keeps rendering the children when the load succeeds', async () => {
    renderBlocking();

    await waitFor(() => expect(screen.getByTestId('app')).toBeTruthy());
    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
  });

  it('gives the panel a way out of a failure that retries into itself', async () => {
    mockAccountPermissions.mockRejectedValue(new Error('network down'));
    renderBlocking();

    await waitFor(() => expect(screen.getByTestId('permissions-load-failure')).toBeTruthy());
    fireEvent.click(screen.getByTestId('permissions-load-failure-signout'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('restores the children when the panel retry recovers', async () => {
    mockAccountPermissions.mockRejectedValueOnce(new Error('network down'));
    mockAccountPermissions.mockResolvedValue(['contacts.read']);
    renderBlocking();

    await waitFor(() => expect(screen.getByTestId('permissions-load-failure')).toBeTruthy());
    const retry = screen
      .getAllByRole('button')
      .find(button => button.getAttribute('data-testid') !== 'permissions-load-failure-signout');
    fireEvent.click(retry!);

    await waitFor(() => expect(screen.getByTestId('app')).toBeTruthy());
    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
  });
});
