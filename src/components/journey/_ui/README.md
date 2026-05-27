# Flow Builder Design System (`journey/_ui`)

Scoped design layer for the Flow Builder (React Flow / Journey screen). Delivers tokens + bridge components consumed by Epic 10 downstream stories.

**Card:** EVO-1253
**Scope:** tokens, bridge components, Storybook stories, namespace + Button + Typography + Spacing contracts. **NOT** node modals (owned by EVO-1264).
**Architecture doc:** [`docs/architecture/flow-builder-design-system/architecture.md`](../../../../docs/architecture/flow-builder-design-system/architecture.md) (sibling PRD: [`prd.md`](../../../../docs/architecture/flow-builder-design-system/prd.md))

---

## What lives here

| File / Folder | Owner | Purpose |
|---|---|---|
| `FlowNode/` | EVO-1253 | Bridge component for any node body (5 categories + 4 action subtypes) |
| `FlowCategoryBadge/` | EVO-1253 | Pill badge for category labels (5 variants) |
| `FlowFeedbackBanner/` | EVO-1253 | Inline alert (info / warn / error / success) for use inside panels |
| `index.ts` | EVO-1253 | Top-level barrel — re-exports everything |
| `README.md` | EVO-1253 | This file |

## Where the tokens live

All `--flow-*` and `--color-flow-*` tokens are declared in `src/styles/globals.css` (NOT here). Light values in `:root`, dark overrides in `.dark`, Tailwind v4 indirection in `@theme inline`. The single-source-of-truth rule is intentional — do not fragment into per-folder CSS files.

---

## Namespace conventions

Two related CSS custom property namespaces are exposed by this layer. They look similar by design — treat them as one logical token with two surfaces:

| Namespace | Where declared | Where consumed | Status |
|---|---|---|---|
| `--flow-<surface>-<role>` (raw) | `:root { … }` and `.dark { … }` in `globals.css` | NOT consumed directly. Internal to the indirection. | Internal — do not use in components. |
| `--color-flow-<surface>-<role>` (public) | `@theme inline { … }` in `globals.css`, mapped via `var(--flow-…)` | Tailwind utility classes (`bg-flow-node-trigger-bg`, etc) and `flowTokens` TS export | **Public API — use this everywhere.** |

The split exists because Tailwind v4's `@theme inline` block expects `--color-*` keys to expose utilities. The raw `--flow-*` layer is the "source of truth" that gets overridden by `.dark`; the `--color-flow-*` layer is the indirection that Tailwind reads at compile time.

**Consumer rules:**

- In `className`: use the Tailwind utility (`bg-flow-node-trigger-bg`).
- Outside `className` (inline SVG attrs, Recharts, canvas, dynamic CSS-in-JS): use the `flowTokens` TS object exported from `_ui/`.
- NEVER reference `--flow-*` (raw) from component code — it is implementation detail of the indirection layer and may be renamed without notice.

The `flowTokens` export is typed:

```tsx
import { flowTokens } from '@/components/journey/_ui';

// inline SVG
<rect fill={flowTokens.node.trigger.bg} stroke={flowTokens.node.trigger.border} />

// Recharts (consumes a string color prop)
<Line stroke={flowTokens.edge.active} />

// CSS-in-JS via style prop (avoid in components; reserve for one-off cases)
<div style={{ color: flowTokens.feedback.warn.fg }} />
```

Values are `var(--color-flow-…)` strings — resolution happens at runtime through the cascade, so dark/light switching keeps working without re-render.

---

## Token reference

All tokens use the structured naming `--color-flow-<surface>-<role>`. Roles are restricted to: `bg`, `fg`, `border` (plus canvas / palette / panel surface variants noted inline).

### Node category — 5 categories × {bg, fg, border} × 2 modes

| Category | Hue | Light `bg` / `fg` / `border` | Dark `bg` / `fg` / `border` | Tailwind class prefix |
|---|---|---|---|---|
| trigger | 150 (green) | `oklch(.95 .05 150)` / `oklch(.30 .12 150)` / `oklch(.70 .13 150)` | `oklch(.22 .05 150)` / `oklch(.90 .10 150)` / `oklch(.45 .12 150)` | `bg-flow-node-trigger-*` |
| condition | 85 (amber) | `oklch(.95 .05 85)` / `oklch(.32 .14 85)` / `oklch(.70 .14 85)` | `oklch(.22 .05 85)` / `oklch(.88 .13 85)` / `oklch(.50 .14 85)` | `bg-flow-node-condition-*` |
| control | 40 (orange) | `oklch(.95 .05 40)` / `oklch(.35 .16 40)` / `oklch(.70 .17 40)` | `oklch(.22 .05 40)` / `oklch(.85 .16 40)` / `oklch(.55 .17 40)` | `bg-flow-node-control-*` |
| exit | 25 (red) | `oklch(.95 .04 25)` / `oklch(.35 .18 25)` / `oklch(.65 .18 25)` | `oklch(.22 .05 25)` / `oklch(.85 .16 25)` / `oklch(.55 .18 25)` | `bg-flow-node-exit-*` |

### Action subvariants — 4 subtypes × {bg, fg, border} × 2 modes

| Subtype | Hue | Light `bg` / `fg` / `border` | Dark `bg` / `fg` / `border` | Tailwind class prefix |
|---|---|---|---|---|
| message | 250 (blue) | `oklch(.95 .04 250)` / `oklch(.35 .18 250)` / `oklch(.65 .16 250)` | `oklch(.22 .05 250)` / `oklch(.85 .12 250)` / `oklch(.50 .15 250)` | `bg-flow-node-action-message-*` |
| webhook | 305 (purple) | `oklch(.95 .04 305)` / `oklch(.35 .18 305)` / `oklch(.65 .16 305)` | `oklch(.22 .05 305)` / `oklch(.85 .13 305)` / `oklch(.50 .18 305)` | `bg-flow-node-action-webhook-*` |
| label | 175 (teal) | `oklch(.95 .04 175)` / `oklch(.32 .12 175)` / `oklch(.65 .13 175)` | `oklch(.22 .04 175)` / `oklch(.88 .10 175)` / `oklch(.50 .11 175)` | `bg-flow-node-action-label-*` |
| pipeline | 350 (pink) | `oklch(.95 .04 350)` / `oklch(.35 .18 350)` / `oklch(.65 .17 350)` | `oklch(.22 .05 350)` / `oklch(.85 .14 350)` / `oklch(.55 .17 350)` | `bg-flow-node-action-pipeline-*` |

### Canvas chrome (3 tokens)

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-flow-canvas-bg` | `oklch(.99 0 0)` | `oklch(.16 0 0)` | Canvas background under React Flow |
| `--color-flow-canvas-grid` | `oklch(.85 0 0)` | `oklch(.30 0 0)` | Dotted grid pattern colour (subtle) |
| `--color-flow-canvas-grid-strong` | `oklch(.75 0 0)` | `oklch(.40 0 0)` | Optional stronger grid for hover / active states |

### Palette panel (3 tokens)

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-flow-palette-bg` | `oklch(.98 0 0)` | `oklch(.17 0 0)` | Palette panel background |
| `--color-flow-palette-surface` | `oklch(.97 0 0)` | `oklch(.20 0 0)` | Card surface inside palette |
| `--color-flow-palette-divider` | `oklch(.90 0 0)` | `oklch(.28 0 0)` | Section dividers |

### Panel chrome (3 tokens — consumed by EVO-1264 `NodeConfigModal`)

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-flow-panel-bg` | `oklch(1 0 0)` | `oklch(.18 0 0)` | Modal body background |
| `--color-flow-panel-header-bg` | `oklch(.97 0 0)` | `oklch(.20 0 0)` | Modal header strip background |
| `--color-flow-panel-divider` | `oklch(.92 0 0)` | `oklch(.28 0 0)` | Header / footer divider |

### Edges (3 tokens)

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-flow-edge-default` | `oklch(.65 0 0)` | `oklch(.55 0 0)` | Neutral connection line |
| `--color-flow-edge-active` | `oklch(.55 .20 250)` | `oklch(.75 .18 250)` | Active / selected connection |
| `--color-flow-edge-error` | `oklch(.55 .22 25)` | `oklch(.65 .22 25)` | Invalid / error connection |

### Feedback banner (4 variants × {bg, fg, border})

| Variant | Light `bg` / `fg` / `border` | Dark `bg` / `fg` / `border` | Tailwind class prefix |
|---|---|---|---|
| info | `oklch(.95 .04 250)` / `oklch(.35 .18 250)` / `oklch(.65 .16 250)` | `oklch(.22 .05 250)` / `oklch(.85 .12 250)` / `oklch(.50 .15 250)` | `bg-flow-feedback-info-*` |
| warn | `oklch(.95 .05 85)` / `oklch(.32 .14 85)` / `oklch(.70 .14 85)` | `oklch(.22 .05 85)` / `oklch(.88 .13 85)` / `oklch(.50 .14 85)` | `bg-flow-feedback-warn-*` |
| error | `oklch(.95 .04 25)` / `oklch(.35 .18 25)` / `oklch(.65 .18 25)` | `oklch(.22 .05 25)` / `oklch(.85 .16 25)` / `oklch(.55 .18 25)` | `bg-flow-feedback-error-*` |
| success | `oklch(.95 .05 150)` / `oklch(.30 .12 150)` / `oklch(.70 .13 150)` | `oklch(.22 .05 150)` / `oklch(.90 .10 150)` / `oklch(.45 .12 150)` | `bg-flow-feedback-success-*` |

---

## Bridge API reference

### `<FlowNode>`

```tsx
import { FlowNode } from '@/components/journey/_ui';

// 4 simple categories
<FlowNode variant="trigger">Trigger node body</FlowNode>
<FlowNode variant="condition">…</FlowNode>
<FlowNode variant="control">…</FlowNode>
<FlowNode variant="exit">…</FlowNode>

// Action with subtype (TS narrows: subtype is REQUIRED when variant="action")
<FlowNode variant="action" subtype="message">Send message</FlowNode>
<FlowNode variant="action" subtype="webhook">…</FlowNode>
<FlowNode variant="action" subtype="label">…</FlowNode>
<FlowNode variant="action" subtype="pipeline">…</FlowNode>
```

**Props:** discriminated union of `variant` + (`subtype` when `variant="action"`), plus all `HTMLAttributes<HTMLDivElement>`. Forwards ref.

**Composition rule:** consumer `className` is appended last so it can override layout, never colour. Use the token classes for colour.

### `<FlowCategoryBadge>`

```tsx
import { FlowCategoryBadge } from '@/components/journey/_ui';

<FlowCategoryBadge variant="trigger">Trigger</FlowCategoryBadge>
<FlowCategoryBadge variant="action">Action</FlowCategoryBadge>
<FlowCategoryBadge variant="condition">Condition</FlowCategoryBadge>
<FlowCategoryBadge variant="control">Control</FlowCategoryBadge>
<FlowCategoryBadge variant="exit">Exit</FlowCategoryBadge>
```

**Props:** `variant: 'trigger' | 'action' | 'condition' | 'control' | 'exit'` + `HTMLAttributes<HTMLSpanElement>`. The `action` variant uses the `message` subtype colour as the canonical category swatch (single colour per category — subtype distinction lives in `<FlowNode>`).

### `<FlowFeedbackBanner>`

```tsx
import { FlowFeedbackBanner } from '@/components/journey/_ui';

<FlowFeedbackBanner variant="info">Informational message</FlowFeedbackBanner>
<FlowFeedbackBanner variant="warn">Heads up — this might cause issues</FlowFeedbackBanner>
<FlowFeedbackBanner variant="error">Action failed</FlowFeedbackBanner>
<FlowFeedbackBanner variant="success">Saved</FlowFeedbackBanner>
```

**Props:** `variant: 'info' | 'warn' | 'error' | 'success'` + `HTMLAttributes<HTMLDivElement>`. ARIA `role` defaults to `'alert'` for `warn` / `error` and `'status'` for `info` / `success`; consumers can override via `role` prop.

---

## Button contract — for Flow Builder modals and panels

EVO-1253 does **not** ship a `<FlowButton>`. The Flow Builder reuses `<Button>` from `@evoapi/design-system` directly. Building a flow-specific button would duplicate the design system without an external consumer (against the promotion criterion below).

**Available `<Button>` API** (from `@evoapi/design-system`):

- `variant`: `default | destructive | outline | secondary | ghost | link`
- `size`: `default | sm | lg | icon`

**Canonical mapping for Flow Builder modals** (matches existing precedent in `src/components/journey/nodes/**`):

| Intent | Variant | Size | Class addition | Use when |
|---|---|---|---|---|
| **Save / primary action** | `default` (no `variant` prop) | `default` | `flex-1 h-10` | Save / Apply / Confirm in modal footer. Always with `disabled={!isValid}` while form is invalid. |
| **Cancel / secondary action** | `outline` | `default` | `flex-1 h-10` | Cancel / Close in modal footer. Pair with Save (flex-1 splits 50/50). |
| **Destructive action** | `destructive` | `default` | `flex-1 h-10` | Delete / Remove / Discard with irreversible effect. |
| **Inline secondary** | `outline` | `sm` | (none — default size class) | Add row / Add condition / Add path inside form content. |
| **Tertiary (low emphasis)** | `ghost` | `default` or `sm` | (varies) | "Learn more" / contextual link inside form. |

**Anti-patterns** to avoid in Flow Builder modals:

- Custom `<button>` element with manual Tailwind classes — always wrap in `<Button>` from design system.
- Inventing a `<FlowButton>` wrapper because the colors don't match — the flow-* tokens belong on the node body / canvas / panel chrome, NOT on standard action buttons. Standard buttons follow the global primary / secondary / destructive semantics.
- Mixing `variant="default"` and `variant="outline"` in the same footer with inconsistent ordering. Convention: Cancel left, Save right (or Save right when the pair is horizontal).

This contract satisfies AC-3 (`<Button>` consistency across Flow Builder modals) without adding new components.

---

## Typography contract — for Flow Builder modals and panels

EVO-1253 does **not** declare new typography tokens. Tailwind v4's built-in `text-*` and `font-*` utilities cover every need the Flow Builder has, and the design system's `<DialogTitle>` and `<Label>` already pick the canonical title and label sizes. Adding `--text-flow-*` tokens would fragment typography for no benefit.

**Canonical scale for Flow Builder modals** (matches existing precedent):

| Role | Classes | Source / example |
|---|---|---|
| **Modal title** | `text-lg leading-none font-semibold` | Automatic when using `<DialogTitle>` from `@evoapi/design-system`. Do not override. |
| **Modal description / subtitle** | `text-sm text-muted-foreground` | Automatic via `<DialogDescription>` from design system. |
| **Section header inside form** | `text-sm font-medium` | Used in `WaitEventConfig`, `RemoveLabelPanel`, `TransferJourneyPanel`, etc. |
| **Form label** | `text-sm font-medium` | `<Label className="text-sm font-medium">` — matches existing pattern. Plain `<Label>` (no size prop) defaults to the same. |
| **Body / form input area** | `text-sm` | Default for descriptions, helper text, body copy in panels. |
| **Inline annotation / meta** | `text-xs` | Small captions, "Optional" hints, count badges. |
| **Inline annotation with emphasis** | `text-xs font-medium` | Status labels, badge text inside the form. |

**Anti-patterns** to avoid:

- Hard-coding font sizes via inline `style={{ fontSize: ... }}` or arbitrary-value Tailwind (`text-[15px]`). Use the named scale above.
- Skipping `<DialogTitle>` / `<DialogDescription>` and rolling your own `<h2>`/`<p>` with custom classes. The design-system primitives encode the contract.
- Using `text-base` (the Tailwind default) for body in modals — the convention here is `text-sm`. Modals are dense; `text-base` looks oversized.

**Spacing scale** is the Tailwind v4 built-in (`p-1 / p-2 / p-3 / p-4 ...` = multiples of `0.25rem` = multiples of 4px). The Flow Builder uses it as-is. Convention from existing panels: header `p-4`, form gap `gap-3` or `gap-4`, footer gap `gap-2`, footer height `h-10`.

This contract satisfies the typography / spacing items in the EVO-1253 in-scope list without new tokens or components.

---

## Visual verification

The card ships a **Storybook 10** environment as the canonical visual reference. Run locally:

```bash
pnpm storybook
# opens http://localhost:6006
```

Story coverage:

- **Flow Builder / Tokens / Overview** — every `--color-flow-*` swatch grouped by surface.
- **Flow Builder / FlowNode** — every variant + every action subtype, plus an `AllVariantsMatrix`.
- **Flow Builder / FlowCategoryBadge** — every variant + every action subtype, plus `AllVariantsRow`.
- **Flow Builder / FlowFeedbackBanner** — every variant, plus a `Stack`.

The toolbar **theme switcher** (light / dark, defaulting to dark) toggles the `.dark` class on `html`, so every story flips through both modes without code changes. The **Accessibility panel** runs `@storybook/addon-a11y` (axe-core in a real browser DOM) — contrast checks here are authoritative.

For static review (no dev server): `pnpm build-storybook` produces a deployable static bundle in `storybook-static/` (gitignored).

---

## WCAG validation

Two complementary checks back AC-1 / AC-2:

1. **Numeric assertion in CI** — `src/components/journey/_ui/tokens.contrast.spec.ts` reads `globals.css` directly, parses every `--flow-*: oklch(...)` declaration in `:root` (light) and `.dark` (dark), and uses `colorjs.io` to compute WCAG 2.1 contrast ratios. The spec asserts the pairs required by the ACs:
   - Body text (≥4.5:1): every `<token>-fg` over its `<token>-bg` (5 node categories + 4 action subtypes + 4 feedback variants in both modes).
   - Graphical objects (≥3:1): every node / action subtype border over canvas-bg, plus the 3 edge colours over canvas-bg.
   - Run with `pnpm test src/components/journey/_ui/tokens.contrast.spec.ts` — 46/46 currently pass.
2. **Visual a11y audit in browser** — Storybook a11y addon's Accessibility panel scans every story's rendered DOM (color-contrast rule explicitly enabled). Run via `pnpm storybook` and click through each story in both modes.

**Intentionally out of scope of the AA assertions** (per WCAG 2.1 scope rules):

- Node `bg` vs Canvas `bg` — visual grouping fill, not a graphical object conveying information. The node's identity comes from its FG text and its border, both still asserted.
- Palette `divider` / Panel `divider` — decorative separators (WCAG 1.4.11 exempts pure decoration).
- Feedback banner `border` vs `bg` — decorative accent; variant is identified by the FG + BG combo.

These advisory ratios are still computed by `tokens.contrast.spec.ts` and visible in the test summary, but they do not fail the build if they slip below 3:1.

---

## PR review checklist

Any PR touching `src/components/journey/`, `src/pages/Customer/Journey/`, or `src/styles/globals.css` (flow-related sections) must answer YES to all of these in the description:

- [ ] If you added a `--color-flow-*` token, is it declared in `globals.css` (not fragmented elsewhere)?
- [ ] If you used a `--color-flow-*` token outside `src/components/journey/` or `src/pages/Customer/Journey/`, did you justify why (and reconsider whether it should be promoted to the design system instead)?
- [ ] If you used a non-flow token (e.g. `--color-primary`) inside `src/components/journey/_ui/`, prefer the corresponding `--color-flow-*` token if one exists.
- [ ] Did you run `pnpm test src/components/journey/_ui` and confirm bridge unit tests stay green?
- [ ] If you changed token hex values, did you visually verify the demo route in BOTH dark and light?

Davidson (or the reviewer) walks this list before approving.

---

## Promotion criterion — when a bridge graduates to `@evoapi/design-system`

A `_ui/` bridge becomes a candidate for promotion to the external `@evoapi/design-system` package ONLY when ALL of these are true:

1. A second feature outside the Flow Builder genuinely needs the same component (not "might be useful one day").
2. The API can be generalised without leaking flow-specific concepts (e.g. node category names) into the public surface.
3. The colour tokens it consumes can be expressed in the design system's existing semantic token vocabulary (or promotable alongside the component).

If 1–3 hold, the promotion is a separate PR against `@evoapi/design-system`, NOT a sneaky pull-up inside another card.

Until then, bridges stay in `journey/_ui/`. "It might be useful" is not a sufficient reason — duplicated component noise in the package is worse than a small wrapper in the consumer repo.

---

## Downstream consumers

These Epic 10 cards consume tokens / bridges from this directory:

| Card | Consumes | Notes |
|---|---|---|
| EVO-1264 [10.11] NodeConfigModal | `--color-flow-panel-*` tokens | ✅ Delivered. Lives at `src/components/journey/shared/NodeConfigModal/` with 3 variants (simple / tabs / disclosure). Consumes `Dialog`, `Tabs`, `Collapsible`, `Button` from `@evoapi/design-system` + flow-panel chrome tokens. See sibling story tree "Flow Builder / NodeConfigModal" in Storybook. |
| EVO-1274 [10.4] Refazer modais | Wraps EVO-1264's `<NodeConfigModal>`, uses `<FlowFeedbackBanner>` for inline alerts | Application work — does not declare new tokens. Formally unblocked since EVO-1264 landed. |
| EVO-1271 [10.6] Trigger Event UX | Uses `<FlowNode variant="trigger">` + tokens |
| EVO-1270 [10.21] Light mode | All token light variants | Audits the rest of the Flow Builder and applies light-mode tokens to existing surfaces. |
| EVO-1269 [10.20] Header refactor | `--color-flow-panel-header-bg`, `--color-flow-panel-divider` + Button contract | ✅ Delivered. Lives at `src/components/journey/shared/JourneyEditorHeader/` — 3-zone layout, ESC shortcut, responsive kebab below 1024px. See sibling story tree "Flow Builder / JourneyEditorHeader" in Storybook. |
| EVO-1268 [10.2] Palette redesign | `--color-flow-palette-*` tokens + `<FlowCategoryBadge>` | Applies tokens to the existing palette panel. |

Downstream PRs should reference this README in their "Linked Issue" / "Validation" sections to make the dependency explicit.
