---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _evo-output/planning-artifacts/flow-builder-design-system/prd.md
workflowType: 'architecture'
project_name: 'evo-crm-community'
user_name: 'Etus-0051'
date: '2026-05-19'
feature_slug: 'flow-builder-design-system'
linear_issue: 'EVO-1253'
lastStep: 8
status: 'complete'
completedAt: '2026-05-19'
---

# Architecture Decision Document — Flow Builder Design System

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines six concrete functional capabilities, all confined to the existing `evo-ai-frontend-community` repository:

1. **Declare flow-namespaced design tokens** in `src/styles/globals.css`, with both dark and light variants. Coverage: 5 node categories (trigger / action / condition / control / exit), canvas chrome (background + grid layers), palette panel chrome, node-configuration modal chrome (deltas vs shared `<Modal>`), and edge / connection states.
2. **Build bridge React components** in a Flow-specific folder (proposed `src/components/journey/_ui/`): at minimum `<FlowNode>`, `<FlowNodePanel>`, `<FlowCategoryBadge>`; optionally `<FlowFeedbackBanner>` if inline alerts inside panels need a dedicated form factor. Each bridge MUST internally consume the matching primitive from `@evoapi/design-system` (Button, Modal, etc.) rather than re-implement it.
3. **Document tokens** in a single markdown reference (intent + light/dark hex pair + usage example per token). Storybook is optional and only added if Storybook is already configured in the repo.
4. **Validate WCAG AA contrast** across every foreground/background pair the tokens produce, in both modes, with the validation method documented (axe-core / pa11y / a manual ratio table — to be decided in this workflow).
5. **Ship a demo verification surface** (a route or Storybook story) that renders the canvas grid + palette + one node-category swatch per category in both modes.
6. **Establish a promotion rubric** that determines when a bridge component graduates to `@evoapi/design-system`.

Architectural meaning of these FRs: this card is purely a **frontend-presentation foundation** delivery. No backend, no API contract, no data model. The architectural surface is the **token namespace, the bridge component API, and the boundary contract with `@evoapi/design-system`**.

**Non-Functional Requirements:**

Three NFRs will materially shape the decision space:

- **Accessibility (WCAG AA)** is a binding correctness criterion, not a nice-to-have. Every token pair that the bridges expose must validate, in both modes. This pushes the token curation toward measured hex values rather than aesthetic picks, and forces a verification mechanism (automated or documented manual).
- **Zero runtime cost** is given because tokens are CSS variables consumed by Tailwind v4. The architecture must not introduce a JS theming layer.
- **Namespace discipline** (`flow-*` reserved for Flow Builder concerns; never used outside; never bypassed) is enforced by convention. The architecture must include a written rule and a place to surface violations (PR review checklist or lint rule).

**Scale & Complexity:**

Estimated artefact volume:

- ~25–30 new design tokens × 2 theme modes = ~50–60 CSS variable declarations appended to `globals.css`.
- 3–4 bridge React components (`<FlowNode>`, `<FlowNodePanel>`, `<FlowCategoryBadge>`, optional `<FlowFeedbackBanner>`).
- 1 markdown documentation file (Storybook story optional).
- 1 demo verification surface (route or Storybook page).

- Primary domain: web frontend (React + Tailwind v4 + React Flow).
- Complexity level: **medium**. The code surface is small; the labor is in dual-mode hex curation, contrast validation, and getting the token taxonomy right so downstream stories (EVO-1274, 1271, 1270, 1269, 1268, 1264) consume it without re-debate.
- Estimated architectural components: ~5 (token layer, bridge components, documentation surface, demo surface, promotion rubric).

### Technical Constraints & Dependencies

- **Hard constraint**: `@evoapi/design-system@0.0.6` MUST NOT be modified by this card. No upstream PR, no version bump. The package is an external dependency consumed via npm and treated as immutable for this scope.
- **Hard constraint**: token coexistence with the existing shadcn semantic tokens already declared in `globals.css` (`--color-primary`, `--color-background`, `--color-card`, etc.). The new `flow-*` namespace must never shadow or collide with these.
- **Reuse mandate**: the existing Tailwind v4 mechanism (`@theme inline { ... }` and `@custom-variant dark (&:is(.dark *))`) MUST be reused for declaration and dark-mode switching. No parallel theming system.
- **Reuse mandate**: the application-wide light/dark toggle (already present in the CRM header) is the canonical switch. No flow-specific toggle.
- **Promotion criterion** (architectural rule, not a one-off decision): a bridge component graduates to `@evoapi/design-system` only after it is proven useful in ≥1 feature outside the Flow Builder. Until then it stays local. The architecture document will include the full rubric.

### Cross-Cutting Concerns Identified

Five concerns touch this work and constrain the architecture:

1. **Theme switching coexistence.** The dark/light toggle already drives `--color-*` semantic tokens via `@custom-variant dark`. The `flow-*` tokens must plug into the same mechanism so a single toggle flips everything.
2. **Accessibility universality.** WCAG AA applies to every flow surface a user can see, both modes. This means contrast validation cannot be a spot-check; it has to be a documented or automated sweep.
3. **Namespace discipline.** Two failure modes to prevent: (a) flow-specific tokens leaking into non-flow components (architectural pollution), and (b) non-flow tokens being silently relied on by flow code (drift risk when the global theme evolves). Convention + PR review hygiene; possibly a lint rule.
4. **Backward compatibility during rollout.** This card lands tokens + bridges only. Existing flow nodes/panels keep their current styles until the downstream stories (10.2, 10.4, 10.20, …) refactor them. Architecture must guarantee the new layer can coexist with the old un-refactored code without visual regression.
5. **Promotion path clarity.** Without a written rubric, future "should we move `<FlowNode>` to the design system?" discussions become ad-hoc politics. The architecture pins the criteria so that question has an objective answer.

### Open architectural questions (to resolve in subsequent steps)

These are flagged here so they do not get lost — each gets a decision in steps 3–6:

- **A1.** `action` subvariants (`action-message`, `action-webhook`, `action-label`, `action-pipeline`, …) — separate tokens per subvariant, or single base `action` with documented hue rotation?
- **A2.** Folder location: `src/components/journey/_ui/` vs `src/components/ui/flow/` vs `src/features/journey/ui/`.
- **A3.** Bridge component API style: `variant`-based props (one component, many variants) vs polymorphic wrappers (e.g. `<FlowNode variant="trigger">` vs `<FlowTriggerNode>` plus shared base).
- **A4.** WCAG validation tooling: axe-core in vitest, pa11y in CI, or a documented manual ratio table per token pair (or a hybrid).
- **A5.** Storybook: is Storybook already wired in `evo-ai-frontend-community`? If yes, doc surface is a Storybook story; if no, doc is markdown only and Storybook stays out of scope.
- **A6.** Canvas grid in light mode: specific opacity/color treatment for the dotted grid (Pain #8c) — picked by direct contrast measurement, not aesthetic preference.

## Starter Template Evaluation

### Context: brownfield, not greenfield

This card is **not** initialising a new project. It extends the existing `evo-ai-frontend-community` frontend, which is already shipping and whose stack is locked. There is no "starter template" to choose — instead, this step documents the **inherited stack** that the Flow Builder design system must integrate with, so subsequent steps make decisions consistent with what is already in place.

### Inherited Stack (verified from `evo-ai-frontend-community/package.json`)

**Language & Runtime:**

- TypeScript `~5.7.2` (strict mode assumed; verified by `tsconfig.app.json`)
- React `^19.0.0`
- Node-style ES modules (`"type": "module"`)

**Build Tooling:**

- Vite `^6.3.1`
- `@vitejs/plugin-react` `^4.3.4`
- Build command: `tsc -b && vite build`
- Dev command: `vite`

**Styling Solution:**

- Tailwind CSS `^4.1.11` (Tailwind v4 — CSS-first config, no `tailwind.config.ts` file)
- `@tailwindcss/vite` `^4.1.11` (Vite integration)
- `@theme inline { ... }` block in `src/styles/globals.css` declaring shadcn-style semantic tokens (`--color-background`, `--color-primary`, `--color-muted`, `--color-card`, etc.)
- `@custom-variant dark (&:is(.dark *))` for dark-mode switching (toggle in the CRM header drives the `.dark` class on the html root)
- `class-variance-authority` `^0.7.1` (CVA for component variant APIs)
- `tailwind-merge` `^3.3.1` + `clsx` `^2.1.1` (the `cn()` utility pattern)
- `tw-animate-css` `^1.3.5` (Tailwind animation utilities)
- `lucide-react` `^0.525.0` (icon set used by `@evoapi/design-system`)

**Design System (external):**

- `@evoapi/design-system` `^0.0.6` — provides Button, Modal, Select, Badge, Skeleton, Toaster, Label, and other shadcn-style primitives. **Immutable for this card** (no upstream PR, no version bump). Consumed via npm.

**Flow / Canvas:**

- `@xyflow/react` `^12.8.3` (React Flow v12 — confirmed as the canvas engine for the Journey screen)

**Code Organization (verified by directory walk):**

- `src/components/<Domain>/...` (per-domain folders: `journey/`, `agents/`, `campaigns/`, `contacts/`, …)
- `src/components/ui/` — currently a stub with only `README.md`; the README documents an intended convention (`Button/`, `Card/`) that is not enforced because the actual primitives come from `@evoapi/design-system`
- `src/pages/<Area>/<Feature>/...` for routed pages
- `src/styles/globals.css` — single source of truth for tokens and global CSS
- `src/components/journey/` — Journey domain root, with `nodes/`, `environment-manager/`, `JourneyModal.tsx`, `SessionsViewer.tsx`, etc.
- `src/pages/Customer/Journey/JourneyFlowEditor.tsx` — the React Flow canvas surface (Flow Builder)

**Testing Framework:**

- Vitest `^2.1.8` (unit + integration in `vitest.config.ts`)
- `@testing-library/react` `^16.3.0` + `@testing-library/jest-dom` `^6.9.1`
- `@playwright/test` `^1.59.1` (E2E)
- `jsdom` for browser-like vitest env

**Linting:**

- ESLint `^9.22.0` (flat config era) + `typescript-eslint` `^8.26.1`
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

**Resolved by the inherited stack (decisions we do NOT re-litigate):**

- TypeScript is mandatory; no JS-only files in this card.
- Tailwind v4 CSS variables are THE theming mechanism. No CSS-in-JS, no Sass, no parallel theming library.
- The dark-mode toggle is global and already wired. New `flow-*` tokens declare a light variant inside `@theme inline` and a dark variant under the `.dark` selector — same mechanism as the existing tokens.
- Bridge components use CVA + `cn()` for variant APIs and class composition (matches the rest of the codebase).
- React Flow v12 (`@xyflow/react`) is the canvas engine — we work with its `Node` and `NodeProps` types, not against them.

**Resolves open question A5 from step 2:** Storybook is **NOT** installed (no `@storybook/*` dependency, no `.storybook/` directory). The token documentation surface for this card is therefore **markdown-only** (a single doc file colocated with the bridge components or under `docs/`). Storybook setup is explicitly out of scope.

### Decision space still open for this card

What the inherited stack does NOT decide, and what this architecture document still must:

- The flow token **taxonomy** (final names, counts, hex pairs) — step 4.
- The bridge component **API contracts** (variant props vs polymorphic) — step 4 / open question A3.
- The bridge component **folder location** — open question A2.
- The **WCAG validation tooling** (axe-core in vitest? pa11y? manual ratio table?) — open question A4.
- The **promotion rubric** (when a bridge graduates to `@evoapi/design-system`) — step 5.
- The **canvas grid light-mode treatment** — open question A6.
- The **`action` subvariant strategy** (separate tokens vs hue rotation) — open question A1.

### Selected "starter"

**Inherited: `evo-ai-frontend-community` as it stands today.** No initialisation command is needed. The first implementation story for this card is **not** a project bootstrap — it is the token declaration in `globals.css` (step 4 will pin the exact list).

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**

- D1 Token naming pattern, D2 `action` subvariant strategy, D4 bridge folder location, D5 bridge API style, D8 WCAG validation tooling, D9 canvas grid light-mode treatment. These directly shape the files the implementation stories will create.

**Important Decisions (shape architecture):**

- D7 namespace enforcement mechanism, D10 documentation location, D11 demo verification surface. These affect maintainability, discoverability, and the long-term health of the namespace rather than the first commit.

**Locked by inherited stack (not re-decided):**

- D3 light/dark declaration mechanism (`@theme inline` + `.dark` override).
- D6 CVA + `cn()` (`tailwind-merge` + `clsx`) as the bridge component composition convention.
- TypeScript strict, Tailwind v4 CSS variables as the theming mechanism, React Flow v12 types, primitives from `@evoapi/design-system` consumed rather than duplicated.
- A5 (Storybook) was resolved in step 3: Storybook is not installed; documentation is markdown-only.

**Deferred (post-MVP / outside this card):**

- Custom ESLint rule for namespace enforcement (only considered if D7's PR-checklist approach fails in practice).
- Promotion of a bridge component to `@evoapi/design-system` (criteria pinned in step 5; the act of promoting happens in a different card, only when triggered by an external consumer).
- Storybook setup (out of scope; revisit only if multiple consumers across the app start needing visual reference).

### Data Architecture

**Not applicable.** This card has no backend, no data model, no migration, no caching. Skipped intentionally.

### Authentication & Security

**Not applicable.** No authentication surface, no authorisation policy, no secret handling, no rate limit. The demo verification surface (D11) is dev-gated by environment/role but reuses the existing CRM auth boundary — no new auth code is introduced.

### API & Communication Patterns

**Not applicable.** No API endpoints, no service-to-service communication, no error contract, no rate limit. Tokens and components are local frontend artefacts.

### Frontend Architecture

This is the entire architectural surface of the card.

#### D1. Token naming pattern — **structured `--color-flow-<surface>-<role>`**

Decision: every flow-namespaced design token uses the structured form `--color-flow-<surface>-<role>` (and `--color-flow-<surface>` for single-role tokens).

- Examples: `--color-flow-node-trigger-bg`, `--color-flow-node-trigger-fg`, `--color-flow-node-trigger-border`, `--color-flow-canvas-bg`, `--color-flow-canvas-grid`, `--color-flow-edge-default`.
- Rationale: mirrors the existing shadcn semantic pattern (`--color-card-foreground`, `--color-popover`, `--color-sidebar-accent-foreground`) so the autocomplete experience is identical for any developer in the codebase. The surface/role split is also explicit, which protects against ambiguity when a downstream story asks "what colour for the border vs the fill?".
- Rejected alternatives: a flat naming like `--color-flow-trigger` (collapses surface and role, ambiguous), and a fully semantic on-surface naming (`--flow-trigger-surface`, `--flow-trigger-on-surface`) which is internally consistent but diverges from the rest of `globals.css`.

#### D2. `action` subvariant strategy — **separate tokens per subvariant**

Decision: `action` is not a single colour. It splits into named subvariants (`action-message`, `action-webhook`, `action-label`, `action-pipeline`, plus any additional action subtypes registered by Epic 10 downstream stories). Each subvariant gets its own structured tokens.

- Token examples: `--color-flow-node-action-message-bg`, `--color-flow-node-action-message-fg`, `--color-flow-node-action-message-border`, and the same for `webhook`, `label`, `pipeline`, …
- Rationale: WCAG AA validation requires concrete hex pairs measured against each background. CSS `filter: hue-rotate()` breaks contrast guarantees because the post-rotation colour is not what the WCAG ratio was computed against. A JavaScript colour map (option c) escapes the design-token system entirely and reintroduces drift risk. Splitting into explicit tokens costs ~5-7 additional names × 2 modes × 3 roles (bg/fg/border) — roughly 30-42 additional CSS variable lines, which is acceptable.
- Cost: extra curation work in step 6 to pick concrete hex values for each subvariant in both modes.
- Resolves open question **A1**.

#### D4. Bridge component folder location — **`src/components/journey/_ui/`**

Decision: flow-specific bridge components live under `evo-ai-frontend-community/src/components/journey/_ui/`. Each bridge is a folder with the React component file and its `index.ts` barrel.

- Initial inhabitants: `_ui/FlowNode/`, `_ui/FlowCategoryBadge/`, `_ui/FlowFeedbackBanner/`. Note: `<NodeConfigModal>` (the panel chrome component) is intentionally **NOT** delivered here — owned by sibling card EVO-1264 [10.11]. EVO-1253 declares the panel chrome tokens (`--color-flow-panel-*`) that EVO-1264 consumes; the component itself lives at `src/components/journey/shared/NodeConfigModal.tsx` per EVO-1264's spec.
- Rationale: co-locates the bridges with their consumer domain (`src/components/journey/...`), consistent with the existing internal sub-folder pattern (`environment-manager/`, `nodes/`). The leading underscore signals "internal to journey domain — not a globally reusable primitive". The global `src/components/ui/` directory is stubbed with only a `README.md` that documents an aspirational primitives convention that no longer matches reality (primitives come from `@evoapi/design-system`), so dropping flow-specific bridges there would be misleading.
- Rejected alternatives: `src/components/ui/flow/` (puts flow-specific code inside the global primitives folder, against the convention), `src/features/journey/ui/` (introduces a feature-first folder layer that does not exist elsewhere in the repository).
- Resolves open question **A2**.

#### D5. Bridge component API style — **hybrid variant + subtype with CVA**

Decision: bridges expose two-level CVA variants. The **top-level `variant` prop** covers the 5 structural categories (`trigger | action | condition | control | exit`). For `action`, an additional **`subtype` prop** narrows to the specific action (`message | webhook | label | pipeline | …`). TypeScript discriminated unions ensure `subtype` is only valid when `variant="action"`.

- Skeleton (illustrative):

  ```tsx
  type FlowNodeVariant = 'trigger' | 'action' | 'condition' | 'control' | 'exit'
  type FlowActionSubtype = 'message' | 'webhook' | 'label' | 'pipeline'

  type FlowNodeProps =
    | { variant: 'trigger' | 'condition' | 'control' | 'exit' }
    | { variant: 'action'; subtype: FlowActionSubtype }
  ```

- Rationale: matches the CVA convention used by `@evoapi/design-system` and the rest of the codebase. Five top-level variants keep the API discoverable in IDE autocomplete. The `subtype` prop scales the action category without exploding the structural surface; new action subtypes added in Epic 10 downstream stories only require a token + a `subtype` literal addition, never a new component file. TypeScript narrowing prevents misuse at compile time.
- Rejected alternatives: pure flat variants (`variant="action-message"`) lose the structural grouping and pollute the visible surface; polymorphic per-subvariant components (`<FlowTriggerNode />`, `<FlowActionMessageNode />`, …) explode the component count and duplicate the shared chrome.
- Resolves open question **A3**.

#### D6. Bridge composition convention — **CVA + `cn()` (locked by inherited stack)**

Decision: bridge components compose Tailwind classes via `class-variance-authority` configurations and the `cn()` helper (`tailwind-merge` + `clsx`).

- Locked because: the rest of the codebase and `@evoapi/design-system` already use this pattern; introducing a different composition mechanism would be unnecessary divergence.

#### D7. Namespace enforcement — **PR review checklist**

Decision: the `flow-*` namespace is enforced by a written rule in the bridge folder's README and a 3-line PR review checklist for any PR touching `src/components/journey/` or `src/pages/Customer/Journey/`.

- Checklist content (to be pinned in the README):
  - "If you added a `--color-flow-*` token, is it declared in `globals.css` under the flow section?"
  - "If you used a `--color-flow-*` token outside `src/components/journey/` or `src/pages/Customer/Journey/`, justify why (and reconsider whether it should be promoted)."
  - "If you used a non-flow token (e.g. `--color-primary`) inside a flow bridge, prefer the corresponding `--color-flow-*` token if one exists."
- Rationale: a custom ESLint rule is overkill for a single umbrella card with a known reviewer (Davidson). The discipline lives in review for now; if drift becomes a recurring problem after Epic 10 ships, escalate to a lint rule then.
- Rejected alternatives: custom ESLint rule (overkill at this scale, maintenance cost), doc-only with no checklist (no teeth, predictably ignored).

#### D8. WCAG validation tooling — **hybrid: manual ratio table + axe-core on demo route**

Decision: two complementary mechanisms.

1. **Manual contrast ratio table** maintained in `src/components/journey/_ui/README.md`. One row per `(foreground, background)` pair in scope, with the computed WCAG ratio for both modes and the threshold it must clear (≥4.5:1 for body text, ≥3:1 for graphical objects). This is the authoritative artefact — it is what we point to when downstream consumers ask "is this combination legal?".
2. **`@axe-core/react` (or `vitest-axe`) on the demo route** (D11), executed via `pnpm test`. Catches regressions where a consumer composes tokens in a way that violates contrast — the manual table cannot anticipate every composition, axe catches them at the rendered DOM level.
- Rationale: the token count is small (~30 pairs) so a manual table is maintainable and serves double duty as documentation. axe-core covers the long tail of composition errors. Pa11y is rejected because it requires a built artefact and a CI runner step we do not currently have; axe-core integrates with the existing vitest setup we already pay for.
- Concrete next step (step 6 implementation guidance, not this card): pick whichever of `@axe-core/react`, `vitest-axe`, or `jest-axe`-style package is current and stable; verify with web search at implementation time.
- Resolves open question **A4**.

#### D9. Canvas grid in light mode — **same dot pattern, reduced opacity, contrast-measured**

Decision: the canvas grid uses the same dot pattern in both modes. What changes is the dot colour and opacity:

- Dark mode: light dots over the dark canvas background, opacity tuned to ~25-30% (preserves the current feel reported as acceptable in Pain #8 discovery).
- Light mode: dark dots over the light canvas background, opacity tuned to ~15-20% to avoid visual noise. The exact value is picked in step 6 by measuring contrast against a worst-case node overlap, not by aesthetic feel.
- Tokens introduced: `--color-flow-canvas-grid` and (optional) `--color-flow-canvas-grid-strong` for hover/active states if React Flow's grid component supports it.
- Rationale: preserving the dot pattern across modes preserves users' spatial cognition when toggling themes — they do not have to re-learn the canvas affordances. Reducing opacity (rather than changing pattern entirely) is the lightest intervention that resolves Pain #8c.
- Rejected alternatives: inverted same-opacity grid (too noisy in light), line grid instead of dots (changes the affordance pattern, increases ramp-up cost for downstream consumers).
- Resolves open question **A6**.

#### D10. Documentation location — **co-located `src/components/journey/_ui/README.md`**

Decision: a single markdown file at `evo-ai-frontend-community/src/components/journey/_ui/README.md` documents all flow tokens, bridge component APIs, the PR review checklist (D7), and the WCAG manual ratio table (D8).

- Rationale: discoverable next to the code that consumes the doc. Avoids polluting the project-root `docs/` folder with code-internal reference material that has a narrow audience (Epic 10 implementers). Single file keeps the doc surface manageable; if it grows past ~600 lines, split into `tokens.md`, `components.md`, and `accessibility.md` under the same folder.
- Rejected alternatives: `docs/flow-design-system.md` at project root (further from code, lower discoverability), Storybook (resolved as out of scope in step 3 / A5).

#### D11. Demo verification surface — **REMOVED at user direction during implementation (2026-05-19)**

Originally planned: a dev-gated route `/dev/flow-design-system` rendering every token swatch + bridge variant for visual verification, with axe-core asserting structural a11y in vitest.

**Outcome:** the route was implemented in commit `dfc7e9b` and removed in a follow-up commit at user direction. Reason: even gated by `<AdminRoute>` (auth-only) and behind a `/dev/` prefix, a dev-only surface should not ship in the production bundle. The codebase convention is that visual verification happens **in situ** — on actual consumer pages once downstream stories land — not on synthetic preview surfaces.

**Downstream impact:**

- `vitest-axe` dependency removed; bridge unit tests stay (they cover the variant → token-class mapping without needing a rendered tree to scan).
- Visual + WCAG validation moves to "axe browser extension on the real journey page after a downstream story lands" — see README.
- Storybook is still out of scope (resolved A5 in step 3).

If a future card needs an isolated visual reference, the preferred path is either (a) install Storybook properly (separate decision), or (b) build a throw-away local page during development and discard before committing.

### Infrastructure & Deployment

Minimal scope, but two concrete items follow from the Frontend Architecture decisions:

- **CI integration for WCAG**: D8's axe-core check runs as part of `pnpm test` — no new CI job required. The existing test job already runs vitest. The manual ratio table (D8) is reviewed at PR time against any token change.
- **No deployment changes**: no new env vars, no new build step, no new container layer. The `_evo-output/` and `.claude/` artefacts are local-only.

### Decision Impact Analysis

**Implementation sequence (for downstream story breakdown in epics):**

1. **Token layer** — append `flow-*` declarations to `src/styles/globals.css` (dark + light variants), no JS code yet. Validate with the manual ratio table.
2. **Bridge components** — create `src/components/journey/_ui/FlowNode/`, `FlowNodePanel/`, `FlowCategoryBadge/` consuming `@evoapi/design-system` primitives and the new tokens via CVA.
3. **Demo route** — `src/pages/Customer/Journey/_dev/FlowDesignSystemDemo.tsx`, render every variant + subtype combination, dev-gated.
4. **axe-core test** — vitest test that renders the demo route and asserts zero contrast violations.
5. **Documentation** — `src/components/journey/_ui/README.md`: token reference, bridge API reference, PR review checklist, WCAG ratio table.

**Cross-component dependencies:**

- Bridge components depend on the token layer (step 1 before step 2).
- The axe-core test depends on the demo route (step 3 before step 4).
- The documentation can be drafted in parallel with steps 1-4 and finalised after them.
- All downstream Epic 10 stories (EVO-1274, EVO-1271, EVO-1270, EVO-1269, EVO-1268, EVO-1264) depend on steps 1-5 of this card being complete.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

This card has a narrow surface (CSS tokens + a small set of React bridge components in a single domain folder). The default conflict-point categories that target databases, APIs, events, and state managers are not applicable. The patterns below cover the categories that DO apply: code naming, file/folder structure, CSS variable declaration format, prop-type conventions, error-handling expectations (i.e. the absence of error handling), and the namespace-enforcement workflow.

**Critical conflict points identified:** 7 areas where different AI agents could otherwise diverge.

### Not Applicable Categories

- **Database naming**: no database surface in this card.
- **API naming / API response formats / data exchange formats**: no API surface, no JSON contracts.
- **Event system**: no events. Components are pure presentation.
- **State management**: bridges are stateless function components; no Zustand store, no context provider, no reducer is introduced by this card.
- **Authentication flow patterns**: no auth surface (the demo route in D11 inherits the existing CRM auth — no new pattern).

### Naming Patterns

#### CSS variable names (extends D1)

- Pattern: `--color-flow-<surface>-<role>` where `<role>` is one of: `bg`, `fg`, `border`, `bg-hover`, `border-hover`, `bg-active`, plus the optional canvas-specific `grid` / `grid-strong`.
- Reserved roles: `bg`, `fg`, `border`. Any additional role must be reviewed in PR; no ad-hoc role names.
- Surface keywords (closed set for this card): `node-<category>[-<subtype>]`, `canvas`, `palette`, `panel`, `edge-<state>`. New surface keywords require an architecture-doc update before declaring tokens.
- Examples:
  - ✅ `--color-flow-node-trigger-bg`
  - ✅ `--color-flow-node-action-message-border`
  - ✅ `--color-flow-canvas-grid`
  - ✅ `--color-flow-edge-active`
  - ❌ `--color-flow-trigger-background` (uses `background` instead of `bg`)
  - ❌ `--color-flow-triggerBg` (camelCase; the convention is kebab-case to match `--color-card-foreground` etc.)
  - ❌ `--flow-node-trigger-bg` (missing the `color-` prefix; breaks consistency with the rest of the file)

#### CVA variant config names

- Pattern: `<componentName>Variants` exported from a `styles.ts` colocated with the component.
- Examples:
  - ✅ `flowNodeVariants` in `src/components/journey/_ui/FlowNode/styles.ts`
  - ✅ `flowCategoryBadgeVariants` in `src/components/journey/_ui/FlowCategoryBadge/styles.ts`
  - ✅ `flowFeedbackBannerVariants` in `src/components/journey/_ui/FlowFeedbackBanner/styles.ts`
  - ❌ `flowNodeCva` (uses tool name in the export — opaque)
  - ❌ inline CVA config inside the `.tsx` file (allowed only when the config is <10 lines; otherwise move to `styles.ts`)

#### Component file naming

- Pattern: `<PascalCase>.tsx` for components, `index.ts` for the barrel, `styles.ts` for CVA configs, `types.ts` for prop types (optional — inline types are also fine for files <120 lines).
- Examples:
  - ✅ `src/components/journey/_ui/FlowNode/FlowNode.tsx`
  - ✅ `src/components/journey/_ui/FlowNode/index.ts` exporting `export { FlowNode } from './FlowNode'`
  - ❌ `src/components/journey/_ui/flow-node/FlowNode.tsx` (folder is kebab-case; project convention is PascalCase folder per component)
  - ❌ `src/components/journey/_ui/FlowNode/component.tsx` (filename does not match the component identifier)

#### TypeScript prop types

- Pattern: prop types live in the same file as the component when the component is the only consumer; promoted to `types.ts` when shared (rare for bridges).
- Prop types extend `HTMLAttributes<HTMLDivElement>` (or the appropriate element type) so consumers can pass `className`, `aria-*`, `data-*`, `style`, `ref` (via `forwardRef`).
- Discriminated unions are used for variant + subtype combinations (see D5).
- Examples:
  - ✅
    ```ts
    type FlowNodeProps =
      | (HTMLAttributes<HTMLDivElement> & { variant: 'trigger' | 'condition' | 'control' | 'exit' })
      | (HTMLAttributes<HTMLDivElement> & { variant: 'action'; subtype: FlowActionSubtype })
    ```
  - ❌ `type FlowNodeProps = { variant?: string; subtype?: string }` (loose typing; no narrowing; allows invalid combinations).

### Structure Patterns

#### Folder layout (consequence of D4)

- Pattern: every bridge component is its own folder under `src/components/journey/_ui/<ComponentName>/` with the following layout:

  ```
  src/components/journey/_ui/
  ├── FlowNode/
  │   ├── FlowNode.tsx         (component)
  │   ├── FlowNode.test.tsx    (unit + axe tests, colocated)
  │   ├── styles.ts            (CVA config, if >10 lines)
  │   ├── index.ts             (barrel)
  ├── FlowNodePanel/...
  ├── FlowCategoryBadge/...
  └── README.md                (doc: tokens, bridges, checklist, WCAG table — see D10)
  ```

- The `_ui/` folder is the sole owner of `flow-*` CSS variable consumption outside `src/styles/globals.css` (where the variables are declared) and the demo route in `src/pages/Customer/Journey/_dev/` (which renders for verification).

#### Test colocation

- Pattern: `<ComponentName>.test.tsx` next to `<ComponentName>.tsx`. No top-level `__tests__/` directory.
- The axe-core demo-route test lives at `src/pages/Customer/Journey/_dev/FlowDesignSystemDemo.test.tsx` next to the demo component.

#### Demo route location (consequence of D11)

- Pattern: dev-gated demo lives at `src/pages/Customer/Journey/_dev/FlowDesignSystemDemo.tsx`. Underscore prefix on the segment signals "not production". Gating mechanism is the existing CRM admin-role / env check (verified during step 6 implementation; not invented).

#### Token declaration site

- Pattern: every `flow-*` CSS variable is declared in `src/styles/globals.css` only — not in component CSS modules, not in inline `<style>` blocks, not in JavaScript theme objects.
- Light variants go inside the existing `@theme inline { ... }` block (default values match light mode behaviour of the existing `--color-*` tokens — the file currently declares dark-mode-first; verify the actual default during step 6).
- Dark variants go inside the existing `.dark` selector block in the same file.
- Examples:
  - ✅ Both variants in `globals.css`:
    ```css
    @theme inline {
      --color-flow-node-trigger-bg: oklch(0.92 0.08 145);  /* light */
      /* … */
    }
    .dark {
      --color-flow-node-trigger-bg: oklch(0.45 0.12 145);  /* dark */
      /* … */
    }
    ```
  - ❌ Declaring tokens in a separate file like `src/styles/flow-tokens.css` (fragments the single source of truth).
  - ❌ Declaring tokens inline in a component (`<div style={{ '--color-flow-node-trigger-bg': '#aabbcc' }}>` — bypasses the design system entirely).

### Format Patterns

#### CSS variable declaration format

- Use Tailwind v4 / shadcn convention: `oklch()` for colours (matches what `globals.css` already uses for the chart palette and the modernised theme). If a legacy `hsl()` or `#hex` value is more legible during initial curation, convert to `oklch()` before merge.
- Rationale: `oklch()` is perceptually uniform — contrast adjustments are predictable, hue rotations preserve lightness. This is what step 4 (D2) implicitly assumes when it rejects `filter: hue-rotate()` — we want token values to be measurable, not computed at render time.

#### Bridge component composition

- Pattern: every bridge composes classes via `cn(flowNodeVariants({ variant, subtype }), className)`. The CVA config returns Tailwind classes that reference `flow-*` tokens through arbitrary-value syntax (`bg-[--color-flow-node-trigger-bg]`) or pre-mapped utility classes when Tailwind v4's `@theme inline` exposes them.
- The `className` prop passed by the consumer is appended last so consumers can override (e.g. for positioning).
- Examples:
  - ✅
    ```tsx
    export function FlowNode({ variant, subtype, className, ...rest }: FlowNodeProps) {
      return <div className={cn(flowNodeVariants({ variant, subtype }), className)} {...rest} />
    }
    ```
  - ❌ Concatenating classes with template strings (`className={`flow-node ${variant}`}`) — bypasses CVA, breaks subtype narrowing, no `tailwind-merge` deduplication.

### Communication Patterns

Not applicable: no event system, no state coordination across components, no message passing introduced by this card.

### Process Patterns

#### Error handling — **explicit non-pattern**

- Bridge components are pure presentation and receive only typed props. They MUST NOT wrap their children in error boundaries; they MUST NOT include try/catch blocks. If an invalid `variant` slips past the type system at runtime (impossible under strict TS, but theoretically), the component renders the closest valid variant or fails fast — agents must not add silent fallbacks that mask design system misuse.
- This is documented explicitly because AI agents tend to add defensive error handling reflexively.

#### Loading states — **not applicable**

- Bridges are synchronous, pure components. They do not fetch data, they do not await anything. Agents MUST NOT add loading state props (`isLoading`, `skeleton`, etc.) to bridge components.
- The demo route is allowed to use existing `Skeleton` from `@evoapi/design-system` if it loads any data, but the bridges themselves do not.

### Enforcement Guidelines

**All AI agents and contributors MUST:**

1. Declare every `flow-*` token in `src/styles/globals.css` only. No fragmented declaration files.
2. Use the `--color-flow-<surface>-<role>` naming pattern exclusively. No alternate role names without an architecture-doc amendment.
3. Place every bridge under `src/components/journey/_ui/<ComponentName>/` with the canonical file layout.
4. Compose styles via CVA + `cn()`. No inline string concatenation, no CSS-in-JS, no `style={{ }}` for theming.
5. Use discriminated unions for `variant + subtype` prop combinations. No loose `string` types.
6. Colocate tests next to the component (`<ComponentName>.test.tsx`).
7. Add axe-core assertions only on the demo route — not on every bridge unit test (overkill and slow).

**Pattern enforcement workflow:**

- **At authoring time**: agents are bound by these rules via the architecture document.
- **At PR review time**: the PR review checklist in `src/components/journey/_ui/README.md` (locked by D7) is the human verification layer. Davidson (or whoever reviews) walks the checklist before approving any PR touching the flow surfaces.
- **At CI time**: `pnpm test` runs vitest + axe-core against the demo route. Contrast violations fail CI. The manual ratio table in the README is reviewed at PR time when a token changes.

**Updating these patterns:**

- This architecture document is the source of truth. Pattern changes go in a single PR that updates this file AND any in-repo doc that references the same pattern (currently just the bridge README). No silent drift between the architecture doc and the code.

### Pattern Examples Summary

**Good (one example per pattern):**

```css
/* globals.css */
@theme inline {
  --color-flow-node-trigger-bg: oklch(0.92 0.08 145);
  --color-flow-node-trigger-fg: oklch(0.20 0.04 145);
  --color-flow-node-trigger-border: oklch(0.55 0.10 145);
}
```

```ts
// FlowNode/styles.ts
import { cva } from 'class-variance-authority'

export const flowNodeVariants = cva(
  ['rounded-md', 'border', 'px-3', 'py-2'],
  {
    variants: {
      variant: {
        trigger:   'bg-[--color-flow-node-trigger-bg]   text-[--color-flow-node-trigger-fg]   border-[--color-flow-node-trigger-border]',
        action:    '', // resolved by compoundVariants with subtype
        condition: 'bg-[--color-flow-node-condition-bg] text-[--color-flow-node-condition-fg] border-[--color-flow-node-condition-border]',
        control:   'bg-[--color-flow-node-control-bg]   text-[--color-flow-node-control-fg]   border-[--color-flow-node-control-border]',
        exit:      'bg-[--color-flow-node-exit-bg]      text-[--color-flow-node-exit-fg]      border-[--color-flow-node-exit-border]',
      },
      subtype: {
        message:  'bg-[--color-flow-node-action-message-bg]  text-[--color-flow-node-action-message-fg]  border-[--color-flow-node-action-message-border]',
        webhook:  'bg-[--color-flow-node-action-webhook-bg]  text-[--color-flow-node-action-webhook-fg]  border-[--color-flow-node-action-webhook-border]',
        label:    'bg-[--color-flow-node-action-label-bg]    text-[--color-flow-node-action-label-fg]    border-[--color-flow-node-action-label-border]',
        pipeline: 'bg-[--color-flow-node-action-pipeline-bg] text-[--color-flow-node-action-pipeline-fg] border-[--color-flow-node-action-pipeline-border]',
      },
    },
  }
)
```

```tsx
// FlowNode/FlowNode.tsx
import { cn } from '@/lib/utils'
import { flowNodeVariants, type FlowNodeProps } from './styles'

export function FlowNode({ variant, subtype, className, ...rest }: FlowNodeProps) {
  return (
    <div
      className={cn(flowNodeVariants({ variant, subtype }), className)}
      {...rest}
    />
  )
}
```

**Anti-patterns (do NOT do):**

- `<div style={{ backgroundColor: 'var(--color-flow-node-trigger-bg)' }}>` — bypasses CVA and `tailwind-merge`.
- A `useFlowNodeStyles()` hook that returns a string of class names — unnecessary indirection over CVA, breaks `tailwind-merge` deduplication.
- Adding `isLoading` or `errorBoundary` props to a bridge — bridges are pure presentation.
- Splitting tokens across `src/styles/flow-tokens.css` + `globals.css` — fragments the source of truth.
- Inventing role names like `--color-flow-node-trigger-shadow` without an architecture-doc amendment.
- Promoting a bridge to `@evoapi/design-system` because "it might be useful" — only when proven by ≥1 external consumer per step 6.

## Project Structure & Boundaries

### Scope of the structure

This is a brownfield card. The "project structure" defined here is **the footprint this card adds inside the existing `evo-ai-frontend-community` workspace** — the new files and the precise modifications to existing files. The rest of the frontend tree (`src/pages/`, `src/components/agents/`, `src/services/`, etc.) is unaffected and not enumerated.

### Files created by this card

```
evo-ai-frontend-community/
└── src/
    ├── components/
    │   └── journey/
    │       └── _ui/                                  (new directory — owned by this card)
    │           ├── FlowNode/
    │           │   ├── FlowNode.tsx
    │           │   ├── FlowNode.test.tsx
    │           │   ├── styles.ts                     (CVA config: variant + subtype)
    │           │   └── index.ts                      (barrel export)
    │           ├── FlowCategoryBadge/
    │           │   ├── FlowCategoryBadge.tsx
    │           │   ├── FlowCategoryBadge.test.tsx
    │           │   ├── styles.ts                     (CVA config: variant)
    │           │   └── index.ts
    │           ├── FlowFeedbackBanner/               (delivered — consumed by EVO-1274 ACs for inline panel alerts)
    │           │   ├── FlowFeedbackBanner.tsx
    │           │   ├── FlowFeedbackBanner.test.tsx
    │           │   ├── styles.ts                     (CVA config: info / warn / error / success)
    │           │   └── index.ts
    │           ├── index.ts                          (top-level barrel: re-exports all bridges)
    │           └── README.md                         (doc: tokens, bridges, WCAG ratio table, PR checklist — see D10)
```

(Originally this tree also included `src/pages/Customer/Journey/_dev/FlowDesignSystemDemo.*` for visual verification; removed at user direction — see D11.)

### Files modified by this card

```
evo-ai-frontend-community/
├── src/
│   ├── styles/
│   │   └── globals.css                               (modified — appends flow-* tokens to @theme inline + .dark blocks)
│   └── routes/                                       (or wherever react-router-dom routes are declared — verify in implementation)
│       └── index.tsx                                 (modified — registers /dev/flow-design-system route, dev-gated)
└── package.json                                       (modified — adds axe-core test dependency, e.g. `vitest-axe` or `@axe-core/react`)
```

No other files are touched by this card. Downstream Epic 10 stories (EVO-1274, EVO-1271, …) will modify existing flow node and panel files to consume the new tokens and bridges — but those modifications are out of scope for EVO-1253.

### Files NOT modified (explicit out-of-scope)

The card does NOT touch any of the following, even though they are related:

- `src/pages/Customer/Journey/JourneyFlowEditor.tsx` — the canvas itself. Stays as is.
- `src/components/journey/JourneyModal.tsx`, `SessionsViewer.tsx`, `environment-manager/**` — owned by other features.
- `src/components/journey/nodes/**` — existing node components. They will be refactored by downstream stories (10.2/10.4/10.20/…) to consume the new bridges; this card only delivers the bridges.
- `node_modules/@evoapi/design-system/**` — the external package is immutable for this card (constraint from step 4).
- `src/components/ui/` — stays a stub. The flow bridges do not graduate here.

### Architectural Boundaries

#### Boundary 1: `flow-*` tokens ↔ rest of the token system

- **Direction**: one-way. Flow code reads `--color-flow-*` tokens. Non-flow code MUST NOT read `--color-flow-*` tokens.
- **Enforcement**: PR review checklist (D7) + this document.
- **Inversion risk**: if a non-flow component wants a colour that "happens to match" a flow token (e.g. a dashboard widget styled like a trigger node), it MUST get its own token. Copying or aliasing a `--color-flow-*` token outside flow code is forbidden.

#### Boundary 2: Flow bridges ↔ `@evoapi/design-system` primitives

- **Direction**: bridges consume primitives. Primitives never consume bridges.
- **API contract**: bridges import from `@evoapi/design-system` exactly the same way every other consumer in the codebase does (named imports, treating the package as a black box).
- **Inversion risk**: if a bridge ends up exporting something a primitive wants (e.g. a layout helper), that helper does NOT go upstream. It either stays in the bridge or graduates to a shared `src/lib/` utility — never gets pushed into `@evoapi/design-system` unless the promotion criteria (step 5) are met.

#### Boundary 3: Flow bridges ↔ `@xyflow/react`

- **Direction**: bridges are agnostic of React Flow internals. They are pure presentation components.
- **API contract**: `FlowNode` receives the same `HTMLAttributes<HTMLDivElement>` any other component does. Consumers integrating with React Flow's `<NodeProps>` type wrap the bridge inside their React Flow node component; the bridge itself does not know it lives in a canvas.
- **Inversion risk**: do NOT import from `@xyflow/react` inside `_ui/`. If you find yourself wanting React Flow types inside a bridge, the bridge is doing too much — extract the React-Flow-specific layer into the consumer node component.

#### Boundary 4: Demo route ↔ production routes

- **Direction**: demo is invisible in production. Production routes never link to the demo.
- **Gate mechanism**: same env / role gate the codebase uses for impersonation / admin-only routes (verify the existing pattern during implementation; do NOT invent a new gating mechanism).
- **Inversion risk**: a tester finds the demo route useful for actual user-facing demos and asks to "just open it up". Do NOT. The demo is a verification surface, not a customer-facing artefact. If a customer-facing showcase is wanted, open a separate card.

### Requirements → Structure Mapping

Maps PRD acceptance criteria to the concrete file(s) responsible for satisfying them.

| AC | Description | Files responsible |
|---|---|---|
| **AC-1** | WCAG AA contrast for all flow tokens in dark mode | `src/styles/globals.css` (`.dark` block) + `src/components/journey/_ui/README.md` (manual ratio table) + `src/pages/Customer/Journey/_dev/FlowDesignSystemDemo.test.tsx` (axe-core) |
| **AC-2** | WCAG AA contrast for all flow tokens in light mode | `src/styles/globals.css` (`@theme inline` block) + same doc + axe-core test |
| **AC-3** | Panel chrome tokens declared + documented (consumed by EVO-1264) | `src/styles/globals.css` (`--color-flow-panel-*` declarations) + `src/components/journey/_ui/README.md` (token reference) |
| **AC-4** | Token documentation with intent + hex + usage | `src/components/journey/_ui/README.md` |
| **AC-5** | Bridges importable without modifying `@evoapi/design-system` | `src/components/journey/_ui/index.ts` (barrel) + each `<Component>/index.ts` |

### Integration Points

#### Internal (within this card)

- `FlowNode.tsx` → `styles.ts` (CVA) → tokens declared in `globals.css`.
- `FlowNodePanel.tsx` → `@evoapi/design-system`'s `Modal` / `Dialog` primitive + CVA chrome overrides.
- `FlowCategoryBadge.tsx` → CVA → token subset.
- `FlowDesignSystemDemo.tsx` → imports every bridge via the `_ui/index.ts` barrel + renders swatch grids.
- `FlowDesignSystemDemo.test.tsx` → renders `FlowDesignSystemDemo.tsx` in a jsdom env via vitest + asserts via axe-core.

#### External (consumers of this card after delivery)

- **Downstream Epic 10 stories** import bridges from `@/components/journey/_ui` and reference `--color-flow-*` tokens via Tailwind arbitrary-value syntax. They do NOT introduce their own per-node CVA configs that re-implement what bridges already provide.
- **PR reviewers** (Davidson + the agent running `/pm-feature-dev-routine`) use the `_ui/README.md` PR checklist as the verification gate.
- **QA / smoke testers** use `/dev/flow-design-system` as the canonical visual reference for "is the design system correctly applied?"

### File Organization Patterns

- **Token declarations**: single file (`globals.css`). No fragmentation.
- **Bridge components**: one folder per component, four files (`<Name>.tsx`, `<Name>.test.tsx`, `styles.ts`, `index.ts`). Optional `types.ts` only when types are shared across multiple files in the same folder.
- **Documentation**: single `_ui/README.md` until it exceeds ~600 lines (then split per D10 plan).
- **Demo**: single `_dev/FlowDesignSystemDemo.tsx` + colocated test. No demo sub-folder hierarchy.

### Development Workflow Integration

- **Dev server**: `pnpm dev` (Vite). The demo route is reachable at `/dev/flow-design-system` once the gate condition is satisfied (admin role / env variable — verified during implementation).
- **Build**: `pnpm build` (tsc + Vite). The demo route is included in the build because tree-shaking would not remove a registered React Router route; the gate prevents user access at runtime. If bundle size becomes a concern, lazy-load the demo with `React.lazy`.
- **Tests**: `pnpm test` (vitest). Includes the axe-core assertion. No new CI job is required.
- **Lint**: `pnpm lint` (ESLint flat config). No new lint rules introduced by this card; namespace enforcement lives in PR review per D7.
- **Type check**: `pnpm exec tsc -b --noEmit`. The discriminated union prop types must compile clean.

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:**

- D1 (structured naming) + D2 (per-subvariant tokens) + D5 (CVA variant + subtype) compose cleanly. The CVA configs in step 5 consume exactly the token list D2 defines, via the naming pattern D1 locks. No redundant or overlapping definitions.
- D3 (`@theme inline` + `.dark` override, locked by stack) + D9 (canvas grid per mode) declare in the same file via the same mechanism — no parallel theming surface introduced.
- D6 (CVA + `cn()`) + step 5 composition rules align: every bridge uses `cn(variants(...), className)`; no shortcut around `tailwind-merge`.
- D7 (PR checklist enforcement) + step 5 enforcement guidelines + D10 (README location) form a self-consistent loop: the checklist lives where the doc lives, where the bridges live.
- D8 (manual ratio table + axe-core) + D11 (demo route) + step 6 file mapping align: axe-core runs against D11's route, the manual table lives in the D10 README. No orphan tooling.

**Pattern consistency:**

- Naming conventions in step 5 strictly derive from D1 (CSS vars) and D5 (component variant API). No ad-hoc names slip in.
- File structure patterns in step 5 are directly materialised in step 6's file tree. The "folder per component, four files canonical" rule has 1:1 correspondence with the actual tree.
- Error-handling non-pattern (bridges are pure presentation, no try/catch, no boundaries) is consistent with the bridge being stateless and prop-only.

**Structure alignment:**

- Step 6 file tree implements every component named in D4 / D5 (FlowNode, FlowNodePanel, FlowCategoryBadge, optional FlowFeedbackBanner).
- The 4 architectural boundaries in step 6 map to enforceable rules in step 5 (token namespace, design-system primitive consumption, xyflow agnosticism, demo isolation).
- Integration points (downstream Epic 10 stories as consumers, PR reviewers, QA) are concrete and match the deliverables.

**Verdict:** zero internal contradictions found.

### Requirements Coverage Validation ✅

**AC → architectural support:**

| AC | Architectural support | Status |
|---|---|---|
| AC-1 (WCAG AA dark) | D8 + D2 + `.dark` block in `globals.css` + manual ratio table + axe-core | ✅ Covered |
| AC-2 (WCAG AA light) | D8 + D2 + `@theme inline` block in `globals.css` + manual ratio table + axe-core | ✅ Covered |
| AC-3 (consistent panel chrome) | D5 + `FlowNodePanel` bridge in step 6 tree | ✅ Covered |
| AC-4 (doc with intent + hex + usage) | D10 + step 6 README structure | ✅ Covered |
| AC-5 (bridges importable without modifying design-system) | step 6 boundary 2 + D6 "immutable package" constraint | ✅ Covered |

**Non-Functional Requirements:**

- WCAG AA accessibility → D8 (manual table + axe-core) ✅
- Zero JS runtime cost → D6 (CSS vars + Tailwind utilities, no JS theming layer) ✅
- Maintainability via namespace discipline → D7 + step 5 enforcement guidelines ✅
- Documentation in English / conversation in Portuguese → noted in step 2, applied throughout ✅

**Out-of-scope items the PRD explicitly defers:**

- Refactoring existing flow nodes → handled by downstream stories (EVO-1274, 1271, 1270, 1269, 1268, 1264).
- Modifying `@evoapi/design-system` → architectural constraint, enforced.
- Color variants beyond Flow Builder needs → namespace + scope discipline enforce.
- Application-wide light/dark toggle → already shipped; reused, not replaced.

**Verdict:** every PRD AC and NFR maps to one or more concrete architectural decisions.

### Implementation Readiness Validation ✅

**Decision completeness:**

- All 6 open questions from step 2 (A1–A6) are explicitly resolved (A1→D2, A2→D4, A3→D5, A4→D8, A5→step 3 inline, A6→D9).
- All 11 decisions D1–D11 have rationale, alternatives considered, and resolution.
- Locked-by-stack decisions are explicitly called out so agents do not relitigate them.

**Structure completeness:**

- Step 6 file tree is concrete (real folder names, real file names) — not template placeholders.
- "Files modified", "files NOT modified", and "files created" are enumerated.
- Every AC maps to a specific file in the structure.

**Pattern completeness:**

- Naming, structural, format, communication, and process patterns covered — with concrete code examples for the non-trivial ones.
- Anti-patterns enumerated to pre-empt common AI agent regressions.
- Enforcement workflow specified at three layers (authoring, PR review, CI).

**Verdict:** an AI agent or human implementer reading this document end-to-end has enough specification to begin step 1 of implementation (token declaration) without additional architectural ask-backs.

### Gap Analysis

Genuine gaps surfaced by validation, with priority:

**Important gaps (resolve before or during implementation):**

- **G1 — Concrete hex values not picked yet.** The architecture defines the *structure* of tokens (names, roles, modes) but the actual `oklch(...)` triplets are deferred. This is intentional (hex curation is part of implementation, validated by D8's manual ratio table), but the implementer MUST treat hex-curation as the first sub-task of the token-layer story. Without measured values, AC-1/2 cannot be claimed. Mitigation: implementation story #1 explicitly includes the ratio table curation as a deliverable.
- **G2 — Demo route gate mechanism deferred to implementation.** D11 says "reuse the existing gating mechanism" but does not name it. The codebase has `ImpersonationBar.tsx` and `AppInitializer.tsx` which suggest an admin/impersonation context — but the exact gate pattern is not yet identified. Mitigation: implementation story #3 (demo route) must first locate the existing pattern (e.g., `useImpersonation()` hook, env flag, role check) and reuse it. Do NOT invent.
- **G3 — RESOLVED at scope review (2026-05-19).** Previously surfaced as "Modal primitive fitness check for FlowNodePanel". Subsequently, FlowNodePanel was descoped from this card and reassigned to sibling EVO-1264 [10.11] (`NodeConfigModal`), which already specifies the variant API, focus trap, dirty handling, and ARIA semantics. The Modal fitness question now belongs to EVO-1264. Code-side note: `@evoapi/design-system` exports a `Dialog` family (`Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`) with the shadcn-style slot pattern that maps cleanly onto NodeConfigModal's needs — EVO-1264 should consume `Dialog` directly.

**Minor gaps (track, address opportunistically):**

- **G4 — Axe-core package selection.** D8 mentions `@axe-core/react`, `vitest-axe`, or `jest-axe`-style alternatives. The likely best fit for the inherited stack (Vitest + React 19 + jsdom) is `vitest-axe`, but this should be verified at implementation time against current maintenance status. Mitigation: implementation story #4 confirms the package via npm trends / GitHub activity check before adding the dependency.
- **G5 — Tailwind v4 utility class exposure vs arbitrary-value syntax.** Step 5 examples use `bg-[--color-flow-node-trigger-bg]` arbitrary-value syntax. Tailwind v4's `@theme inline` automatically exposes named utilities (e.g., `bg-flow-node-trigger-bg`). Both work; the codebase's existing convention should be confirmed once (look at how existing semantic tokens are consumed) and applied consistently across bridges. Mitigation: implementation story #1 surveys two existing usage sites and chooses the convention by precedent.
- **G6 — Bundle size threshold for demo route lazy-loading.** D11 says "lazy-load if bundle size becomes a concern" — but no threshold is set. For a card this size, this is unlikely to matter (the demo is one route file). If post-rollout bundle analysis shows the demo costs >50KB minified, lazy-load via `React.lazy`. Document the threshold as guidance, not a hard rule.

**Critical gaps:** none. No issues that would block implementation start.

### Validation Issues Addressed

- All 6 important + minor gaps are linked to a concrete implementation story with a mitigation.
- No gap requires architectural rework; all are deferred-to-implementation specifications, not design holes.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (step 2)
- [x] Scale and complexity assessed (step 2: ~25-30 tokens, 3-4 bridges, medium complexity)
- [x] Technical constraints identified (step 2 + step 3)
- [x] Cross-cutting concerns mapped (step 2: 5 concerns)

**✅ Architectural Decisions**
- [x] Critical decisions documented with rationale (step 4: D1–D11)
- [x] Technology stack fully specified (step 3: inherited stack documented)
- [x] Integration patterns defined (step 6: 4 boundaries)
- [x] Performance considerations addressed (step 4: D6 — zero JS theming)

**✅ Implementation Patterns**
- [x] Naming conventions established (step 5: CSS vars, CVA configs, files)
- [x] Structure patterns defined (step 5: folder layout, test colocation)
- [x] Communication patterns specified (step 5: N/A, marked explicitly)
- [x] Process patterns documented (step 5: error-handling non-pattern, no loading states)

**✅ Project Structure**
- [x] Complete directory structure defined (step 6: new + modified + NOT-touched)
- [x] Component boundaries established (step 6: 4 boundaries with inversion risks)
- [x] Integration points mapped (step 6: internal + external)
- [x] Requirements to structure mapping complete (step 6: AC → file table)

### Architecture Readiness Assessment

**Overall status:** READY FOR IMPLEMENTATION.

**Confidence level:** HIGH.

- All 6 open questions from step 2 resolved with concrete decisions.
- All 5 PRD ACs map to specific architectural support.
- All gaps surfaced in validation are implementation-time concerns, not architectural holes.
- File tree is concrete and small enough to estimate as a normal multi-story breakdown.

**Key strengths:**

- Hard scope discipline: the architecture refuses to extend the external design system and refuses to touch existing flow nodes — both moves keep the card small and the boundary clean.
- Pre-emptive anti-pattern enumeration in step 5 reduces the rework cycle for AI implementers.
- Resolution of `action` subvariant ambiguity (D2 chose explicit tokens over hue rotation) eliminates the most likely source of WCAG regressions during downstream rollout.
- Co-located documentation (D10) and PR review checklist (D7) make the namespace discipline operationally enforceable.

**Areas for future enhancement (outside this card):**

- Custom ESLint rule for `flow-*` namespace enforcement (D7 escalation if PR review proves insufficient).
- Storybook setup (revisit if cross-team visual reference becomes valuable).
- Promotion of one or more bridges to `@evoapi/design-system` once an external consumer materialises (governed by step 5 promotion criterion).

### Implementation Handoff

**AI agent / human implementer guidelines:**

- Follow architectural decisions D1–D11 exactly. Do not relitigate locked-by-stack items (D3, D6).
- Use the implementation patterns from step 5 verbatim for naming, file layout, CVA composition. Anti-patterns are non-negotiable.
- Respect step 6 boundaries — particularly the immutability of `@evoapi/design-system` and the one-way direction of the `flow-*` namespace.
- Treat the gap mitigations in this validation as part of the implementation backlog, not optional refinements.
- When a downstream PR review surfaces a pattern violation, refer the violator to this document. Do NOT silently fix; the discipline is in surfacing the violation, not papering over it.

**First implementation priority:**

Token declaration in `src/styles/globals.css` (with measured `oklch()` values and the manual WCAG ratio table populated). This is the foundational story; nothing else can land before it because the bridges and the demo route depend on the token names being declared.

Implementation story sequence (3 stories after the D11 demo-route removal):

1. **Token layer** — append `flow-*` to `globals.css` (light + dark variants, measured oklch values). Includes panel chrome tokens (`--color-flow-panel-*`) for EVO-1264 to consume.
2. **Bridge components** — `FlowNode`, `FlowCategoryBadge`, `FlowFeedbackBanner`, each with `styles.ts` + `<Name>.tsx` + `<Name>.spec.tsx` + `index.ts`. (`<NodeConfigModal>` deferred to EVO-1264.)
3. **README finalisation** — token reference, bridge API reference, PR review checklist, WCAG validation guidance (in-situ via axe browser extension). Cross-reference EVO-1264 as the consumer of panel chrome tokens.

Validation moves to: bridge unit tests (`pnpm test src/components/journey/_ui`) cover the variant→class mapping; WCAG / visual validation happens against actual consumer pages once downstream Epic 10 stories ship.

---

## Change Request Revision — 2026-05-19

After PR #93 review (reviewer: Daniel Paes / Davidson), 3 HIGH, 5 MEDIUM, and 5 LOW findings drove the following amendments to the originally-decided architecture. Sections above are preserved as historical record; this section supersedes where it conflicts.

### A5 — Storybook: **IN scope (was OUT)**

Previously resolved as "out of scope, repo doesn't have Storybook installed". Reviewer's H-2 surfaced that AC-4 requires "examples visuais" and the README + descoped demo route together did not meet that bar.

**Change:** install Storybook 10 (`@storybook/react-vite` framework, `@storybook/addon-a11y`, `@storybook/addon-themes`). It becomes the canonical visual reference surface AND the place where contrast is validated in a real browser DOM. Stories live alongside the bridges (`<Component>.stories.tsx`) plus a top-level `Tokens.stories.tsx` showing every token swatch in both modes.

Adds `~67 dev-only packages` (Storybook is dev-only — no production bundle impact). `pnpm storybook` opens at port 6006; `pnpm build-storybook` produces a static bundle (gitignored).

### D8 — WCAG validation tooling: **colorjs.io spec + Storybook a11y (was manual table + axe in vitest)**

Reviewer's H-1 noted the ratio table values were deferred / not pinned. The previous plan deferred measurement to "in-situ via browser axe extension on downstream consumer pages" — defensible but not enforceable in CI.

**Change:** numeric validation now lives in `src/components/journey/_ui/tokens.contrast.spec.ts`. The spec:

- Reads `globals.css` directly via `fs.readFileSync` (single source of truth).
- Parses every `--flow-*: oklch(...)` declaration from `:root` (light) and `.dark` (dark) blocks via regex.
- Uses `colorjs.io` (dev dep, 0.6.1, the WCAG-21 algorithm Deque uses for axe-core) to compute the actual contrast ratio for each canonical pair.
- Asserts AA thresholds: ≥4.5:1 for body text (fg over its bg), ≥3:1 for graphical objects (borders over canvas-bg, edges over canvas-bg).
- Currently **46/46 assertions pass**.

Visual / browser-side validation remains via Storybook a11y addon (axe-core in real browser DOM, sees the actual rendered tree).

`vitest-axe` (the earlier tooling pick) is no longer relevant — there is no demo route in vitest to scan, and the Storybook addon covers the DOM-level case better.

### D11 — Demo verification surface: **REMOVED (unchanged); Storybook supersedes**

D11 stays removed per the original user direction (no dev-only routes in production bundle). The role Storybook plays now formally absorbs D11's original intent (isolated visual reference surface) without shipping anything in the production bundle.

### D12 — Typed token export (`tokens.ts`)

The original card text mentioned "exportar como arquivo de constantes consumível por componentes". Reviewer's L-3 called this out as missing.

**Change:** add `src/components/journey/_ui/tokens.ts` — a strongly-typed `flowTokens` const object exposing every flow token as a `var(--color-flow-...)` string reference. Consumers outside Tailwind className (inline SVG attrs, Recharts colour props, canvas paint, dynamic CSS-in-JS) now have a single typed source of truth that still resolves through the runtime cascade for dark/light switching. Exported alongside the bridge components via `_ui/index.ts`.

A `tokens.spec.ts` test asserts every entry of `flowTokens` points at the expected CSS variable, catching silent rename drift.

### D13 — ESLint enforcement of `<Button>` discipline

Reviewer's M-2 surfaced that the Button contract documented in the README had no automated enforcement.

**Change:** an override in `eslint.config.js` rejects raw `<button>` elements anywhere under `src/components/journey/**` or `src/pages/Customer/Journey/**` with a pointer to the README's "Button contract" section. Three pre-existing violations carry inline `eslint-disable` comments referencing the cards that will migrate them (EVO-1274 for SendMessagePanel; environment-manager refactor TBD for VariableInput/VariableTextarea).

The rule prevents NEW raw buttons from entering the Flow Builder surface.

### D14 — `FlowCategoryBadge` API: required `subtype` for `action` variant

Reviewer's M-3 surfaced that the original badge implementation forced `action-message` colours for any action subtype — a `webhook` node with a blue badge reintroduced Pain #3/#5 (visual inconsistency).

**Change:** `<FlowCategoryBadge>` now uses the same discriminated-union API as `<FlowNode>` — `variant + REQUIRED subtype when variant="action"`. The badge colour tracks the actual subtype.

Breaking change to the `<FlowCategoryBadge>` API; no internal consumers exist yet (M-5 confirms the umbrella has zero in-tree consumers at this point), so the break is benign.

### D15 — Documentation surface relocation

Reviewer's H-3 surfaced that the original architecture.md path (`_evo-output/planning-artifacts/...`) was gitignored at the monorepo root (`_evo*` in `.gitignore`) and therefore unreachable for the reviewer. README's "Architecture doc" link pointed at a path that did not exist in the PR.

**Change:** PRD and architecture (this file) relocate from `_evo-output/planning-artifacts/flow-builder-design-system/` to `evo-ai-frontend-community/docs/architecture/flow-builder-design-system/`. README's link updates accordingly. The `_evo-output/` location remains the BMM workflow scratch (gitignored); the tracked location under `docs/` is what reviewers and downstream consumers reach.

### Story sequence after revision (5 stories)

1. Token layer (oklch declared in `globals.css`).
2. Bridge components (`FlowNode`, `FlowCategoryBadge`, `FlowFeedbackBanner`).
3. Typed `tokens.ts` export.
4. Storybook 10 setup + stories (Tokens + 3 bridges).
5. WCAG `tokens.contrast.spec.ts` + ESLint button rule + computed-style spec coverage.

README finalisation runs in parallel with each story (cross-references update as code lands).
