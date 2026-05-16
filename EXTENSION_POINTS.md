# Extension Points

**Contract version:** `1.0.0` (SemVer)

This document is the public contract between `evo-ai-frontend-community`
and any external consumer that wants to plug into it without forking or
patching community source. The authoritative architectural decision
behind this contract is **ADR13 — Extension Points Versioning Strategy**;
the rules below are self-contained.

The community release is fully usable on its own. Every extension point
ships with a working no-op default; a consumer can **replace** the
default implementation of one or more of them without modifying files
under `src/`.

If you are about to change any of the four categories below, read the
[Compatibility Promise](#compatibility-promise) first.

---

## Compatibility Promise

Each extension point is versioned independently and treated as a public
API, with the same backward-compatibility rules as the REST `/v1/*`
endpoints exposed by the backend:

- **Backward compatibility is forever.** Once shipped at `v1.0.0`, the
  name, signature, default and observable behavior of an extension
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

Bumping one extension point does not bump the others.

---

## Extension points

The four categories below are exposed under the `@evoai/extension-points`
namespace (delivered as part of the React library in a follow-up
change — until then, this document is the canonical contract). The
`--evo-*` CSS variable prefix is reserved exclusively for this contract;
the rest of the codebase keeps using its existing shadcn / Tailwind v4
CSS variables (`--primary`, `--background`, etc.), and those are
**not** part of this contract.

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
| `--evo-color-primary-500`          | `1.0.0` | `#00ffa7`                              |
| `--evo-color-primary-foreground`   | `1.0.0` | `#0b0f14`                              |
| `--evo-color-accent-500`           | `1.0.0` | `#00ffa7`                              |
| `--evo-color-background`           | `1.0.0` | `#0b0f14`                              |
| `--evo-color-foreground`           | `1.0.0` | `#e6f1ec`                              |
| `--evo-font-sans`                  | `1.0.0` | `Inter, system-ui, sans-serif`         |

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
`getPlugins()` returns the registered `id`s. The community itself
registers nothing.

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

### 3. `useFeatureFallback` hook

Hook that lets the community decide whether to render a feature when no
external gating implementation is installed. It is **not** a licensing
mechanism; it is a fallback used by community components so they can
render sensible defaults regardless of whether a consumer is attached.

```ts
import { useFeatureFallback } from '@evoai/extension-points';

function useFeatureFallback(flag: string): boolean;
```

**Default behavior.** Always returns `true`. The community ships with no
feature gating; every flag is considered enabled. The hook exists so
community components can be written once and behave correctly whether or
not a consumer replaces the implementation.

Override (consumer replaces the implementation at module init time):

```ts
import { replaceUseFeatureFallback } from '@evoai/extension-points';

replaceUseFeatureFallback((flag) => {
  // consumer's own resolution logic
  return true;
});
```

**Breaking-change policy.** Renaming `useFeatureFallback`,
`replaceUseFeatureFallback` or changing the return type from `boolean`
is a major bump. Adding optional arguments to the hook is a minor bump.

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

---

## How to use as a consumer

Each extension point is independently overridable; a consumer picks
only what it needs. The four mini-examples below are intentionally
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

Feature fallback override:

```ts
import { replaceUseFeatureFallback } from '@evoai/extension-points';

replaceUseFeatureFallback(() => true);
```

i18n bundle:

```ts
import i18n from 'i18next';

i18n.addResourceBundle('pt-BR', 'my-consumer', { greeting: 'Olá' }, true, false);
```

A consumer is expected to declare the community version range it
supports in its own `package.json` (e.g. a custom `evoCommunityRange`
field), so that incompatible versions can be detected at install time.

---

## Cross-references

- Backend extension points (Ruby on Rails): see
  [`EXTENSION_POINTS.md` in `evo-ai-crm-community`](https://github.com/evolution-foundation/evo-ai-crm-community/blob/develop/EXTENSION_POINTS.md).
- The architectural decision behind the SemVer-per-extension-point
  strategy is **ADR13 — Extension Points Versioning Strategy**. The ADR
  is maintained in an internal planning workspace and is not checked
  into this repository; the relevant rules from it are restated in the
  [Compatibility Promise](#compatibility-promise) above so this
  document can be read on its own.
