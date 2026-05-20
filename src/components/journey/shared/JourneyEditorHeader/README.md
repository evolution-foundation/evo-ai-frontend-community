# `<JourneyEditorHeader>`

Composite header chrome for the Journey Editor page. Replaces the inline header that lived inside `JourneyFlowEditor.tsx` with a clean 3-zone layout, ESC + Cmd/Ctrl+B keyboard shortcuts for Back, and a responsive kebab menu that collapses secondary actions below 1024px.

**Card:** EVO-1269
**Folder boundary:** `shared/` is for composite components that combine `_ui/` primitives, design-system primitives, and flow tokens (same convention as `shared/NodeConfigModal/` from EVO-1264). `_ui/` stays reserved for primitive bridges.

---

## API

```tsx
import { JourneyEditorHeader } from '@/components/journey/shared/JourneyEditorHeader';

<JourneyEditorHeader
  onBack={() => navigate('/journeys')}
  backLabel={t('flowEditor.back')}
  backShortcutHint={t('flowEditor.backShortcutHint')}
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
  lastSavedFormatter={(d) => t('flowEditor.lastSaved', { time: d.toLocaleTimeString() })}
  unsavedChangesHint={t('flowEditor.autoSaveInfo')}
  moreActionsLabel={t('flowEditor.moreActions')}
/>
```

### Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `onBack` | `() => void` | — | Called by the Back button, the ESC shortcut, and Cmd/Ctrl+B. |
| `backLabel` | `string?` | `'Back'` | Pass already-translated text. |
| `backShortcutHint` | `string?` | `'Esc'` | Short hint appended to the Back button's `title` tooltip — e.g. `Voltar (Esc)`. |
| `title` | `string` | — | Identity (rendered as `<h1 className="text-lg font-semibold">`). |
| `subtitle` | `string?` | — | Secondary identity line (rendered as `<p className="text-sm text-muted-foreground">`). **Omitted entirely when undefined** — do NOT pass a fallback string like "No description"; that defeats Pain #8 (a). |
| `onViewSessions` | `() => void` | — | Triggered by the inline button (lg+) and the kebab item (<lg). |
| `viewSessionsLabel` | `string?` | `'View sessions'` | Same label for both surfaces. |
| `environmentSlot` | `ReactNode?` | — | Drop the EnvironmentManager component here. Stays self-contained — not collapsed into the kebab. |
| `onSave` | `() => void` | — | Called by the Save button. |
| `hasUnsavedChanges` | `boolean?` | `false` | When `false`, Save is disabled and shows `savedLabel`. |
| `isSaving` | `boolean?` | `false` | When `true`, Save shows a spinner and is disabled regardless of `hasUnsavedChanges`. |
| `lastSaved` | `Date \| null?` | `null` | When set, renders a Clock icon + formatted time **inside the persist cluster** next to Save (hidden below `md`). |
| `saveLabel` | `string?` | `'Save'` | Visible when `hasUnsavedChanges && !isSaving`. |
| `savingLabel` | `string?` | `'Saving…'` | Visible (and announced) when `isSaving`. |
| `savedLabel` | `string?` | `'Saved'` | Visible when pristine. |
| `lastSavedFormatter` | `(date: Date) => string?` | `date.toLocaleTimeString()` | Override the timestamp format (typically uses an i18n key). |
| `unsavedChangesHint` | `string?` | — | When provided AND there are unsaved changes AND a `lastSaved` timestamp exists, the hint is appended after the timestamp with a `•` separator (e.g. `Last save: 14:30 • Auto-save in 10s`). |
| `moreActionsLabel` | `string?` | `'More actions'` | ARIA label on the kebab trigger button. |

---

## Layout

Three zones declared via `data-zone` attributes (for testability and downstream styling):

```
[ data-zone="navigation" ]  ·  [ data-zone="identity" (flex-1) ]  ·  [ data-zone="actions" ]
     Back button                  Title + subtitle                  Visualizar | Env | (kebab) | Persist
                                                                                          (lastSaved + Save)
                                                                              View sessions hides below 1024px
```

The action zone is further split into named clusters separated by `border-l border-flow-panel-divider`:

| Cluster | Selector | Contents |
|---|---|---|
| Visualizar | `hidden lg:flex …` | View sessions button. |
| Configurar | `environmentSlot` | EnvironmentManager (passed by consumer). |
| Kebab | `flex lg:hidden` | DropdownMenu with secondary actions (View sessions only, for now). |
| Persistir | `[data-cluster="persist"]` | lastSaved indicator + Save button. |

- Chrome: `bg-flow-panel-header-bg border-b border-flow-panel-divider`.
- Vertical divider between groups: `bg-flow-panel-divider`.
- Title typography: `text-lg font-semibold leading-tight truncate` (matches the Typography contract in `journey/_ui/README.md`).
- Subtitle: `text-sm text-muted-foreground truncate`.

---

## Keyboard shortcuts

| Keys | Action | When the handler short-circuits |
|---|---|---|
| `Escape` | Calls `onBack()`. | When focus is in `<input>` / `<textarea>` / `<select>` / `[contenteditable]`. Also when ANY Radix overlay (`[role="dialog"]`, `[role="alertdialog"]`, `[role="menu"]`) has `data-state="open"` — Radix Dialog should close itself, our listener stays quiet. |
| `Cmd+B` (macOS) / `Ctrl+B` (Win/Linux) | Calls `onBack()` and `preventDefault()` (so the browser's "Toggle bookmarks bar" doesn't also fire). | Same guards as ESC. |

The listener is registered at `document` level inside a `useEffect` with `[onBack]` dependency. Cleanup on unmount is automatic — verified by `JourneyEditorHeader.spec.tsx`.

The overlay guard is a defensive check: it does not rely on Radix consistently calling `stopPropagation` on Escape — the explicit selector `[role="dialog|alertdialog|menu"][data-state="open"]` is checked from the document listener itself.

---

## Responsive behaviour

| Viewport | Layout |
|---|---|
| `≥1024px` (`lg`) | Back · Identity · (View sessions \| Env \| lastSaved + Save) — full horizontal layout. |
| `<1024px` | Back · Identity · (Env · Kebab · lastSaved + Save) — View sessions moves into the kebab `DropdownMenu`. |
| `<768px` (`md`) | Same as above, plus the lastSaved timestamp is hidden (`hidden md:flex`). |

`EnvironmentManager` is intentionally NOT moved into the kebab. The component is self-contained (its own popover trigger) and refactoring it to accept a controlled trigger is out of scope for EVO-1269. Follow-up card can address this if EnvironmentManager later needs to live inside the kebab on small viewports.

---

## Accessibility

- The header has `role="banner"` (`<header>` element).
- Back button declares `aria-keyshortcuts="Escape"` AND a `title` tooltip in the form `<Back label> (<shortcut hint>)` so mouse users discover the shortcut on hover.
- All icons are `aria-hidden="true"`.
- Loading state on Save uses `aria-live="polite"` via the surrounding container (lastSaved indicator is also `aria-live="polite"` so timestamp updates are announced).
- The kebab `DropdownMenu` is the Radix-based primitive from `@evoapi/design-system` — full keyboard navigation and ARIA come for free.
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
- ❌ Don't put `useEffect` keyboard listeners outside this component for ESC-to-Back semantics — duplicate listeners would compound.
- ❌ Don't refactor `EnvironmentManager` from inside this card — pass it as a slot. `EnvironmentManager` ownership stays with whatever card touches it directly.
- ❌ Don't pass a "No description" / "Sem descrição" fallback to `subtitle` — the absence of a subtitle is itself meaningful (Pain #8 a). Let the line disappear.

---

## Promotion criterion

Per [EVO-1253 architecture, D7](../../../../docs/architecture/flow-builder-design-system/architecture.md): `<JourneyEditorHeader>` stays local under `journey/shared/`. It consumes `--color-flow-panel-*` tokens that don't exist outside the Flow Builder, and its semantics (Back / Save / Sessions / Environment) are specific to the Journey Editor surface. Promotion to `@evoapi/design-system` would require a different generic component with no flow-specific assumptions.

---

## Related

- **Storybook:** `pnpm storybook` → "Flow Builder / JourneyEditorHeader" (7 stories: Pristine / Dirty / Saving / WithLastSaved / DirtyWithUnsavedChangesHint / WithoutSubtitle / PortugueseLabels).
- **Tests:** `pnpm test src/components/journey/shared/JourneyEditorHeader` — 28 cases covering layout zones, all 4 ACs, the persist-cluster grouping, ESC + Cmd/Ctrl+B shortcuts, overlay-open guard, the unsavedChangesHint suffix, and listener cleanup.
- **Consumer:** `src/pages/Customer/Journey/JourneyFlowEditor.tsx` — the single consumer page that renders this header above `<BaseFlowEditor showHeader={false}>`.
