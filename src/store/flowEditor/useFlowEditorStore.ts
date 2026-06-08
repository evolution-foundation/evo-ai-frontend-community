import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { saveSnapshot, clearSnapshot, type StoredFlowSnapshot } from './idbSnapshot';
import { persistLastSavedAt } from './lastSavedMark';

/**
 * The store tracks only `nodes` + `edges`. Journey variables live in their
 * own persistence path (`useJourneyVariables` hook + `EnvironmentManager`).
 * Earlier iterations of this store also tracked variables, but they were
 * never wired into the save payload nor hydrated from the server — the
 * result was false recovery prompts when only the (ignored) variables
 * field diverged. Keep that responsibility out of here.
 */
export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

export type FlowEditorStatus = 'idle' | 'dirty' | 'saving' | 'error';

export type FlowEditorState = {
  journeyId: string | null;
  status: FlowEditorStatus;
  lastSavedAt: Date | null;
  lastError: string | null;
  /**
   * True when `failSave` armed the 30s auto-retry. The error banner should
   * only promise "Tentando de novo em 30s" when this is true; otherwise no
   * trigger is registered and the promise would be a lie.
   */
  retryScheduled: boolean;
  /**
   * Actual delay (ms) of the currently-scheduled auto-retry, or `null` when
   * no retry is in flight (either no failure yet, or the retry budget has
   * been exhausted). Consumers display this in the failure banner so the
   * promised wait time matches the actual schedule across consecutive
   * failures (30s on the first retry, 60s on the second, 120s on the third).
   */
  nextRetryDelayMs: number | null;
  /**
   * How many automatic retries have already been scheduled in the current
   * error streak. Reset to 0 on success, on a new user edit, and on manual
   * save. Capped at `FLOW_EDITOR_MAX_AUTO_RETRIES`; beyond that, the banner
   * tells the user to click Save manually.
   */
  retryAttempt: number;
  serverSnapshot: FlowSnapshot | null;
  currentSnapshot: FlowSnapshot | null;
  recoveryCandidate: { snapshot: FlowSnapshot; timestamp: Date } | null;
  /**
   * Monotonic counter that increments every time `acceptRecovery` lands a
   * recovered snapshot. Consumers can use it as a React `key` to force the
   * canvas to remount and re-seed `useNodesState(initialNodes)` — `xyflow`
   * is uncontrolled internally, so updating `currentSnapshot` alone does
   * NOT propagate the recovered nodes to the canvas without a remount.
   */
  recoveryEpoch: number;

  // Lifecycle
  hydrate: (params: {
    journeyId: string;
    server: FlowSnapshot;
    lastSavedAt: Date | null;
    recovery: StoredFlowSnapshot | null;
  }) => void;
  reset: () => void;

  // User edits
  setFlow: (nodes: Node[], edges: Edge[]) => void;

  // Save lifecycle (driven by consumer — store provides transitions only)
  /**
   * Move into `saving`. Pass `resetRetryBudget: true` when the save was
   * triggered by an explicit user action (manual Save button) — that
   * resets the auto-retry counter so a failure restarts the 30s/60s/120s
   * backoff from scratch. Pass `false` (or nothing) when the save was
   * triggered by the autosave timer or the auto-retry timer — those
   * should NOT reset the counter, otherwise the cap is never reached.
   */
  beginSave: (opts?: { resetRetryBudget?: boolean }) => void;
  /**
   * Mark a save as successfully landed.
   *
   * `syncedSnapshot` is the snapshot value the consumer actually sent to the
   * server (captured at beginSave time). The store compares it against the
   * current snapshot to detect mid-save edits (the atomicity requirement on
   * the EVO-1258 card): if the user edited during the API roundtrip, the
   * current snapshot diverges from what was synced and the store stays
   * `dirty` — the next autosave tick will pick up the unsynced edits.
   */
  commitSave: (savedAt: Date, syncedSnapshot: FlowSnapshot) => void;
  failSave: (message: string) => void;

  // Recovery
  acceptRecovery: () => void;
  rejectRecovery: () => void;
};

const DEFAULT_AUTOSAVE_DELAY_MS = 5000;
const IDB_DEBOUNCE_MS = 500;
const ERROR_RETRY_DELAY_MS = 30_000;
const MAX_AUTO_RETRIES = 3;

/**
 * Exponential backoff: 30s, 60s, 120s. After three failed retries, give
 * up and surface the manual-retry banner — looping forever against a
 * server that has been down for two minutes is just noise.
 */
function computeNextRetryDelay(attempt: number): number | null {
  if (attempt >= MAX_AUTO_RETRIES) return null;
  return ERROR_RETRY_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Singleton timer / trigger slots.
 *
 * These live in module scope on purpose: the store itself is a Zustand
 * singleton (created via `create<>` at module load) and there is only ever
 * one Journey Flow Editor mounted in the app at a time. Tests rely on
 * `useFlowEditorStore.getState().reset()` in their `beforeEach`/`afterEach`
 * to drop these between cases. If a future feature needs two editors
 * mounted simultaneously (split-screen, preview-in-modal, etc.), these
 * need to move into `set`/`get` state so each store instance owns its own
 * timers — until then, single-instance is the contract.
 */
let autosaveTimerId: ReturnType<typeof setTimeout> | null = null;
let idbWriteTimerId: ReturnType<typeof setTimeout> | null = null;
let errorRetryTimerId: ReturnType<typeof setTimeout> | null = null;
let pendingSaveTrigger: (() => void) | null = null;

function clearAutosaveTimer(): void {
  if (autosaveTimerId !== null) {
    clearTimeout(autosaveTimerId);
    autosaveTimerId = null;
  }
}

function clearIdbWriteTimer(): void {
  if (idbWriteTimerId !== null) {
    clearTimeout(idbWriteTimerId);
    idbWriteTimerId = null;
  }
}

function clearErrorRetryTimer(): void {
  if (errorRetryTimerId !== null) {
    clearTimeout(errorRetryTimerId);
    errorRetryTimerId = null;
  }
}

function scheduleIdbWrite(journeyId: string, snapshot: FlowSnapshot): void {
  clearIdbWriteTimer();
  idbWriteTimerId = setTimeout(() => {
    void saveSnapshot(journeyId, {
      nodes: snapshot.nodes,
      edges: snapshot.edges,
    });
    idbWriteTimerId = null;
  }, IDB_DEBOUNCE_MS);
}

/**
 * Strip volatile fields that xyflow attaches at render time. These reflect
 * pure UI state (selection ring, DOM measurements, in-flight drag), NOT a
 * user-intended edit, so they must not contribute to dirty detection nor
 * be persisted to the server. Persisting `selected:true` was particularly
 * harmful — every saved node came back selected on the next load, which
 * fired a `select` change, which the snapshot diff treated as a real
 * edit, which marked the editor dirty before the user touched anything.
 */
export function stripVolatileNodeFields(node: Node): Node {
  const copy = { ...node } as Record<string, unknown>;
  delete copy.selected;
  delete copy.measured;
  delete copy.dragging;
  return copy as Node;
}

export function normalizeNodesForPersist(nodes: Node[]): Node[] {
  return nodes.map(stripVolatileNodeFields);
}

function normalizeSnapshotForCompare(s: FlowSnapshot): FlowSnapshot {
  return { ...s, nodes: normalizeNodesForPersist(s.nodes) };
}

function snapshotsEqual(a: FlowSnapshot | null, b: FlowSnapshot | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    JSON.stringify(normalizeSnapshotForCompare(a)) ===
    JSON.stringify(normalizeSnapshotForCompare(b))
  );
}

function armAutosaveTimer(): void {
  clearAutosaveTimer();
  if (pendingSaveTrigger) {
    const trigger = pendingSaveTrigger;
    autosaveTimerId = setTimeout(() => {
      autosaveTimerId = null;
      trigger();
    }, DEFAULT_AUTOSAVE_DELAY_MS);
  }
}

export const useFlowEditorStore = create<FlowEditorState>((set, get) => {
  /**
   * Internal: apply a partial snapshot update with full dirty / autosave /
   * IDB plumbing. Single source of the dirty-state side effects so the two
   * public actions (`setFlow`, `setVariables`) cannot diverge.
   */
  const applyEdit = (patch: Partial<FlowSnapshot>): void => {
    const state = get();
    if (!state.currentSnapshot || !state.journeyId) return;

    const next: FlowSnapshot = {
      ...state.currentSnapshot,
      ...patch,
    };

    if (snapshotsEqual(next, state.currentSnapshot)) return;

    const becameDirty = !snapshotsEqual(next, state.serverSnapshot);

    set({
      currentSnapshot: next,
      status: becameDirty ? 'dirty' : 'idle',
      lastError: null,
      retryScheduled: false,
      nextRetryDelayMs: null,
      retryAttempt: 0,
    });

    if (becameDirty) {
      scheduleIdbWrite(state.journeyId, next);
      clearErrorRetryTimer();
      armAutosaveTimer();
    }
  };

  return {
    journeyId: null,
    status: 'idle',
    lastSavedAt: null,
    lastError: null,
    retryScheduled: false,
    nextRetryDelayMs: null,
    retryAttempt: 0,
    serverSnapshot: null,
    currentSnapshot: null,
    recoveryCandidate: null,
    recoveryEpoch: 0,

    hydrate: ({ journeyId, server, lastSavedAt, recovery }) => {
      clearAutosaveTimer();
      clearIdbWriteTimer();
      clearErrorRetryTimer();

      let recoveryCandidate: FlowEditorState['recoveryCandidate'] = null;
      if (recovery) {
        const recoveryPayload = recovery.payload as unknown as FlowSnapshot;
        const newerThanServer = !lastSavedAt || recovery.timestamp > lastSavedAt.getTime();
        const divergesFromServer = !snapshotsEqual(recoveryPayload, server);
        if (newerThanServer && divergesFromServer) {
          recoveryCandidate = {
            snapshot: recoveryPayload,
            timestamp: new Date(recovery.timestamp),
          };
        }
      }

      set({
        journeyId,
        status: 'idle',
        lastSavedAt,
        lastError: null,
        retryScheduled: false,
        nextRetryDelayMs: null,
        retryAttempt: 0,
        serverSnapshot: server,
        currentSnapshot: server,
        recoveryCandidate,
        recoveryEpoch: 0,
      });
    },

    reset: () => {
      clearAutosaveTimer();
      clearIdbWriteTimer();
      clearErrorRetryTimer();
      pendingSaveTrigger = null;
      set({
        journeyId: null,
        status: 'idle',
        lastSavedAt: null,
        lastError: null,
        retryScheduled: false,
        nextRetryDelayMs: null,
        retryAttempt: 0,
        serverSnapshot: null,
        currentSnapshot: null,
        recoveryCandidate: null,
        recoveryEpoch: 0,
      });
    },

    setFlow: (nodes, edges) => applyEdit({ nodes, edges }),

    beginSave: (opts) => {
      clearAutosaveTimer();
      clearErrorRetryTimer();
      set({
        status: 'saving',
        lastError: null,
        retryScheduled: false,
        nextRetryDelayMs: null,
        ...(opts?.resetRetryBudget ? { retryAttempt: 0 } : {}),
      });
    },

    commitSave: (savedAt, syncedSnapshot) => {
      const state = get();

      clearAutosaveTimer();
      clearErrorRetryTimer();

      const current = state.currentSnapshot ?? state.serverSnapshot;
      const diverged = current ? !snapshotsEqual(current, syncedSnapshot) : false;

      if (diverged && current && state.journeyId) {
        // User edited mid-save. Honour atomicity: stay dirty so the next
        // autosave picks up the unsynced edits. Keep the IDB snapshot in
        // place (don't clear it) so a tab-close before the next save still
        // recovers the unsynced data.
        set({
          status: 'dirty',
          lastSavedAt: savedAt,
          lastError: null,
          retryScheduled: false,
          nextRetryDelayMs: null,
          retryAttempt: 0,
          serverSnapshot: syncedSnapshot,
        });
        scheduleIdbWrite(state.journeyId, current);
        armAutosaveTimer();
        persistLastSavedAt(state.journeyId, savedAt);
        return;
      }

      clearIdbWriteTimer();
      set({
        status: 'idle',
        lastSavedAt: savedAt,
        lastError: null,
        retryScheduled: false,
        nextRetryDelayMs: null,
        retryAttempt: 0,
        serverSnapshot: syncedSnapshot,
      });

      if (state.journeyId) {
        void clearSnapshot(state.journeyId);
        persistLastSavedAt(state.journeyId, savedAt);
      }
    },

    failSave: (message) => {
      clearErrorRetryTimer();
      const state = get();
      const attempt = state.retryAttempt;
      const delay = computeNextRetryDelay(attempt);
      const willRetry = pendingSaveTrigger !== null && delay !== null;

      set({
        status: 'error',
        lastError: message,
        retryScheduled: willRetry,
        nextRetryDelayMs: willRetry ? delay : null,
      });

      // AC#4 with bounded backoff: schedule an auto-retry at 30s, then
      // 60s, then 120s. After the 3rd failed retry we stop scheduling and
      // the banner switches to "click Save to try again" — infinite retry
      // against a server that has been down for minutes is just noise.
      // Any manual save / new edit / commit resets `retryAttempt` to 0.
      if (willRetry && delay !== null) {
        errorRetryTimerId = setTimeout(() => {
          errorRetryTimerId = null;
          // Re-check that we still have a trigger AND status is still error.
          // The trigger we captured at failSave time could be stale if the
          // consumer's effect cycle re-registered between failure and retry.
          if (pendingSaveTrigger && get().status === 'error') {
            set({ retryAttempt: attempt + 1 });
            pendingSaveTrigger();
          } else if (!pendingSaveTrigger) {
            // Trigger gone (component unmounted / re-registered). Mark the
            // banner as no-longer-truthful so it does not keep promising.
            set({ retryScheduled: false, nextRetryDelayMs: null });
          } else {
            // Status moved on, retry obsolete.
            set({ retryScheduled: false, nextRetryDelayMs: null });
          }
        }, delay);
      }
    },

    acceptRecovery: () => {
      const state = get();
      if (!state.recoveryCandidate || !state.journeyId) return;

      const snapshot = state.recoveryCandidate.snapshot;
      set({
        currentSnapshot: snapshot,
        status: 'dirty',
        recoveryCandidate: null,
        lastError: null,
        retryScheduled: false,
        nextRetryDelayMs: null,
        retryAttempt: 0,
        recoveryEpoch: state.recoveryEpoch + 1,
      });

      // The recovery snapshot is already in IDB (we read it from there).
      // Skip the redundant write that would otherwise re-set the
      // 7-day clock and queue an unnecessary IndexedDB op.
      clearErrorRetryTimer();
      armAutosaveTimer();
    },

    rejectRecovery: () => {
      const state = get();
      if (state.journeyId) {
        void clearSnapshot(state.journeyId);
      }
      set({ recoveryCandidate: null });
    },
  };
});

/**
 * Register the save trigger that the autosave / retry timers should call.
 *
 * The store cannot call the consumer's save handler directly because the
 * handler typically lives in a React component and depends on hooks/closure
 * (the journey service, toast helpers, route navigation). Consumer registers
 * its trigger on mount and clears it on unmount.
 *
 * Returns an unregister function that ALSO cancels any pending autosave or
 * retry timer — otherwise a retry captured at failSave time could fire after
 * the consumer's effect already moved on, executing a stale closure.
 */
export function registerAutosaveTrigger(trigger: () => void): () => void {
  pendingSaveTrigger = trigger;
  return () => {
    if (pendingSaveTrigger === trigger) {
      pendingSaveTrigger = null;
    }
    clearAutosaveTimer();
    clearErrorRetryTimer();
  };
}

/** Constants exposed for tests and consumer code. */
export const FLOW_EDITOR_AUTOSAVE_DELAY_MS = DEFAULT_AUTOSAVE_DELAY_MS;
export const FLOW_EDITOR_IDB_DEBOUNCE_MS = IDB_DEBOUNCE_MS;
export const FLOW_EDITOR_ERROR_RETRY_DELAY_MS = ERROR_RETRY_DELAY_MS;
export const FLOW_EDITOR_MAX_AUTO_RETRIES = MAX_AUTO_RETRIES;
