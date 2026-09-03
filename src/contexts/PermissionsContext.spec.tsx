import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
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

// Mirrors the store: `isLoggedIn` is derived from the current user, so it is
// false for exactly as long as `useAuth().user` is null. Pinning it to true
// hid the CRM-494 window, where the provider mounts with neither.
// Real zustand store: the provider SUBSCRIBES to isLoggedIn (the F5 race fix),
// so the mock must be reactive — a plain getState object cannot be called as a
// hook and could never exercise the hydration flip.
vi.mock('@/store/authStore', async () => {
  const { create } = await import('zustand');
  return { useAuthStore: create(() => ({ isLoggedIn: true })) };
});
import { useAuthStore } from '@/store/authStore';

const mockAccountPermissions = vi.fn<[], Promise<string[]>>();
const mockUserPermissions = vi.fn<[], Promise<string[]>>();

// Deliberately omits `pipelines.read`: a key that is granted but absent from the
// catalog is denied only while the catalog is loaded, which is how the CRM-494
// examples below tell a loaded catalog from the null one.
const resourceActionsPayload = {
  data: {
    all_permissions: [
      { key: 'contacts.read', display_name: 'Contacts - Read' },
      { key: 'installation_configs.manage', display_name: 'Installation Configs - Manage' },
    ],
  },
};

const mockResourceActions = vi.fn(() => Promise.resolve(resourceActionsPayload));

vi.mock('@/services/permissions', () => ({
  permissionsService: {
    getResourceActions: () => mockResourceActions(),
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
    useAuthStore.setState({ isLoggedIn: true });
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

// CRM-494. In the embedded shell the provider mounts before the session is
// restored, and nothing holds the tree back while it is: the reset to `pending`
// arrived a commit late and the "no user yet" early-returns stamped `loaded` over
// lists no request had ever asked for. `isReady` then answered true over two empty
// arrays and `can()` read false for every key — a denial the user could only clear
// by leaving the screen and coming back.
describe('PermissionsContext — an unfetched list is never ready (CRM-494)', () => {
  const renders: { isReady: boolean; account: number; user: number }[] = [];
  let consoleError: ReturnType<typeof vi.spyOn>;

  const BootProbe: React.FC = () => {
    const { isReady, accountPermissions, userPermissions, can } = usePermissions();
    renders.push({
      isReady,
      account: accountPermissions.length,
      user: userPermissions.length,
    });
    return (
      <>
        <span data-testid="ready">{String(isReady)}</span>
        {isReady ? (
          <>
            <span data-testid="contacts-read">{String(can('contacts', 'read'))}</span>
            <span data-testid="pipelines-read">{String(can('pipelines', 'read'))}</span>
            <span data-testid="installation-manage">
              {String(can('installation_configs', 'manage'))}
            </span>
            <span data-testid="user-contacts-read">
              {String(can('contacts', 'read', 'user'))}
            </span>
          </>
        ) : null}
      </>
    );
  };

  function tree(blockOnLoadFailure: boolean) {
    return (
      <PermissionsProvider blockOnLoadFailure={blockOnLoadFailure}>
        <BootProbe />
      </PermissionsProvider>
    );
  }

  // Mounts with no user — the state every reload starts from — and only then hands
  // the session over, the way validityCheck() does a few ticks later.
  async function bootThenAuthenticate(
    granted: string[],
    { blockOnLoadFailure = false, userGranted = ['contacts.read'] } = {},
  ) {
    mockUser.mockReturnValue(null);
    const { rerender } = render(tree(blockOnLoadFailure));

    expect(screen.getByTestId('ready').textContent).toBe('false');

    mockUserPermissions.mockResolvedValue(userGranted);
    mockAccountPermissions.mockResolvedValue(granted);
    mockUser.mockReturnValue({ id: 'user-1', name: 'Someone', role: 'agent' });
    rerender(tree(blockOnLoadFailure));

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockResourceActions.mockResolvedValue(resourceActionsPayload);
    renders.length = 0;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('never reports ready while either permission list is still empty', async () => {
    await bootThenAuthenticate(['contacts.read']);

    const premature = renders.filter(r => r.isReady && (r.account === 0 || r.user === 0));
    expect(premature).toEqual([]);
    // Both lists really did fill, so the filter above had something to reject.
    expect(renders.at(-1)).toMatchObject({ isReady: true });
    expect(renders.at(-1)!.account).toBeGreaterThan(0);
    expect(renders.at(-1)!.user).toBeGreaterThan(0);
  });

  it('serves the permission once it arrives, instead of a denial', async () => {
    await bootThenAuthenticate(['contacts.read']);

    expect(screen.getByTestId('contacts-read').textContent).toBe('true');
    expect(screen.getByTestId('user-contacts-read').textContent).toBe('true');
  });

  it('still denies a permission the user does not hold', async () => {
    await bootThenAuthenticate(['contacts.read']);

    // The window closes by waiting for the fetch, not by letting `can()` pass.
    expect(screen.getByTestId('installation-manage').textContent).toBe('false');
  });

  it('keeps rendering the children through the window, not the failure panel', async () => {
    // The shell mounts the provider with the default, so a status stuck at
    // `pending` would show as a blank tree rather than as the panel.
    await bootThenAuthenticate(['contacts.read'], { blockOnLoadFailure: true });

    expect(screen.queryByTestId('permissions-load-failure')).toBeNull();
  });

  it('loads the resource catalog after a reload instead of leaving it null', async () => {
    await bootThenAuthenticate(['contacts.read', 'pipelines.read']);

    expect(mockResourceActions).toHaveBeenCalledTimes(1);
    // Granted, but not in the catalog: a null catalog would accept it.
    expect(screen.getByTestId('pipelines-read').textContent).toBe('false');
  });

  it('refetches the catalog for the next user instead of reusing the previous one', async () => {
    await bootThenAuthenticate(['contacts.read']);
    expect(mockResourceActions).toHaveBeenCalledTimes(1);

    // Unmount before the next user: left mounted, the first provider also sees the
    // new id, resets and refetches its own catalog — a third call that lands or not
    // depending on how far its effects had settled.
    cleanup();
    mockAccountPermissions.mockResolvedValue(['installation_configs.manage']);
    mockUser.mockReturnValue({ id: 'user-2', name: 'Someone Else', role: 'agent' });
    render(tree(false));

    await waitFor(() =>
      expect(screen.getByTestId('installation-manage').textContent).toBe('true'),
    );
    // The second user gets their own catalog, and never sees the first user's grants.
    expect(mockResourceActions).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('contacts-read').textContent).toBe('false');
    const premature = renders.filter(r => r.isReady && (r.account === 0 || r.user === 0));
    expect(premature).toEqual([]);
  });

  it('reports ready with a permissive catalog when the catalog fetch fails', async () => {
    mockResourceActions.mockRejectedValue(new Error('catalog down'));

    await bootThenAuthenticate(['contacts.read', 'pipelines.read']);

    // A failed catalog must not hold every screen hostage; the grant list still
    // decides, so an ungranted key stays denied.
    expect(screen.getByTestId('pipelines-read').textContent).toBe('true');
    expect(screen.getByTestId('installation-manage').textContent).toBe('false');
  });

  it('retries the failed catalog on refreshPermissions instead of staying permissive', async () => {
    mockResourceActions.mockRejectedValueOnce(new Error('catalog down'));
    mockResourceActions.mockResolvedValue(resourceActionsPayload);

    mockUser.mockReturnValue({ id: 'user-1', name: 'Someone', role: 'agent' });
    mockUserPermissions.mockResolvedValue([]);
    mockAccountPermissions.mockResolvedValue(['contacts.read', 'pipelines.read']);
    render(
      <PermissionsProvider blockOnLoadFailure={false}>
        <Probe />
      </PermissionsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));

    fireEvent.click(screen.getByText('retry'));

    await waitFor(() => expect(mockResourceActions).toHaveBeenCalledTimes(2));
  });

  // F5 inside the embed: the bridge delivers `user` BEFORE the auth store
  // hydrates isLoggedIn. CRM-494 already keeps the legs at `pending` there;
  // this pins the OTHER half — the hydration flip must RE-RUN the fetches.
  // With the old getState() snapshot (invisible to React) this test fails on
  // the second expectation: ready stays false forever.
  it('stays pending before hydration, then loads when isLoggedIn flips', async () => {
    const { act } = await import('@testing-library/react');
    useAuthStore.setState({ isLoggedIn: false });
    mockUser.mockReturnValue({ id: 'u1', role: 'agent' });
    mockUserPermissions.mockResolvedValue(['contacts.read']);
    mockAccountPermissions.mockResolvedValue(['contacts.read']);

    render(
      <PermissionsProvider>
        <Probe />
      </PermissionsProvider>,
    );

    expect(screen.getByTestId('ready').textContent).toBe('false');

    await act(async () => {
      useAuthStore.setState({ isLoggedIn: true });
    });

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('contacts-read').textContent).toBe('true');
  });
});
