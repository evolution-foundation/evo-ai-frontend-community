# `<NodeConfigModal>`

Shared modal chrome for any Flow Builder node configuration form. Composite component built on `@evoapi/design-system` primitives (Radix-based `Dialog`, `Tabs`, `Collapsible`, `Button`) + the `--color-flow-panel-*` chrome tokens declared by [EVO-1253](../../_ui/README.md).

**Card:** EVO-1264
**Folder boundary:** `shared/` is for **composite** components that combine `_ui/` primitives, design-system primitives, and flow tokens. `_ui/` stays reserved for **primitive bridges** that consume tokens directly (FlowNode, FlowCategoryBadge, FlowFeedbackBanner).

---

## API

```tsx
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';

<NodeConfigModal
  open={isOpen}
  onCancel={close}
  onSave={save}
  title="Send message"
  icon={<Send className="h-5 w-5 text-flow-node-action-message-fg" />}
  description="Configure the message that will be sent."
  loading={isSaving}
  dirty={form.isDirty}
  variant="simple"
>
  <YourFormFields />
</NodeConfigModal>
```

### Common props (shared by every variant)

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `open` | `boolean` | — | Controlled open state. |
| `onCancel` | `() => void` | — | Called on ESC, click outside, X button, and Cancel button. Required. |
| `onSave` | `() => void \| Promise<void>` | — | Called when Save is clicked. The component does NOT await the returned promise — consumer flips `loading` true/false manually around the async work. |
| `title` | `string` | — | Modal title (rendered by `<DialogTitle>`, gets `text-lg leading-none font-semibold` automatically). |
| `icon` | `ReactNode?` | — | Optional category icon rendered before the title. |
| `description` | `string?` | — | Subtitle under the title (rendered by `<DialogDescription>`). Omitting it suppresses the Radix `aria-describedby` warning explicitly. |
| `loading` | `boolean?` | `false` | Disables both Save and Cancel; renders a spinner + "Saving…" SR-only text on Save. |
| `dirty` | `boolean?` | `false` | When `false`, Save is disabled. Flip to `true` once the form has unsaved changes. |
| `saveLabel` | `string?` | `'Save'` | Pass already-translated text (e.g. `t('panels.actions.save')`). |
| `cancelLabel` | `string?` | `'Cancel'` | Same — already-translated. |
| `contentClassName` | `string?` | — | Forwarded onto `Dialog.Content`'s className via `cn()`. Use for width overrides (e.g. `max-w-4xl`). `tailwind-merge` deduplicates against the default `max-w-2xl`. |

### Variant-specific props

#### `variant="simple"` — 80% of node modals

```tsx
<NodeConfigModal variant="simple" {...common}>
  {bodyJsx}
</NodeConfigModal>
```

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` | Rendered directly in the body slot. |

#### `variant="tabs"` — basic / advanced (or N tabs)

```tsx
<NodeConfigModal
  variant="tabs"
  {...common}
  tabs={[
    { value: 'basic', label: 'Basic', content: <BasicForm /> },
    { value: 'advanced', label: 'Advanced', content: <AdvancedForm /> },
  ]}
  defaultTab="basic"
  onTabChange={(value) => analytics.track('tab-switch', { value })}
/>
```

| Prop | Type | Notes |
|---|---|---|
| `tabs` | `Array<{ value, label, content }>` | One entry per tab. `content` is rendered inside `TabsContent`. |
| `defaultTab` | `string?` | Initial active tab. Falls back to `tabs[0]?.value`. |
| `onTabChange` | `(value) => void?` | Fired on every switch. |

**Lifted state — important.** Radix Tabs unmounts the inactive `TabsContent` by default. Your form state must live in the parent (consumer) component so it survives tab switches. Don't put `useState` inside a tab's `content` prop expecting it to stick.

#### `variant="disclosure"` — body + collapsible advanced

```tsx
<NodeConfigModal
  variant="disclosure"
  {...common}
  advanced={<AdvancedFilters />}
  defaultAdvancedOpen={false}
  advancedLabel="Advanced settings"
>
  <PrimaryFields />
</NodeConfigModal>
```

| Prop | Type | Notes |
|---|---|---|
| `children` | `ReactNode` | Primary body (always visible). |
| `advanced` | `ReactNode` | Inside `<CollapsibleContent>`. |
| `defaultAdvancedOpen` | `boolean?` | Initial state. |
| `advancedLabel` | `string?` | Trigger button label (default `'Advanced settings'`). |

---

## Accessibility

Focus trap, ESC handling, ARIA roles, and the X close button all come from `@evoapi/design-system`'s `Dialog` (Radix). Specifically:

- ESC anywhere inside the modal → `onOpenChange(false)` → wired to `onCancel`.
- Click outside → same.
- X button (built-in to `DialogContent`) → same.
- Focus is trapped within the dialog while open.
- `<DialogTitle>` becomes the accessible name; `<DialogDescription>` (when `description` is provided) the accessible description.

Loading state announces "Saving…" via `<span className="sr-only">` so screen-reader users hear the state change.

---

## Tokens consumed (from EVO-1253)

- `--color-flow-panel-bg` — Dialog content background.
- `--color-flow-panel-header-bg` — Header and footer strip backgrounds.
- `--color-flow-panel-divider` — Border between header / body / footer.

All consumed via Tailwind utilities (`bg-flow-panel-bg`, `border-flow-panel-divider`, etc.) — no inline `style={{}}` or `var(--...)` references.

---

## Anti-patterns

- ❌ Don't add `useState` to NodeConfigModal — lifted state is mandatory. Every dynamic value (open, dirty, loading, currentTab, advancedOpen) lives in the consumer.
- ❌ Don't wrap children in your own `<form onSubmit>` and rely on form submission to fire Save — Save is a button click handler, not a form submit. If you need a `<form>`, put it inside `children` / `tab.content` / `advanced` and call `onSave` from your submit handler.
- ❌ Don't replace `<Button>` with raw `<button>` for Save/Cancel — the `no-restricted-syntax` ESLint rule (from EVO-1253) catches this.
- ❌ Don't auto-await `onSave` here — keep it sync from the component's perspective. Consumer manages the loading flip.

---

## Promotion criterion

Per the EVO-1253 architecture decision D7: NodeConfigModal stays in `journey/shared/` indefinitely. It does NOT promote to `@evoapi/design-system` because it consumes `--color-flow-panel-*` tokens that don't exist outside the Flow Builder. A reusable modal chrome WITHOUT flow tokens would be a different (generic) component owned by the design system team, not this card.

---

## Related

- **Storybook:** `pnpm storybook` → "Flow Builder / NodeConfigModal" (7 stories: 3 simple states, tabs, 2 disclosure states, wide-content override).
- **Tests:** `pnpm test src/components/journey/shared/NodeConfigModal` — 20 cases covering all 4 ACs + edge cases (icon render, X close, loading announcement, tab lifted state preservation).
- **Downstream:** EVO-1274 will apply this modal to the 21 existing node config forms.
