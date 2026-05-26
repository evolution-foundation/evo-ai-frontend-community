# `useFlowEditorStore`

Zustand store that owns the **single source of truth** for the Journey Flow Editor: live snapshot, dirty/saving/error state, last-saved timestamp, and the recovery candidate read from IndexedDB. Replaces the prior arrangement where `JourneyFlowEditor` and `BaseFlowEditor` each kept their own `useState` for "has unsaved changes" and ran independent `setInterval` autosave timers.

**Card:** EVO-1258 (Pain #9 — autosave/dirty refactor).

---

## Overview

The store is one of three coordinated pieces:

| File | Purpose |
|---|---|
| `useFlowEditorStore.ts` | The Zustand store + state machine + autosave/IDB/retry timers. |
| `idbSnapshot.ts` | Thin `idb-keyval` wrapper that persists the current snapshot to IndexedDB for recovery on the next mount. |
| `lastSavedMark.ts` | `localStorage` wrapper that persists our own wall-clock at commit time, so the header doesn't trust a possibly-stale `response.updatedAt` from the server. |

The consumer (`JourneyFlowEditor.tsx`) hydrates the store on mount, registers a save trigger, and reads selectors for header props. It does not own dirty/saving/lastSaved state any more.

---

## State machine

```
                 hydrate(server)
                       │
                       ▼
                    [ idle ]──────────────────────────────┐
                       │                                  │
                  setFlow / setVariables                  │ commitSave(savedAt)
                       │                                  │
                       ▼                                  │
                  [ dirty ]                               │
                       │                                  │
              ┌──── 5s autosave timer ─┐                  │
              │   beginSave()          │                  │
              ▼                        ▼                  │
          [ saving ]────────────────────────────[ idle (saved) ]
              │                                           ▲
              │ failSave(message)                         │
              ▼                                           │
          [ error ]                                       │
              │  (30s auto-retry timer)                   │
              │  beginSave() OR user edits                │
              └──────────────────► [ saving ] ────────────┘
```

Transitions live on the store actions; nothing transitions implicitly.

| From | Action | To | Side effects |
|---|---|---|---|
| `idle` | `setFlow` / `setVariables` (causing data divergence) | `dirty` | Schedule IDB write (500ms). Arm autosave timer (5s). |
| `dirty` | `beginSave` | `saving` | Cancel autosave timer. Cancel retry timer. |
| `dirty` | autosave timer fires | (consumer calls `beginSave`) | Timer triggers the registered save handler. |
| `saving` | `commitSave(savedAt)` | `idle` | Snapshot becomes the new `serverSnapshot`. Cancel all timers. Clear IDB snapshot. Persist `lastSavedAt` to `localStorage`. |
| `saving` | `failSave(message)` | `error` | Cancel all timers (including the just-finished save). Arm 30s retry timer. Banner shows `lastError`. |
| `error` | retry timer fires (30s) | (consumer calls `beginSave`) | Retry fires the registered save trigger; that consumer call transitions to `saving`. |
| `error` | `beginSave` (manual Save) | `saving` | Cancel retry timer. |
| `error` | `setFlow` / `setVariables` (new edit) | `dirty` | Cancel retry timer. Arm autosave timer. Clear `lastError`. |
| any | `reset` | (cleared) | Cancel all timers. Drop pendingSaveTrigger. |

---

## API

```tsx
import {
  useFlowEditorStore,
  registerAutosaveTrigger,
  FLOW_EDITOR_AUTOSAVE_DELAY_MS,
  FLOW_EDITOR_IDB_DEBOUNCE_MS,
  FLOW_EDITOR_ERROR_RETRY_DELAY_MS,
} from '@/store/flowEditor/useFlowEditorStore';
```

### Selectors (read-only state)

| Field | Type | Notes |
|---|---|---|
| `journeyId` | `string \| null` | Set by `hydrate`. Used to scope IDB / localStorage keys. |
| `status` | `'idle' \| 'dirty' \| 'saving' \| 'error'` | The state machine current state. |
| `lastSavedAt` | `Date \| null` | Wall-clock at the most recent `commitSave`. Header consumes this. |
| `lastError` | `string \| null` | Error message from the last `failSave`. Banner consumes this. |
| `retryScheduled` | `boolean` | True when `failSave` armed the 30s auto-retry (i.e., a save trigger was registered at that time). The banner only promises "Retrying in 30s" when this is true; otherwise it falls back to a "click Save to try again" wording. |
| `serverSnapshot` | `FlowSnapshot \| null` | The data shape we believe the server holds. Updated by `commitSave` to the snapshot the consumer actually sent (NOT the latest `currentSnapshot`) so we never claim to have synced an edit the server never saw. |
| `currentSnapshot` | `FlowSnapshot \| null` | The live data the user is editing. Updated on `setFlow` / `setVariables`. |
| `recoveryCandidate` | `{ snapshot; timestamp } \| null` | Set by `hydrate` when IDB has a newer-than-server divergent snapshot. Consumer renders the AlertDialog. |

### Actions

| Action | Use when |
|---|---|
| `hydrate({ journeyId, server, lastSavedAt, recovery })` | Page mount, after fetching the journey from the API and reading IDB / localStorage. |
| `setFlow(nodes, edges)` | xyflow emits an `onFlowDataChange` callback. Pass the updated arrays. |
| `setVariables(variables)` | EnvironmentManager mutates the journey variable list. |
| `beginSave()` | Consumer's save handler is about to fire its API call (manual Save click OR the autosave trigger). Cancels pending autosave / retry timers and flips status to `saving`. |
| `commitSave(savedAt, syncedSnapshot)` | Server returned success. `savedAt` is the wall-clock at commit time. `syncedSnapshot` is the snapshot value the consumer actually sent (captured at `beginSave` time). If `currentSnapshot` has diverged from `syncedSnapshot` (the user edited during the API roundtrip), the store stays `dirty` and arms the next autosave — preserving the unsynced edits. This is the **atomic update** contract from the EVO-1258 card. |
| `failSave(message)` | Server returned an error. Stores the message for the banner and arms the 30s retry. |
| `acceptRecovery()` | User clicked Recuperar in the recovery prompt. Loads the candidate into `currentSnapshot`, flips to `dirty`. |
| `rejectRecovery()` | User clicked Descartar. Clears IDB and drops the candidate. |
| `reset()` | Consumer unmounts. Cancels all timers and tears the store down. |

### Save trigger registration

The autosave + retry timers cannot call the consumer's save handler directly because that handler lives in a React component and depends on hooks and closures (the journey service, toast helpers, route navigation). The store therefore exposes:

```tsx
useEffect(() => {
  return registerAutosaveTrigger(() => {
    void saveChanges();
  });
}, [saveChanges]);
```

When a timer (5s autosave OR 30s retry) is due to fire and the store status allows a save, the registered trigger is invoked. The trigger is responsible for ALL the journey-specific work: read snapshot, call `beginSave`, hit the API, then `commitSave` or `failSave`.

### Exported timing constants

| Constant | Value | Purpose |
|---|---|---|
| `FLOW_EDITOR_AUTOSAVE_DELAY_MS` | 5000 | Debounce reset on every edit. |
| `FLOW_EDITOR_IDB_DEBOUNCE_MS` | 500 | IDB snapshot write debounce, decoupled from autosave so we always have a fresh recovery snapshot. |
| `FLOW_EDITOR_ERROR_RETRY_DELAY_MS` | 30000 | Auto-retry after `failSave` (AC #4 — "Tentando de novo em 30s"). |

---

## Recovery flow

```
mount
  ▼
[1] journeyService.getJourney(id)   ─┐
[2] idbSnapshot.loadSnapshot(id)     │ — parallel
[3] lastSavedMark.loadLastSavedAt(id) ─┘
  ▼
lastSavedAt = localMark ?? serverUpdatedAt ?? new Date()
  ▼
store.hydrate({ journeyId, server, lastSavedAt, recovery })
  │
  ├─ if recovery.timestamp > lastSavedAt AND recovery.snapshot ≠ server
  │  → recoveryCandidate = { snapshot, timestamp }
  │
  └─ else recoveryCandidate = null
  ▼
JourneyFlowEditor renders an AlertDialog when recoveryCandidate !== null:
  • Recuperar → store.acceptRecovery() → currentSnapshot = candidate, status = dirty
  • Descartar → store.rejectRecovery()  → IDB cleared, candidate dropped
```

Snapshots older than **7 days** are dropped on read. The `lastSavedMark` is dropped after **30 days**.

---

## Why we prefer a local lastSavedAt mark over `response.updatedAt`

`response.updatedAt` from the journey API has been observed coming back stale (or timezone-shifted) right after a successful save — the header read "Saved 2 hours ago" when the user had just saved 30 seconds earlier. Root cause is in the backend and out of scope for this card.

Workaround: every `commitSave` persists `Date.now()` to `localStorage` under `evo-flow-editor:last-saved:<journeyId>`. On the next mount the loader prefers that local mark; falls back to the server timestamp when the mark is missing (first open on a different device). If both are missing, falls back to `new Date()` so the header at least shows "just now" instead of "Invalid Date".

This is a frontend workaround. The proper fix — making the backend return a reliable `updated_at` after every flow update — should be filed as a separate ticket.

---

## Anti-patterns

- ❌ Don't keep `hasUnsavedChanges` / `isSaving` / `lastSaved` as `useState` in any component. They live on the store. Components should read selectors.
- ❌ Don't add a parallel `setInterval` for autosave anywhere else. The store owns the timer. `BaseFlowEditor` should be invoked with `autoSave={false}` from journey consumers.
- ❌ Don't call the trigger from inside the store body. Always go through `registerAutosaveTrigger`; the store stays React-free.
- ❌ Don't call `commitSave` from anywhere except the consumer's success path. The state machine assumes a single writer.
- ❌ Don't write the live xyflow `data` objects to IndexedDB directly. They contain closures that `structuredClone` cannot copy. `saveSnapshot` JSON-clones the payload first — keep that.
- ❌ Don't rely on `aria-live` on the lastSavedAt strip. The relative-time ticks would be re-announced periodically. Header surrounds the Save button alone in `aria-live="polite"`.
- ❌ Don't call `commitSave(savedAt)` (1 arg). The signature now requires the actual snapshot that was synced so the store can detect mid-save edits.

---

## Singleton constraint

The store and its timers are module-level singletons. There is intentionally one editor mounted at a time. If a future feature ever needs two editors on screen simultaneously (split-screen, preview-in-modal, etc.), the timer slots (`autosaveTimerId`, `idbWriteTimerId`, `errorRetryTimerId`, `pendingSaveTrigger`) must be moved into `set`/`get` state so each store instance owns its own. Tests rely on `useFlowEditorStore.getState().reset()` in `beforeEach`/`afterEach` to clear these singletons between cases.

---

## Tests

```bash
pnpm test src/store/flowEditor
```

| File | Tests |
|---|---|
| `useFlowEditorStore.spec.ts` | 26 — hydration, recovery candidate selection, dirty propagation, debounce reset on edits, save lifecycle (begin/commit/fail), atomic update (mid-save edit stays dirty), error → dirty on new edit, 30s auto-retry, retry cancellation paths (commit / manual save / new edit / consecutive failure restart / **trigger unregister**), `retryScheduled` flag truthfulness, acceptRecovery defensive cleanup. |
| `idbSnapshot.spec.ts` | 8 — round-trip, journey isolation, overwrite, clear, 7-day staleness window, function-stripping (DataCloneError defence). |
| `lastSavedMark.spec.ts` | 7 — round-trip, journey isolation, overwrite, clear, 30-day staleness, corrupted-value graceful fallback. |

---

## Related

- **Consumer:** `src/pages/Customer/Journey/JourneyFlowEditor.tsx`.
- **Header that reads `lastSavedAt` / `status`:** `src/components/journey/shared/JourneyEditorHeader/` (EVO-1269).
- **Relative-time display:** `src/lib/relativeTime.ts` + `src/lib/useRelativeTime.ts`.
- **Pain #9 origin:** discovery 8.1 (Davidson confirmed "deve ser refatorado esse sistema").
