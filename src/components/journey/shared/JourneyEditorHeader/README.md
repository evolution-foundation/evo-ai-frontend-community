# `<JourneyEditorHeader>`

Composite header chrome for the Journey Editor page. Replaces the inline header that lived inside `JourneyFlowEditor.tsx` with a clean 3-zone layout. Navigation away from the editor is done via the visible Back button — there is no global keyboard shortcut for Back (see "Why no ESC / Cmd+B?" below).

**Card:** EVO-1269
**Folder boundary:** `shared/` is for composite components that combine `_ui/` primitives, design-system primitives, and flow tokens (same convention as `shared/NodeConfigModal/` from EVO-1264). `_ui/` stays reserved for primitive bridges.

---

## API

```tsx
import { JourneyEditorHeader } from '@/components/journey/shared/JourneyEditorHeader';

<JourneyEditorHeader
  onBack={() => navigate('/journeys')}
  backLabel={t('flowEditor.back')}
  title={t('flowEditor.title', { name: journey.name })}
  subtitle={journey.description || undefined}
  onViewSessions={() => setShowSessionsViewer(true)}
  viewSessionsLabel={t('flowEditor.viewSessions')}
  environmentSlot={<EnvironmentManager journeyId={id} />}
  onSave={saveChanges}
  hasUnsavedChanges={hasUnsavedChanges}
  isSaving={isSaving}
  lastSaved={lastSaved}
  saveLabel={t('flowEditor.save')}
  savingLabel={t('flowEditor.saving')}
  savedLabel={t('flowEditor.saved')}
  lastSavedFormatter={(date) =>
    t('flowEditor.lastSavedRelative', {
      relative: formatRelativeTime(date, relativeNow, {
        locale: currentLanguage,
        justNowLabel: t('flowEditor.lastSavedJustNow'),
      }),
    })
  }
  unsavedChangesHint={t('flowEditor.autoSaveInfo')}
/>
```

`relativeNow` comes from the `useRelativeTime(lastSaved)` hook in `@/lib/useRelativeTime` — it returns a `Date` that ticks at an adaptive cadence (30s when the date is fresher than 1m, 60s when it's between 1m and 1h, 10min beyond). Cadence is intentionally coarse: lastSaved is a status indicator, not a stopwatch.

### Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `onBack` | `() => void` | — | Called by the Back button only. The consumer page is responsible for any unsaved-changes confirmation before triggering navigation (see `JourneyFlowEditor.tsx`). |
| `backLabel` | `string?` | `'Back'` | Pass already-translated text. |
| `title` | `string` | — | Identity (rendered as `<h1 className="text-lg font-semibold">`). The full title is also set as the native `title` attribute on the `<h1>` so users see the complete text when the visible label is truncated. |
| `subtitle` | `string?` | — | Secondary identity line (rendered as `<p className="text-sm text-muted-foreground">`). **Omitted entirely when undefined** — do NOT pass a fallback string like "No description"; that defeats Pain #8 (a). |
| `onViewSessions` | `() => void` | — | Triggered by both the full button (≥768px) and the icon-only button (<768px). |
| `viewSessionsLabel` | `string?` | `'View sessions'` | Used as the visible label at ≥md and as the `aria-label` on the icon-only fallback at <md. |
| `environmentSlot` | `ReactNode?` | — | Drop the EnvironmentManager component here. Stays self-contained — visible at all sizes. |
| `onSave` | `() => void` | — | Called by the Save button. |
| `hasUnsavedChanges` | `boolean?` | `false` | When `false`, Save is disabled and shows `savedLabel`. |
| `isSaving` | `boolean?` | `false` | When `true`, Save shows a spinner and is disabled regardless of `hasUnsavedChanges`. |
| `lastSaved` | `Date \| null?` | `null` | When set, renders a Clock icon + formatted time **inside the persist cluster** next to Save (hidden below `md`). |
| `saveLabel` | `string?` | `'Save'` | Visible when `hasUnsavedChanges && !isSaving`. |
| `savingLabel` | `string?` | `'Saving…'` | Visible (and announced via the aria-live wrapper) when `isSaving`. |
| `savedLabel` | `string?` | `'Saved'` | Visible when pristine. |
| `lastSavedFormatter` | `(date: Date) => string?` | `date.toLocaleTimeString()` | Override the timestamp format. Default consumer wires `formatRelativeTime(date, relativeNow, …)` so the strip shows natural-language deltas — `Salvo agora mesmo` / `Salvo há 10 segundos` / `Saved 2 minutes ago`. Avoid raw `HH:MM:SS`. |
| `unsavedChangesHint` | `string?` | — | When provided AND there are unsaved changes AND a `lastSaved` timestamp exists, the hint is appended after the timestamp with a `•` separator (e.g. `Last save: 14:30 • Auto-save in 10s`). |

---

## Layout

Three zones declared via `data-zone` attributes (for testability and downstream styling):

```
[ data-zone="navigation" ]  ·  [ data-zone="identity" (flex-1) ]  ·  [ data-zone="actions" ]
     Back button                  Title + subtitle                  Visualizar | Env | Persist
                                                                                       (lastSaved + Save)
                                                                    View sessions becomes icon-only below 768px
```

The action zone is further split into named clusters separated by `border-l border-flow-panel-divider`:

| Cluster | Selector | Contents |
|---|---|---|
| Visualizar | first cluster in actions zone | View sessions — full button at ≥md, icon-only at <md |
| Configurar | `environmentSlot` | EnvironmentManager (passed by consumer) |
| Persistir | `[data-cluster="persist"]` | lastSaved indicator + Save button (wrapped in `aria-live="polite"`) |

- Chrome: `bg-flow-panel-header-bg border-b border-flow-panel-divider`.
- Identity zone uses a left border (`border-l border-flow-panel-divider pl-4`) as the visual separator from navigation — same mechanism as the action-cluster separators (consistent rhythm).
- Title typography: `text-lg font-semibold leading-tight truncate` (matches the Typography contract in `journey/_ui/README.md`).
- Subtitle: `text-sm text-muted-foreground truncate`.

---

## Why no ESC / Cmd+B?

An earlier iteration of this card bound `Escape` and `Cmd/Ctrl+B` to `onBack` at the `document` level. That was removed during the EVO-1269 UX revision because:

1. **ESC = exit current context, never exit the page** — every comparable editor (Figma, VS Code, Sketch, Notion, Linear, Whimsical) uses ESC to close popovers, deselect, or exit edit mode. A global ESC that navigates away from the editor breaks the user's mental model.
2. **Cmd/Ctrl+B = Bold** in every rich-text app (Word, Pages, Notion, Slack, Linear comments). Reusing it for "back" creates muscle-memory conflicts. The web convention for back is `Alt+ArrowLeft`, which the browser handles natively via React Router — no custom binding required.
3. **The fewer surprise navigations, the better** — the Back button is visible and easily reachable in the navigation zone. There is no usability cost to removing the keyboard shortcut.

If a Back keyboard affordance is required in a future iteration, prefer `Alt+ArrowLeft` (web standard, no muscle-memory conflict).

---

## Unsaved-changes confirmation

The header itself does NOT decide whether to confirm before navigating away — that is the consumer's responsibility. `JourneyFlowEditor.tsx` implements the confirmation locally:

1. The Back button's `onBack` handler routes through `requestNavigate('/journeys')`. When `hasUnsavedChanges` is `true`, that helper opens an `<AlertDialog>` ("Unsaved changes — Stay / Leave anyway") instead of calling `navigate()` immediately. Confirming the dialog completes the navigation.
2. A `beforeunload` window listener is registered while `hasUnsavedChanges` is `true`, so the browser shows its native prompt on tab close, refresh, or address-bar navigation.

This keeps `<JourneyEditorHeader>` framework-agnostic (no React Router import) and works without migrating the app to a React Router v7 data router. **Caveat:** in-app sidebar `<Link>` clicks bypass `requestNavigate` and therefore skip the in-app confirmation; only the autosave loop and the `beforeunload` prompt mitigate that path. Migrating the app to `createBrowserRouter` and switching to `useBlocker` is the path forward when this coverage gap matters more than the migration cost.

---

## Responsive behaviour

| Viewport | Layout |
|---|---|
| `≥768px` (`md`) | Back · Identity · (View sessions full · Env · lastSaved + Save) |
| `<768px` (`md`) | Back · Identity · (View sessions icon-only · Env · Save) — lastSaved timestamp is hidden, View sessions becomes `<Button size="icon">` with `aria-label`. |

No kebab. With only a single secondary action (`View sessions`), an overflow menu added a 2-click indirection without saving meaningful horizontal space — the icon-only fallback at <md is more direct and discoverable.

`EnvironmentManager` is intentionally not collapsed at narrow viewports either. The component is self-contained (its own popover trigger) and refactoring it to accept a controlled trigger is out of scope for EVO-1269.

---

## Accessibility

- The header has `role="banner"` (`<header>` element).
- All icons are `aria-hidden="true"`.
- The icon-only View sessions button at `<md` carries `aria-label={viewSessionsLabel}` so screen readers announce its purpose.
- The Save button (and its current label cycling Save → Saving… → Saved) is wrapped in a single `<div aria-live="polite" aria-atomic="true">` region — assistive tech announces the state transition once per change.
- The `lastSaved` timestamp is **not** `aria-live`. It ticks passively as relative time advances (`agora mesmo` → `há 30 segundos` → `há 1 minuto`); announcing those ticks would be noise without user action.
- Title `<h1>` carries the full title in its native `title` attribute so users see the complete text when the visible label is truncated. Same treatment for `subtitle`.
- Save button uses the standard disabled state — screen readers announce the disabled status.

---

## Tokens consumed (from EVO-1253)

- `--color-flow-panel-header-bg` — header background strip.
- `--color-flow-panel-divider` — borders and vertical dividers between groups.

Consumed via Tailwind utilities (`bg-flow-panel-header-bg`, `border-flow-panel-divider`) — no inline `style={{}}`.

---

## Anti-patterns

- ❌ Don't add `useState` here — lifted state is mandatory.
- ❌ Don't replace `<Button>` with raw `<button>` — the ESLint `no-restricted-syntax` rule (from EVO-1253) catches it.
- ❌ Don't reintroduce a global `document` keydown listener for Back navigation — see "Why no ESC / Cmd+B?" above. If a shortcut is required later, prefer `Alt+ArrowLeft` and document the rationale.
- ❌ Don't refactor `EnvironmentManager` from inside this card — pass it as a slot. `EnvironmentManager` ownership stays with whatever card touches it directly.
- ❌ Don't pass a "No description" / "Sem descrição" fallback to `subtitle` — the absence of a subtitle is itself meaningful (Pain #8 a). Let the line disappear.
- ❌ Don't wrap the `lastSaved` strip in `aria-live` — relative time ticks would be re-announced on every cadence step (30s/60s/10min) without any user action, which is noise.

---

## Promotion criterion

Per [EVO-1253 architecture, D7](../../../../docs/architecture/flow-builder-design-system/architecture.md): `<JourneyEditorHeader>` stays local under `journey/shared/`. It consumes `--color-flow-panel-*` tokens that don't exist outside the Flow Builder, and its semantics (Back / Save / Sessions / Environment) are specific to the Journey Editor surface. Promotion to `@evoapi/design-system` would require a different generic component with no flow-specific assumptions.

---

## Related

- **Storybook:** `pnpm storybook` → "Flow Builder / JourneyEditorHeader" (7 stories: Pristine / Dirty / Saving / WithLastSaved / DirtyWithUnsavedChangesHint / WithoutSubtitle / PortugueseLabels).
- **Tests:** `pnpm test src/components/journey/shared/JourneyEditorHeader` — covers layout zones, all 4 ACs (with the documented AC-2 deviation), the persist-cluster aria-live wrapper, absence of global keydown listener, and absence of aria-live on the ticking timestamp.
- **Consumer:** `src/pages/Customer/Journey/JourneyFlowEditor.tsx` — the single consumer page; it owns the unsaved-changes confirmation via `useBlocker`.
