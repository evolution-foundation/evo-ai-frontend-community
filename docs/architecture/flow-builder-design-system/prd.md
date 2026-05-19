---
title: "Flow Builder Design System — PRD"
feature_slug: flow-builder-design-system
linear_issue: EVO-1253
linear_url: https://linear.app/evoai/issue/EVO-1253/100-umbrella-ui-estabelecer-design-system-do-flow-builder
priority: high
module: frontend
source: "Promoted from Linear EVO-1253 description (2026-05-15) under create-architecture workflow Option B"
status: active
unblocks:
  - EVO-1274
  - EVO-1271
  - EVO-1270
  - EVO-1269
  - EVO-1268
  - EVO-1264
---

# Flow Builder Design System — PRD

> Promoted from Linear EVO-1253 description to satisfy the architecture workflow PRD-input gate. The Linear issue remains the canonical source; this file consolidates it plus the architectural framing agreed with Nickolas on 2026-05-19.

## Problem / Motivation

The Flow Builder (Customer Journey screen, `src/pages/Customer/Journey/JourneyFlowEditor.tsx`, built on React Flow) has multiple systemic UI/UX defects with a common root cause: **no design system is applied to flow-specific surfaces**. Discovery for story 8.1 (EVO-1237) surfaced the symptoms:

- **Pain #2 / #3**: black-on-black contrast in the node palette and per-node modals — text and icons fail WCAG AA against the dark canvas background.
- **Pain #5**: each node type renders its own ad-hoc modal layout — no shared header/body/footer pattern, inconsistent button placement, mismatched typography.
- **Pain #8**: light mode is broken across the Flow Builder — canvas grid, node bodies, and edges were styled hard-coded for dark mode.
- **General**: action buttons lack visual hierarchy; feedback (info/warn/error/success) is rendered with inline ad-hoc colors.

The rest of the CRM consumes `@evoapi/design-system@0.0.6` (Button, Modal, Select, Badge, Skeleton, Toaster) for primitives and declares shadcn-style semantic tokens in `src/styles/globals.css` via Tailwind v4 `@theme inline`. None of those tokens or primitives describe flow-specific surfaces (node categories, canvas grid, palette panel), so the journey nodes diverged.

## Proposed Solution

Establish a **scope-restricted Flow Builder design layer** by extending the existing token system locally — without forking or modifying the external `@evoapi/design-system` package — and add a small set of flow-specific bridge components that compose the design system's primitives.

### Architectural framing (confirmed 2026-05-19)

- **Tokens stay local.** New tokens are declared in `src/styles/globals.css` with the `flow-*` namespace (e.g. `--color-flow-node-trigger`, `--color-flow-canvas-grid`). Light and dark variants are declared in the same file using the existing `@custom-variant dark` mechanism — light/dark switching reuses the app-wide toggle for free.
- **No round-trip to the external package.** `@evoapi/design-system` keeps shipping Button, Modal, Select, Badge, etc. Flow-specific bridge components consume those primitives internally. The package is touched only if a primitive bug is discovered during this work or if a component proves reusable beyond the Flow Builder.
- **Bridge components live under `src/components/journey/_ui/`.** Components: `<FlowNode>`, `<FlowCategoryBadge>`, `<FlowFeedbackBanner>` (consumed by EVO-1274 ACs for inline panel alerts). `<NodeConfigModal>` is intentionally **NOT** delivered here — it is owned by sibling card EVO-1264 [10.11], which already specifies 3 variants (simple/tabs/disclosure), focus trap, `dirty` prop, and ARIA semantics. This card delivers the panel chrome tokens that EVO-1264 will consume.
- **Promotion criterion to `@evoapi/design-system`.** A bridge component is promoted only when it is proven useful in ≥1 additional feature outside the Flow Builder. Until then it stays local. This keeps the external package from accumulating flow-shaped APIs.

### Token surfaces (initial set — to be finalized in the architecture decision)

- **Node category colors** (5 categories × {body, border, foreground} = ~15 tokens × 2 modes):
  - `trigger` (green family)
  - `action` (variable by subtype — `action-message`, `action-webhook`, `action-label`, `action-pipeline`, …)
  - `condition` (yellow family)
  - `control` (blue/orange family — split, wait, conditional)
  - `exit` (red family)
- **Canvas chrome**: `--color-flow-canvas-bg`, `--color-flow-canvas-grid`, `--color-flow-canvas-grid-strong`
- **Palette panel**: `--color-flow-palette-bg`, `--color-flow-palette-surface`, `--color-flow-palette-divider`
- **Panel modal chrome** (consumed by EVO-1264's `<NodeConfigModal>`, declared here as the contract): `--color-flow-panel-bg`, `--color-flow-panel-header-bg`, `--color-flow-panel-divider`
- **Edge / connection colors**: `--color-flow-edge-default`, `--color-flow-edge-active`, `--color-flow-edge-error`

### Documentation

Lightweight markdown doc at `src/components/journey/_ui/README.md` (or `docs/flow-design-system.md`) listing every flow token, its semantic intent, light/dark hex pair, and a usage example. Storybook is optional — only add if Storybook is already configured in the repo.

## Why this matters

This is umbrella foundation for the entire Epic 10 (Flow Builder Refactor & Novos Nodes). Six downstream stories are blocked on this work:

- EVO-1274 [10.4], EVO-1271 [10.6], EVO-1270 [10.21], EVO-1269 [10.20], EVO-1268 [10.2], EVO-1264 [10.11]

Each of those stories applies the tokens/components established here to a specific surface (palette, panels, new node types, contrast fixes). Without this card, every downstream story would have to re-decide token names, re-pick palette values, and re-implement modal patterns — guaranteed drift.

The work also remediates two outstanding accessibility defects (Pain #2/#3 WCAG AA contrast, Pain #8 light mode) that are visible to users today.

## Scope

**In scope:**

- Flow-namespaced design tokens declared in `src/styles/globals.css` (dark + light variants).
- Bridge components in `src/components/journey/_ui/`: `<FlowNode>`, `<FlowCategoryBadge>`, `<FlowFeedbackBanner>` — internally consuming `@evoapi/design-system` primitives where applicable. (Panel/modal chrome is sibling card EVO-1264's responsibility.)
- Documentation listing tokens, light/dark hex pairs, and component variants with usage examples (markdown, or Storybook if already wired).
- WCAG AA validation for every body-text / icon color over its intended background, both modes.
- A single demo page (or Storybook story, if Storybook exists) verifying the canvas grid, palette panel, and one node-category swatch in both modes.

**Out of scope:**

- Refactoring any existing flow node or panel component to consume the new tokens. That work belongs to the dependent issues (10.2, 10.4, 10.20, etc.).
- Touching the `@evoapi/design-system` package — no PR upstream, no version bump (see promotion criterion above).
- Adding color variants beyond what the Flow Builder needs (this is **not** a product-wide design system overhaul).
- Modifying the application-wide light/dark toggle (already exists in the CRM header).
- **Delivering `<NodeConfigModal>` / panel chrome component.** Owned by sibling card EVO-1264 [10.11], which already specifies the 3 variants, focus trap, dirty handling, and ARIA. EVO-1253 contributes only the panel chrome tokens it consumes.

## Acceptance Criteria

- [ ] **AC-1 (Pain #2, #3, #5).** Given the new flow tokens are applied, when any Flow Builder component uses a `--color-flow-*` foreground token over its declared background, then the contrast ratio passes WCAG AA (≥4.5:1 for body text, ≥3:1 for large text and graphical objects). Validated by automated check (axe / pa11y) or documented manual ratio table.
- [ ] **AC-2 (Pain #8).** Given the user selects the light theme, when the Flow Builder renders, then every component using `--color-flow-*` tokens preserves legibility at WCAG AA in light mode (same ratio thresholds as AC-1).
- [ ] **AC-3 (Pain #3, #5).** Given panel chrome tokens (`--color-flow-panel-*`) are declared with WCAG-validated values and documented in the README, when consulted by EVO-1264 to build `<NodeConfigModal>`, then header / body / footer / divider colours come from named tokens — not hex literals — guaranteeing visual consistency across the future modal variants.
- [ ] **AC-4.** Given the token documentation exists, when consulted by a developer building a downstream story, then every flow token is listed with its intent, both-mode hex values, and at least one usage example.
- [ ] **AC-5.** Given the bridge components live under `src/components/journey/_ui/`, when imported by a downstream story, then the import succeeds without modifying `@evoapi/design-system` and without bypassing the existing primitives that the bridge wraps.

## Non-functional requirements

- **Accessibility**: WCAG AA contrast for all body text and icons over their backgrounds, in both modes. WCAG AA for graphical objects (node bodies, edges, palette items) on the canvas background.
- **Performance**: no runtime regression in flow canvas render. Tokens are CSS variables — zero JS cost.
- **Maintainability**: the `flow-*` namespace is documented and enforced via convention (no PR adds an unprefixed flow-specific token).
- **i18n**: documentation in English; conversational context stays Portuguese.

## Dependencies

- None upstream. This is umbrella root of the Epic 10 UI refactor.
- Existing infrastructure relied upon: `@evoapi/design-system` (already installed), Tailwind v4 + `@theme inline` (already configured in `globals.css`), `@custom-variant dark` (already declared), light/dark toggle in CRM header (already shipped).

## Success metrics

- Six downstream stories (EVO-1274, EVO-1271, EVO-1270, EVO-1269, EVO-1268, EVO-1264) start without re-deciding token naming or modal structure.
- Zero new PRs against `@evoapi/design-system` are required for this card.
- Accessibility automated check returns zero contrast violations on the Flow Builder route.

## Notes for the architecture step

The decisions to crystallize in `architecture.md`:

1. **Final list of `flow-*` tokens** (categories, hex values per mode, contrast ratios verified).
2. **Bridge component API contracts** — props, variants, what each wraps from `@evoapi/design-system`.
3. **Folder structure** — confirm `src/components/journey/_ui/` vs alternatives (`src/components/ui/flow/`, `src/features/journey/ui/`).
4. **Documentation surface** — markdown only, or also Storybook if already wired.
5. **Promotion rubric** — concrete checklist for "this bridge component is ready to graduate to `@evoapi/design-system`".
6. **WCAG validation tooling** — which check runs in CI (axe-core, pa11y, manual table).
