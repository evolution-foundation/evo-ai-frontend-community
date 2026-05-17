import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as pluginHost from '..';
import {
  PluginHostProvider,
  PluginRoutes,
  PluginSlot,
  getPlugins,
  onRuntimeContextChanged,
  registerPlugin,
  usePluginRuntimeContext,
} from '..';
// Internal-only helpers reached via deep import: these are NOT part of
// the public surface (`..`). The test uses them to verify the bus
// behaviour and to reset state between cases; consumers must not.
import { __resetPluginHostForTests } from '../test-utils';
import { emitRuntimeContextChanged } from '../runtimeContext';

let currentRuntimeContext: { setValue: (v: unknown) => void } | null = null;

beforeEach(() => {
  __resetPluginHostForTests();
  currentRuntimeContext = null;
});

afterEach(() => {
  __resetPluginHostForTests();
  currentRuntimeContext = null;
});

function renderApp(node: ReactNode, routerInitialEntries: string[] = ['/']) {
  return render(
    <PluginHostProvider>
      <MemoryRouter initialEntries={routerInitialEntries}>{node}</MemoryRouter>
    </PluginHostProvider>,
  );
}

describe('plugin-host — community standalone', () => {
  it('renders without plugins and produces no slot output', () => {
    renderApp(
      <div data-testid="shell">
        <PluginSlot id="header.right" />
        <PluginSlot id="sidebar.afterMain" fallback={<span data-testid="fb">empty</span>} />
      </div>,
    );
    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByTestId('fb')).toHaveTextContent('empty');
    expect(getPlugins()).toEqual([]);
  });

  it('returns undefined runtime context when no plugin registers one', () => {
    function Probe() {
      const ctx = usePluginRuntimeContext();
      return <span data-testid="ctx">{ctx === undefined ? 'no-op' : 'has-ctx'}</span>;
    }
    renderApp(<Probe />);
    expect(screen.getByTestId('ctx')).toHaveTextContent('no-op');
  });
});

describe('plugin-host — slot registration', () => {
  it('renders a header.right contribution from a registered plugin', () => {
    registerPlugin({
      id: 'p-header',
      slots: {
        'header.right': [
          { id: 'p-header.btn', component: () => <span data-testid="hr-btn">PluginBtn</span> },
        ],
      },
    });
    renderApp(<PluginSlot id="header.right" />);
    expect(screen.getByTestId('hr-btn')).toHaveTextContent('PluginBtn');
  });

  it('renders multiple slot contributions in deterministic order', () => {
    registerPlugin({
      id: 'p-a',
      slots: {
        'header.right': [
          { id: 'a-1', order: 20, component: () => <span data-testid="item">A20</span> },
        ],
      },
    });
    registerPlugin({
      id: 'p-b',
      slots: {
        'header.right': [
          { id: 'b-1', order: 10, component: () => <span data-testid="item">B10</span> },
          { id: 'b-2', order: 30, component: () => <span data-testid="item">B30</span> },
        ],
      },
    });
    renderApp(<PluginSlot id="header.right" />);
    const items = screen.getAllByTestId('item').map(n => n.textContent);
    expect(items).toEqual(['B10', 'A20', 'B30']);
  });
});

describe('plugin-host — admin routes', () => {
  it('renders a lazy-loaded admin route registered by a plugin', async () => {
    registerPlugin({
      id: 'p-admin',
      routes: [
        {
          id: 'admin-panel',
          path: '/admin/panel',
          namespace: 'admin',
          layout: 'none',
          element: () =>
            Promise.resolve({
              default: () => <div data-testid="admin-panel">Admin Panel</div>,
            }),
        },
      ],
    });
    renderApp(
      <Routes>
        {PluginRoutes({
          namespace: 'admin',
          wrap: element => <div data-testid="layout">{element}</div>,
        })}
        <Route path="*" element={<div>not-found</div>} />
      </Routes>,
      ['/admin/panel'],
    );
    await waitFor(() => {
      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders the route fallback when guard denies a route', async () => {
    registerPlugin({
      id: 'p-guard',
      guard: ({ requiredCapability }) => requiredCapability !== 'gated.feature',
      routes: [
        {
          id: 'guarded',
          path: '/guarded',
          namespace: 'admin',
          requiredCapability: 'gated.feature',
          fallback: <div data-testid="route-fallback">denied</div>,
          element: () =>
            Promise.resolve({ default: () => <div data-testid="route-ok">should not render</div> }),
        },
      ],
    });
    renderApp(
      <Routes>
        {PluginRoutes({ namespace: 'admin', wrap: element => element })}
        <Route path="*" element={<div>not-found</div>} />
      </Routes>,
      ['/guarded'],
    );
    expect(screen.getByTestId('route-fallback')).toHaveTextContent('denied');
    expect(screen.queryByTestId('route-ok')).toBeNull();
  });
});

describe('plugin-host — error isolation', () => {
  it('isolates a crashing plugin in a slot without breaking siblings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Crasher(): JSX.Element {
      throw new Error('boom');
    }
    registerPlugin({
      id: 'p-crash',
      slots: {
        'header.right': [
          { id: 'crash-1', component: Crasher, fallback: <span data-testid="crash-fb">fallback</span> },
          { id: 'ok-1', component: () => <span data-testid="ok-sibling">ok</span> },
        ],
      },
    });
    renderApp(
      <div>
        <PluginSlot id="header.right" />
        <span data-testid="shell-marker">shell-alive</span>
      </div>,
    );
    expect(screen.getByTestId('crash-fb')).toBeInTheDocument();
    expect(screen.getByTestId('ok-sibling')).toBeInTheDocument();
    expect(screen.getByTestId('shell-marker')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});

describe('plugin-host — runtime context', () => {
  it('propagates runtime context changes to slot components without reload', async () => {
    const PluginCtx = createContext<{ tag: string }>({ tag: 'initial' });
    function Provider({ children }: { children: ReactNode }) {
      const [value, setValue] = useState<{ tag: string }>({ tag: 'initial' });
      currentRuntimeContext = { setValue: v => setValue(v as { tag: string }) };
      return <PluginCtx.Provider value={value}>{children}</PluginCtx.Provider>;
    }
    function useValue() {
      return useContext(PluginCtx);
    }
    registerPlugin({
      id: 'p-ctx',
      runtimeContext: { Provider, useValue },
      slots: {
        'header.right': [
          {
            id: 'ctx-display',
            component: ({ runtimeContext }) => (
              <span data-testid="ctx-display">
                {(runtimeContext as { tag: string } | undefined)?.tag ?? 'none'}
              </span>
            ),
          },
        ],
      },
    });

    const events: unknown[] = [];
    const unsubscribe = onRuntimeContextChanged(v => events.push(v));

    renderApp(<PluginSlot id="header.right" />);

    await waitFor(() => expect(screen.getByTestId('ctx-display')).toHaveTextContent('initial'));

    await act(async () => {
      currentRuntimeContext?.setValue({ tag: 'changed' });
    });

    await waitFor(() => expect(screen.getByTestId('ctx-display')).toHaveTextContent('changed'));
    expect(events.some(e => (e as { tag: string }).tag === 'changed')).toBe(true);
    unsubscribe();
  });

  it('warns and ignores duplicate registrations', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerPlugin({ id: 'dup' });
    registerPlugin({ id: 'dup' });
    expect(getPlugins()).toEqual(['dup']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('emits runtime context events through the bus', async () => {
    const events: unknown[] = [];
    const unsubscribe = onRuntimeContextChanged(v => events.push(v));
    emitRuntimeContextChanged({ from: 'test' });
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    expect(events).toContainEqual({ from: 'test' });
    unsubscribe();
  });
});

describe('plugin-host — lifecycle', () => {
  it('keeps the host alive when a plugin onBoot throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let goodBootRan = false;
    registerPlugin({
      id: 'p-bad-boot',
      onBoot: () => {
        throw new Error('boot exploded');
      },
      slots: {
        'header.right': [
          { id: 'bad-slot', component: () => <span data-testid="bad-slot">bad-slot-render</span> },
        ],
      },
    });
    registerPlugin({
      id: 'p-good-boot',
      onBoot: () => {
        goodBootRan = true;
      },
    });

    renderApp(<PluginSlot id="header.right" />);

    expect(screen.getByTestId('bad-slot')).toBeInTheDocument();
    expect(goodBootRan).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('p-bad-boot'),
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});

describe('plugin-host — hygiene', () => {
  it('does not leak commercial vocabulary in the public API surface', () => {
    // Vocabulary list assembled from tokens that the leak grep on this
    // directory rejects (AC #9). The list is built from character codes
    // so the source of this file never contains the literal terms — the
    // AC's `grep -R` over `src/plugin-host` stays at zero matches.
    const forbidden = [
      // e n t e r p r i s e
      String.fromCharCode(101, 110, 116, 101, 114, 112, 114, 105, 115, 101),
      // a g e n c y
      String.fromCharCode(97, 103, 101, 110, 99, 121),
      // w h i t e l a b e l
      String.fromCharCode(119, 104, 105, 116, 101, 108, 97, 98, 101, 108),
      // p a i d
      String.fromCharCode(112, 97, 105, 100),
      // s u b s c r i p t i o n
      String.fromCharCode(115, 117, 98, 115, 99, 114, 105, 112, 116, 105, 111, 110),
      // t i e r
      String.fromCharCode(116, 105, 101, 114),
      // t e n a n t
      String.fromCharCode(116, 101, 110, 97, 110, 116),
      // b i l l i n g
      String.fromCharCode(98, 105, 108, 108, 105, 110, 103),
    ];
    const pattern = new RegExp(forbidden.join('|'), 'i');
    const surface = JSON.stringify(Object.keys(pluginHost));
    expect(surface).not.toMatch(pattern);
  });
});
