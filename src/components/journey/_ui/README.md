# Flow Builder Design System (`journey/_ui`)

Scoped design layer for the Flow Builder (React Flow / Journey screen). Delivers tokens + bridge components consumed by Epic 10 downstream stories.

**Card:** EVO-1253
**Scope:** tokens, bridge components, demo route. **NOT** node modals (owned by EVO-1264).
**Architecture doc:** `_evo-output/planning-artifacts/flow-builder-design-system/architecture.md`

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

## Visual verification

The demo route renders every token surface in one place:

```
/dev/flow-design-system
```

Gated by `<AdminRoute>` (authenticated users only). Open it in the browser, toggle dark / light via the CRM header. Use it to:

1. Eyeball every variant in both modes.
2. Validate WCAG AA contrast with the browser axe DevTools extension or Stark.
3. Spot inconsistencies before downstream stories consume the tokens.

`pnpm test src/pages/Customer/Journey/_dev` runs the axe-core structural a11y check (NOT contrast — see caveat below).

---

## WCAG ratio table (validation status)

Contrast ratios must meet WCAG AA: **≥4.5:1 for body text** and **≥3:1 for graphical objects / large text**. The pairs below are pinned for measurement against the demo route.

| Pair | Threshold | How to validate |
|---|---|---|
| Node `bg` × Canvas `bg` | ≥3:1 graphical | Each node must be distinguishable from the canvas. Measure with DevTools axe. |
| Node `fg` × Node `bg` | ≥4.5:1 body | Text on the node body. Measure via the demo route. |
| Node `border` × Canvas `bg` | ≥3:1 graphical | Border perception against canvas. |
| Feedback `fg` × Feedback `bg` | ≥4.5:1 body | Banner text legibility. |
| Edge `default/active/error` × Canvas `bg` | ≥3:1 graphical | Connection lines must be visible. |
| Canvas `grid` × Canvas `bg` | <3:1 (intentional) | Grid is decorative; should NOT compete with content. |

**Caveat:** axe-core running in vitest + jsdom cannot validate contrast (no painting in jsdom). The structural a11y check still catches ARIA / label / role regressions. **Run the axe browser extension against the demo route in both modes before claiming AC-1 / AC-2 closed.** When AC-1 / AC-2 are validated, fill the actual measured ratios into the table above and replace this caveat with the validation evidence.

---

## PR review checklist

Any PR touching `src/components/journey/`, `src/pages/Customer/Journey/`, or `src/styles/globals.css` (flow-related sections) must answer YES to all of these in the description:

- [ ] If you added a `--color-flow-*` token, is it declared in `globals.css` (not fragmented elsewhere)?
- [ ] If you used a `--color-flow-*` token outside `src/components/journey/` or `src/pages/Customer/Journey/`, did you justify why (and reconsider whether it should be promoted to the design system instead)?
- [ ] If you used a non-flow token (e.g. `--color-primary`) inside `src/components/journey/_ui/`, prefer the corresponding `--color-flow-*` token if one exists.
- [ ] Did you run `pnpm test src/components/journey/_ui src/pages/Customer/Journey/_dev` and confirm structural a11y stays green?
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
| EVO-1264 [10.11] NodeConfigModal | `--color-flow-panel-*` tokens | Builds the modal chrome itself; this card supplies the colours. |
| EVO-1274 [10.4] Refazer modais | Wraps EVO-1264's `<NodeConfigModal>`, uses `<FlowFeedbackBanner>` for inline alerts | Application work — does not declare new tokens. |
| EVO-1271 [10.6] Trigger Event UX | Uses `<FlowNode variant="trigger">` + tokens | Plus its own dependency EVO-1261 (event manifesto). |
| EVO-1270 [10.21] Light mode | All token light variants | Audits the rest of the Flow Builder and applies light-mode tokens to existing surfaces. |
| EVO-1269 [10.20] Header refactor | Generic flow tokens (palette / panel) | Consumes for visual consistency, no new tokens needed. |
| EVO-1268 [10.2] Palette redesign | `--color-flow-palette-*` tokens + `<FlowCategoryBadge>` | Applies tokens to the existing palette panel. |

Downstream PRs should reference this README in their "Linked Issue" / "Validation" sections to make the dependency explicit.
