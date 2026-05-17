# Extension Points

**Contract version:** `2.1.0` (SemVer)

This document is the public contract between `evo-ai-frontend-community`
and any external consumer that wants to plug into it without forking or
patching community source. The authoritative architectural decision
behind this contract is **ADR13 — Extension Points Versioning Strategy**;
the rules below are self-contained.

The community release is fully usable on its own. Every extension point
ships with a working no-op default; a consumer can **replace** the
default implementation of one or more of them without modifying files
under `src/`.

If you are about to change any of the five categories below, read the
[Compatibility Promise](#compatibility-promise) first.

---

## Compatibility Promise

Each extension point is versioned independently and treated as a public
API, with the same backward-compatibility rules as the REST `/v1/*`
endpoints exposed by the backend:

- **Backward compatibility is forever.** Once shipped at a given major,
  the name, signature, default and observable behavior of an extension
  point do not change silently.
- **Breaking changes require a major bump** of the affected extension
  point and of the community release that ships them. **Renaming or
  removing a CSS token declared below is always a major bump.**
- **Deprecation window is at least one minor release.** The old shape
  keeps working alongside the new one, and the deprecated path emits a
  warning via `console.warn`.
- **Additive changes are minor bumps.** Adding a new token, a new
  registry capability or a new namespace.
- **Bug fixes that preserve the contract are patch bumps.**

Bumping one extension point does not bump the others. The single
exception is an **aggregate major bump**: when the contract as a whole
crosses a major boundary (for example, the `1.x` → `2.x` rename of the
extension point vocabulary), every individual point may be republished
at the new major so the document advertises a single, coherent
contract version. Aggregate bumps are explicitly called out in the
[Versioning history](#versioning-history); a per-point minor or patch
bump never triggers an aggregate bump.

---

## Extension points

The five categories below are exposed under the `@evoai/extension-points`
namespace. Sections 1, 2, 4 and 5 ship today; section 3
(`useCapabilityFallback`) is contract-only at v2.1.0 and is implemented
in a follow-up story. The in-tree alias for plugin host imports during
local development is `@/plugin-host`. The `--evo-*` CSS variable prefix
is reserved exclusively for this contract; the rest of the codebase
keeps using its existing shadcn / Tailwind v4 CSS variables
(`--primary`, `--background`, etc.), and those are **not** part of
this contract.

### 1. CSS variable tokens

A small, stable set of CSS custom properties that a consumer may read or
override at runtime to apply visual customization without patching
component code.

**Naming convention:** `--evo-{category}-{name}-{shade?}`. Only the
tokens listed below are part of the contract; any other `--evo-*`
variable that appears in the codebase is private and may change without
notice.

| Token                              | Version | Default                                |
|------------------------------------|---------|----------------------------------------|
| `--evo-color-primary-500`          | `2.0.0` | `#00ffa7`                              |
| `--evo-color-primary-foreground`   | `2.0.0` | `#0b0f14`                              |
| `--evo-color-accent-500`           | `2.0.0` | `#00ffa7`                              |
| `--evo-color-background`           | `2.0.0` | `#0b0f14`                              |
| `--evo-color-foreground`           | `2.0.0` | `#e6f1ec`                              |
| `--evo-font-sans`                  | `2.0.0` | `Inter, system-ui, sans-serif`         |

Override (consumer applies tokens at runtime):

```css
:root[data-consumer="my-consumer"] {
  --evo-color-primary-500: #5b8def;
  --evo-color-primary-foreground: #ffffff;
}
```

**Breaking-change policy.** Renaming or removing any token in the table
above is a major bump. Changing its default is a major bump. Adding a
new token is a minor bump. The contract is the **token names**, not
their values — defaults are documentation, not API.

### 2. Plugin registry

Declarative registry exposed by the community. A consumer registers
plugins through a single function call; the community never mutates a
global. The plugin object is **descriptive**, not imperative: it
declares `id` and lifecycle hooks, and that is it. Anything beyond what
is documented here is private.

```ts
import { registerPlugin, getPlugins } from '@evoai/extension-points';

type Plugin = {
  id: string;          // unique identifier
  onBoot?: () => void; // invoked once when the app finishes booting
};

registerPlugin(plugin: Plugin): void;
getPlugins(): readonly string[];
```

**Default behavior.** `registerPlugin` stores registrations in an
in-memory list and invokes `onBoot` callbacks at the end of app boot.
`getPlugins()` returns the registered `id`s. Re-registering an
existing `id` is idempotent: the second manifest is dropped, a
`console.warn` is logged and `onBoot` is not invoked again. The
community itself registers nothing.

**Extended manifest (v2.1.0+).** The `Plugin` type above is the
minimal shape required by section 2 and remains valid forever. As of
v2.1.0 the registry also accepts the richer `PluginManifest` declared
by [§5 Plugin host runtime](#5-plugin-host-runtime), which adds
optional `providers`, `slots`, `routes`, `navItems`, `guard` and
`runtimeContext` fields. A consumer that does not use the plugin host
keeps writing the v2.0.0 `{ id, onBoot }` shape and is unaffected.

A future evolution that introduces remote / runtime plugin loading
MUST require a signature or allowlist check at the registry level; the
in-memory default is not a vehicle for arbitrary remote code execution
into the user's browser.

Override (consumer registers itself from its entry module):

```ts
import { registerPlugin } from '@evoai/extension-points';

registerPlugin({
  id: 'my-consumer',
  onBoot: () => {
    // consumer-side bootstrapping
  },
});
```

**Breaking-change policy.** Renaming or removing `registerPlugin`,
`getPlugins`, `Plugin.id` or `Plugin.onBoot` is a major bump. Adding new
optional fields to `Plugin` (e.g. additional lifecycle hooks) is a minor
bump.

### 3. `useCapabilityFallback` hook

Hook that lets the community decide whether to render a capability when
no external implementation is installed. It is **not** a licensing
mechanism; it is a fallback used by community components so they can
render sensible defaults regardless of whether a consumer is attached.

**Implementation status (v2.1.0).** The hook signature below is part
of the v2.0.0 contract and is honored by this document, but the
runtime symbols (`useCapabilityFallback` /
`replaceUseCapabilityFallback`) have not yet shipped in `src/`.
Consumers can declare a typings-only dependency on the contract
today; the runtime implementation lands in a follow-up story.
Consumers that need a working capability check at v2.1.0 should use
the `PluginGuard` mechanism documented in [§5 Plugin host
runtime](#5-plugin-host-runtime) instead.

```ts
import { useCapabilityFallback } from '@evoai/extension-points';

function useCapabilityFallback(name: string): boolean;
```

**Default behavior.** Always returns `true`. The community ships with no
capability gating; every capability is considered enabled. The hook
exists so community components can be written once and behave correctly
whether or not a consumer replaces the implementation.

Override (consumer replaces the implementation at module init time):

```ts
import { replaceUseCapabilityFallback } from '@evoai/extension-points';

replaceUseCapabilityFallback((name) => {
  // consumer's own resolution logic
  return true;
});
```

**Breaking-change policy.** Renaming `useCapabilityFallback`,
`replaceUseCapabilityFallback` or changing the return type from
`boolean` is a major bump. Adding optional arguments to the hook is a
minor bump.

### 4. i18n namespace conventions

The frontend uses [i18next](https://www.i18next.com/) with separate
JSON namespaces per feature area. The conventions below define what is
reserved by the community and how a consumer adds its own translations.

**Reserved community namespaces (non-exhaustive, top-level):**
`auth`, `common`, `layout`, `chat`, `contacts`, `agents`, `pipelines`,
`accountSettings`, and the other namespaces shipped under
`src/i18n/locales/<lang>/<namespace>.json`. The community may add
sibling namespaces; existing namespace **keys** follow the same
backward-compatibility rules as any other public API.

**Consumer namespace:** any namespace **not** already shipped by the
community is available to a consumer. A consumer is expected to choose
a single root namespace under its own name (for example
`my-consumer.*`) and keep all its translations under it. Reusing or
overwriting a reserved community namespace is **not** part of the
contract and may break across releases.

**Loading a consumer namespace:** uses the standard i18next API. No
community-specific code is required.

```ts
import i18n from 'i18next';

i18n.addResourceBundle(
  'pt-BR',
  'my-consumer',
  { greeting: 'Olá' },
  /* deep */ true,
  /* overwrite */ false,
);
```

**Breaking-change policy.** Renaming or removing a community namespace
listed above, or renaming a translation key inside it, is a major bump.
Adding new namespaces or new keys is a minor bump.

### 5. Plugin host runtime

**Version:** `2.1.0`

A React runtime that lets a consumer mount providers, slots, routes,
nav items, guards and a runtime-context bridge into the community
shell without forking. The host is no-op when no plugin is registered;
the community release ships with an empty registry, all slots render
their fallback (or nothing) and `usePluginRuntimeContext()` returns
`undefined`.

A consumer wires its contributions via the same `registerPlugin`
function declared in [§2 Plugin registry](#2-plugin-registry); the
`Plugin` argument accepts the richer `PluginManifest` shape declared
below.

**Default behavior.** Empty registry. `PluginSlot` short-circuits to
its `fallback` when the slot has no contributions. `PluginRoutes`
returns an empty array of `<Route>` elements. `PluginGuard` evaluation
returns `false` when a route declares `requiredCapability` /
`requiredRole` but no guard has been registered (deny-by-default —
never silent privilege escalation). `usePluginRuntimeContext()`
returns `undefined`.

#### Slot ids

The nine slot identifiers below are part of the v2.1.0 contract.
Adding a new slot id is a minor bump; renaming or removing one is a
major bump.

| Slot id                | Rendered at                                                |
|------------------------|------------------------------------------------------------|
| `app.providers`        | Wraps the application tree (consumer-supplied providers)   |
| `header.left`          | Left section of the top header (desktop and mobile)        |
| `header.right`         | Right section of the top header (desktop and mobile)       |
| `sidebar.afterMain`    | After the main sidebar nav (desktop and mobile Sheet)      |
| `admin.nav`            | Admin-area navigation                                      |
| `admin.routes`         | Admin-area route container (used via `PluginRoutes`)       |
| `settings.sections`    | User settings page sections                                |
| `dashboard.widgets`    | Dashboard widget grid                                      |
| `notifications.banner` | Top-of-app notification banner                             |

#### Route namespaces

| Namespace  | Default wrapping                                       |
|------------|--------------------------------------------------------|
| `admin`    | `PrivateRoute` + `MainLayout` (or bare when `layout: 'none'`) |
| `customer` | `PrivateRoute` + `CustomerRoute` + `MainLayout`         |
| `public`   | Bare — no layout, no auth guard                        |

#### Public types

```ts
import type {
  PluginManifest,
  PluginSlotContribution,
  PluginSlotComponentProps,
  PluginRoute,
  PluginNavItem,
  PluginProvider,
  PluginGuard,
  PluginGuardArgs,
  PluginRuntimeContextDescriptor,
  RuntimeContextValue,
  RouteNamespace,
  SlotId,
} from '@evoai/extension-points';
import { RUNTIME_CONTEXT_CHANGED_EVENT } from '@evoai/extension-points';

interface PluginManifest {
  id: string;
  onBoot?: () => void;
  providers?: PluginProvider[];
  slots?: Partial<Record<SlotId, PluginSlotContribution[]>>;
  routes?: PluginRoute[];
  navItems?: PluginNavItem[];
  guard?: PluginGuard;
  runtimeContext?: PluginRuntimeContextDescriptor;
}

interface PluginSlotContribution {
  id: string;
  order?: number; // ascending; ties broken by `id.localeCompare`
  component: ComponentType<PluginSlotComponentProps>;
  fallback?: ReactNode;
}

interface PluginSlotComponentProps {
  runtimeContext: RuntimeContextValue;
}

interface PluginRoute {
  id: string;
  path: string;
  namespace?: RouteNamespace; // defaults to 'customer'
  layout?: 'main' | 'none';
  element: () => Promise<{ default: ComponentType }>;
  requiredCapability?: string;
  requiredRole?: string;
  fallback?: ReactNode;
}

interface PluginNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  order?: number;
}

type PluginProvider = ComponentType<{ children: ReactNode }>;

interface PluginGuardArgs {
  requiredCapability?: string;
  requiredRole?: string;
  runtimeContext: RuntimeContextValue;
}

type PluginGuard = (args: PluginGuardArgs) => boolean;

interface PluginRuntimeContextDescriptor {
  Provider: ComponentType<{ children: ReactNode }>;
  useValue: () => RuntimeContextValue;
}

type RuntimeContextValue = unknown;
type RouteNamespace = 'admin' | 'customer' | 'public';
type SlotId =
  | 'app.providers' | 'header.left' | 'header.right'
  | 'sidebar.afterMain' | 'admin.nav' | 'admin.routes'
  | 'settings.sections' | 'dashboard.widgets' | 'notifications.banner';

const RUNTIME_CONTEXT_CHANGED_EVENT: 'runtimeContextChanged';
```

`runtimeContext` is opaque to the host: the registering plugin owns
the shape end-to-end and the host only re-emits a
`runtimeContextChanged` event when the reference returned by
`useValue` changes. Consumers SHOULD treat the value as immutable and
MUST NOT expose mutators through it; if a plugin needs to expose
actions, it does so through its own internal context, not through
`usePluginRuntimeContext`.

**At most one plugin may register a `runtimeContext` descriptor.** The
host resolves the descriptor at registration time (first wins);
subsequent registrations are dropped and a `console.warn` is logged
identifying the plugin that was ignored.

#### Public components

```ts
import {
  PluginHostProvider,
  PluginSlot,
  PluginRoutes,
  PluginErrorBoundary,
  PluginRuntimeContextProvider,
} from '@evoai/extension-points';

<PluginHostProvider>{children}</PluginHostProvider>
<PluginSlot id="header.right" fallback={null} />
PluginRoutes({ namespace: 'admin', wrap: (el, route) => ... }): ReactElement[]
<PluginErrorBoundary pluginId="..." fallback={null}>{children}</PluginErrorBoundary>
<PluginRuntimeContextProvider>{children}</PluginRuntimeContextProvider>
```

**`PluginRoutes` is a plain function, not a component.** It returns an
array of `<Route>` elements that MUST be splatted directly inside a
react-router `<Routes>` parent — react-router walks `<Routes>`
children via `React.Children` and only accepts `<Route>` or
`<Fragment>` nodes. Wrapping `PluginRoutes` in a component breaks
react-router.

**MVP timing constraint for `PluginRoutes`.** The function returns
routes that reflect the registry at call time only. Because it cannot
subscribe to registry updates (`<Routes>` rejects non-`<Route>`
children, so `useSyncExternalStore` cannot be used here), plugins
MUST register before `<AppRouter />` mounts. Hot-registering routes
after the router has mounted is not supported in the MVP and becomes
visible only when the surrounding tree re-renders for some unrelated
reason. In-tree plugins that register at module-init time (the MVP
scope) are unaffected.

#### Public hooks

```ts
import {
  usePluginRoutes,
  usePluginRuntimeContext,
} from '@evoai/extension-points';

function usePluginRoutes(namespace?: RouteNamespace): PluginRoute[];
function usePluginRuntimeContext(): RuntimeContextValue;
```

#### Public registry and helper functions

```ts
import {
  registerPlugin,
  getPlugins,
  getRegisteredPlugins,
  getSlotContributions,
  getRoutes,
  getProviders,
  getGuards,
  getRuntimeContextDescriptor,
  bootAllPlugins,
  subscribe,
  onRuntimeContextChanged,
  evaluateRouteAccess,
} from '@evoai/extension-points';
```

`registerPlugin` accepts the extended `PluginManifest` shape above and
is otherwise unchanged from §2. `subscribe(listener)` returns an
unsubscribe function and is invoked by `PluginSlot` / `usePluginRoutes`
internally. `onRuntimeContextChanged(listener)` lets a non-React
consumer react to context changes off the React tree.

#### Security model

- `emitRuntimeContextChanged` exists in the implementation but is
  **NOT** exported from `@evoai/extension-points`. Any caller of that
  function can dispatch a `runtimeContextChanged` event with an
  arbitrary payload that every listener attached via
  `onRuntimeContextChanged` would react to. Only the internal
  `RuntimeContextBridge` is expected to invoke it. If a consumer
  needs to push context from outside the React tree, register a
  `runtimeContext` descriptor on a plugin manifest instead.
- Every slot contribution is wrapped in a per-contribution
  `PluginErrorBoundary` keyed by contribution `id`. A crash in one
  plugin's component cannot take down sibling contributions, the
  shell, or another plugin's routes.
- `evaluateRouteAccess` defaults to **deny** when the route declares
  a `requiredCapability` or `requiredRole` but no guard has been
  registered, preventing silent privilege escalation when a consumer
  forgets to install its guard.

#### Default behavior summary

- Standalone (no plugin registered): registry is empty;
  `PluginHostProvider` passes children through unchanged;
  `PluginSlot` renders its `fallback` (or nothing) for every slot id;
  `PluginRoutes(...)` returns `[]`; `usePluginRuntimeContext()`
  returns `undefined`; `onRuntimeContextChanged` listeners receive
  nothing.
- Duplicate `registerPlugin({ id })` calls on the same `id` are
  idempotent: the second manifest is dropped, a `console.warn` is
  logged and that manifest's `onBoot` is not invoked.

#### Remote loader

The MVP host loads only in-tree plugins through a synchronous
`registerPlugin(manifest)` call made from the consumer's entry module.
There is no remote fetch, no `eval`, no dynamic `import()` of
arbitrary URLs. The contract a future remote loader MUST satisfy
(origin allowlist, detached signature, SRI, manifest schema
validation, opt-in permission scope, error-boundary isolation) is
recorded in `src/plugin-host/remote-loader.md` in this repository.

**Breaking-change policy.** Renaming or removing any `SlotId`,
`RouteNamespace`, public type, component, hook or function listed
above is a major bump. Changing the arity or shape of an existing
`PluginManifest` field is a major bump. Adding a new slot id,
namespace, hook or optional field is a minor bump. Bug fixes that
preserve the contract are patch bumps.

---

## How to use as a consumer

Each extension point is independently overridable; a consumer picks
only what it needs. The five mini-examples below are intentionally
isolated — combine them as appropriate for the consumer.

Theme tokens:

```css
:root[data-consumer="my-consumer"] {
  --evo-color-primary-500: #5b8def;
}
```

Plugin registration:

```ts
import { registerPlugin } from '@evoai/extension-points';

registerPlugin({ id: 'my-consumer' });
```

Capability fallback override:

```ts
import { replaceUseCapabilityFallback } from '@evoai/extension-points';

replaceUseCapabilityFallback(() => true);
```

i18n bundle:

```ts
import i18n from 'i18next';

i18n.addResourceBundle('pt-BR', 'my-consumer', { greeting: 'Olá' }, true, false);
```

Plugin host registration (slot + route + guard):

```tsx
import { registerPlugin } from '@evoai/extension-points';

registerPlugin({
  id: 'my-consumer',
  slots: {
    'header.right': [
      {
        id: 'my-consumer.header-action',
        component: () => <button>Action</button>,
      },
    ],
  },
  routes: [
    {
      id: 'my-consumer.admin-panel',
      path: '/admin/my-consumer',
      namespace: 'admin',
      element: () => import('./pages/AdminPanel'),
      requiredCapability: 'my-consumer.admin',
      fallback: <div>Not available</div>,
    },
  ],
  guard: ({ requiredCapability }) =>
    requiredCapability === 'my-consumer.admin' ? true : !requiredCapability,
});
```

A consumer is expected to declare the community version range it
supports in its own `package.json` (e.g. a custom `evoCommunityRange`
field), so that incompatible versions can be detected at install time.

---

## Cross-references

- Backend extension points (Ruby on Rails): see
  [`EXTENSION_POINTS.md` in `evo-ai-crm-community`](https://github.com/evolution-foundation/evo-ai-crm-community/blob/develop/EXTENSION_POINTS.md).
- Backend extension points (Go core service): see
  [`EXTENSION_POINTS.md` in `evo-ai-core-service-community`](https://github.com/evolution-foundation/evo-ai-core-service-community/blob/develop/EXTENSION_POINTS.md).
- The architectural decision behind the SemVer-per-extension-point
  strategy is **ADR13 — Extension Points Versioning Strategy**. The ADR
  is maintained in an internal planning workspace and is not checked
  into this repository; the relevant rules from it are restated in the
  [Compatibility Promise](#compatibility-promise) above so this
  document can be read on its own.

---

## Versioning history

- `2.1.0` — Added "Plugin host runtime" category (additive minor
  bump). Extends §2 `Plugin` to accept the new optional fields
  (`providers`, `slots`, `routes`, `navItems`, `guard`,
  `runtimeContext`); the minimal `{ id, onBoot }` shape from v2.0.0
  remains valid. §3 marked as contract-only pending implementation.
  §1 CSS tokens and §4 i18n conventions unchanged.
- `2.0.0` — Renamed `useFeatureFallback` /
  `replaceUseFeatureFallback` to `useCapabilityFallback` /
  `replaceUseCapabilityFallback`. CSS tokens, plugin registry shape
  and i18n conventions are unchanged in shape; their per-token
  versions are bumped to `2.0.0` so the document advertises a single
  aggregate major.
- `1.0.0` — Initial contract.
