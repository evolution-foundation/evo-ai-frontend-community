import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { usePermissionGatedLoad } from './usePermissionGatedLoad';

// The regression these examples lock: the screens used to latch the permission
// decision on the first render where `isReady` was true, so a verdict that was
// false there — because the grants had not landed yet — told the user he had no
// permission until he remounted the screen by changing menus. The gate now
// follows the verdict, and the false-positive denial has to clear itself.

let ready = false;
let grants: string[] = [];

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => grants.includes(`${resource}.${action}`),
    isReady: ready,
  }),
}));

const load = vi.fn();
const onDenied = vi.fn();

const Screen = ({ resource = 'pipelines' }: { resource?: string }) => {
  usePermissionGatedLoad({ resource, load, onDenied });
  return null;
};

// Re-renders the SAME component instance: every example below has to hold
// without the remount that used to be the only way out of a stuck denial.
const mount = () => {
  const { rerender } = render(<Screen />);
  return (nextReady: boolean, nextGrants: string[]) => {
    ready = nextReady;
    grants = nextGrants;
    rerender(<Screen />);
  };
};

const setPermissions = (nextReady: boolean, nextGrants: string[]) => {
  ready = nextReady;
  grants = nextGrants;
};

describe('usePermissionGatedLoad', () => {
  beforeEach(() => {
    load.mockClear();
    onDenied.mockClear();
    setPermissions(false, []);
  });

  it('loads on its own when the grants land after a denial', () => {
    setPermissions(true, []);
    const update = mount();

    expect(load).not.toHaveBeenCalled();
    expect(onDenied).toHaveBeenCalledTimes(1);

    update(true, ['pipelines.read']);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a real denial once, and never requests', () => {
    setPermissions(true, ['contacts.read']);
    const update = mount();

    update(true, ['contacts.read']);
    update(true, ['contacts.read']);

    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('loads once when the permission is granted from the first render', () => {
    setPermissions(true, ['pipelines.read']);
    const update = mount();

    update(true, ['pipelines.read']);

    expect(load).toHaveBeenCalledTimes(1);
    expect(onDenied).not.toHaveBeenCalled();
  });

  it('stays quiet while the permissions have not settled', () => {
    const update = mount();

    expect(load).not.toHaveBeenCalled();
    expect(onDenied).not.toHaveBeenCalled();

    update(true, ['pipelines.read']);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not reload or deny while a refresh dips through not-ready', () => {
    setPermissions(true, ['pipelines.read']);
    const update = mount();

    update(false, ['pipelines.read']);
    update(true, ['pipelines.read']);

    expect(load).toHaveBeenCalledTimes(1);
    expect(onDenied).not.toHaveBeenCalled();
  });

  it('calls the loader with no arguments, so it reloads from the top', () => {
    setPermissions(true, ['pipelines.read']);
    mount();

    expect(load).toHaveBeenCalledWith();
  });

  it('stays silent on a denial when the screen passes no onDenied', () => {
    setPermissions(true, []);
    const Silent = () => {
      usePermissionGatedLoad({ resource: 'pipelines', load });
      return null;
    };

    expect(() => render(<Silent />)).not.toThrow();
    expect(load).not.toHaveBeenCalled();
  });

  it('re-opens the gate when the resource changes', () => {
    setPermissions(true, ['pipelines.read']);
    const { rerender } = render(<Screen />);

    expect(load).toHaveBeenCalledTimes(1);

    // A screen that swapped its resource key would otherwise keep answering with
    // the previous key's verdict — allowed, and already loaded.
    rerender(<Screen resource="labels" />);

    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);

    grants = ['pipelines.read', 'labels.read'];
    rerender(<Screen resource="labels" />);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('denies again after a revocation, and reloads when the grant comes back', () => {
    setPermissions(true, ['pipelines.read']);
    const update = mount();

    update(true, []);
    expect(onDenied).toHaveBeenCalledTimes(1);

    update(true, ['pipelines.read']);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
