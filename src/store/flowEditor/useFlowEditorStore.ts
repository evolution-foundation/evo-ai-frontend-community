import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { JourneyVariable } from '@/components/journey/environment-manager';
import { saveSnapshot, clearSnapshot, type StoredFlowSnapshot } from './idbSnapshot';
import { persistLastSavedAt } from './lastSavedMark';

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
  variables: JourneyVariable[];
};

export type FlowEditorStatus = 'idle' | 'dirty' | 'saving' | 'error';

export type FlowEditorState = {
  journeyId: string | null;
  status: FlowEditorStatus;
  lastSavedAt: Date | null;
  lastError: string | null;
  serverSnapshot: FlowSnapshot | null;
  currentSnapshot: FlowSnapshot | null;
  recoveryCandidate: { snapshot: FlowSnapshot; timestamp: Date } | null;

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
  setVariables: (variables: JourneyVariable[]) => void;

  // Save lifecycle (driven by consumer — store provides transitions only)
  beginSave: () => void;
  commitSave: (savedAt: Date) => void;
  failSave: (message: string) => void;

  // Recovery
  acceptRecovery: () => void;
  rejectRecovery: () => void;
};

const DEFAULT_AUTOSAVE_DELAY_MS = 5000;
const IDB_DEBOUNCE_MS = 500;

let autosaveTimerId: ReturnType<typeof setTimeout> | null = null;
let idbWriteTimerId: ReturnType<typeof setTimeout> | null = null;
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

function scheduleIdbWrite(journeyId: string, snapshot: FlowSnapshot): void {
  clearIdbWriteTimer();
  idbWriteTimerId = setTimeout(() => {
    void saveSnapshot(journeyId, {
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      variables: snapshot.variables,
    });
    idbWriteTimerId = null;
  }, IDB_DEBOUNCE_MS);
}

function snapshotsEqual(a: FlowSnapshot | null, b: FlowSnapshot | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useFlowEditorStore = create<FlowEditorState>((set, get) => ({
  journeyId: null,
  status: 'idle',
  lastSavedAt: null,
  lastError: null,
  serverSnapshot: null,
  currentSnapshot: null,
  recoveryCandidate: null,

  hydrate: ({ journeyId, server, lastSavedAt, recovery }) => {
    clearAutosaveTimer();
    clearIdbWriteTimer();

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
      serverSnapshot: server,
      currentSnapshot: server,
      recoveryCandidate,
    });
  },

  reset: () => {
    clearAutosaveTimer();
    clearIdbWriteTimer();
    pendingSaveTrigger = null;
    set({
      journeyId: null,
      status: 'idle',
      lastSavedAt: null,
      lastError: null,
      serverSnapshot: null,
      currentSnapshot: null,
      recoveryCandidate: null,
    });
  },

  setFlow: (nodes, edges) => {
    const state = get();
    if (!state.currentSnapshot || !state.journeyId) return;

    const next: FlowSnapshot = {
      ...state.currentSnapshot,
      nodes,
      edges,
    };

    if (snapshotsEqual(next, state.currentSnapshot)) return;

    const becameDirty = !snapshotsEqual(next, state.serverSnapshot);

    set({
      currentSnapshot: next,
      status: becameDirty ? 'dirty' : 'idle',
      lastError: null,
    });

    if (becameDirty) {
      scheduleIdbWrite(state.journeyId, next);
      clearAutosaveTimer();
      if (pendingSaveTrigger) {
        const trigger = pendingSaveTrigger;
        autosaveTimerId = setTimeout(() => {
          autosaveTimerId = null;
          trigger();
        }, DEFAULT_AUTOSAVE_DELAY_MS);
      }
    }
  },

  setVariables: (variables) => {
    const state = get();
    if (!state.currentSnapshot || !state.journeyId) return;

    const next: FlowSnapshot = {
      ...state.currentSnapshot,
      variables,
    };

    if (snapshotsEqual(next, state.currentSnapshot)) return;

    const becameDirty = !snapshotsEqual(next, state.serverSnapshot);

    set({
      currentSnapshot: next,
      status: becameDirty ? 'dirty' : 'idle',
      lastError: null,
    });

    if (becameDirty) {
      scheduleIdbWrite(state.journeyId, next);
      clearAutosaveTimer();
      if (pendingSaveTrigger) {
        const trigger = pendingSaveTrigger;
        autosaveTimerId = setTimeout(() => {
          autosaveTimerId = null;
          trigger();
        }, DEFAULT_AUTOSAVE_DELAY_MS);
      }
    }
  },

  beginSave: () => {
    clearAutosaveTimer();
    set({ status: 'saving', lastError: null });
  },

  commitSave: (savedAt) => {
    const state = get();
    const baseline = state.currentSnapshot ?? state.serverSnapshot;

    clearAutosaveTimer();
    clearIdbWriteTimer();

    set({
      status: 'idle',
      lastSavedAt: savedAt,
      lastError: null,
      serverSnapshot: baseline,
    });

    if (state.journeyId) {
      void clearSnapshot(state.journeyId);
      persistLastSavedAt(state.journeyId, savedAt);
    }
  },

  failSave: (message) => {
    set({ status: 'error', lastError: message });
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
    });

    scheduleIdbWrite(state.journeyId, snapshot);
    clearAutosaveTimer();
    if (pendingSaveTrigger) {
      const trigger = pendingSaveTrigger;
      autosaveTimerId = setTimeout(() => {
        autosaveTimerId = null;
        trigger();
      }, DEFAULT_AUTOSAVE_DELAY_MS);
    }
  },

  rejectRecovery: () => {
    const state = get();
    if (state.journeyId) {
      void clearSnapshot(state.journeyId);
    }
    set({ recoveryCandidate: null });
  },
}));

/**
 * Register the save trigger that the autosave timer should call.
 *
 * The store cannot call the consumer's save handler directly because the
 * handler typically lives in a React component and depends on hooks/closure
 * (the journey service, toast helpers, route navigation). Consumer registers
 * its trigger on mount and clears it on unmount.
 *
 * Returns an unregister function.
 */
export function registerAutosaveTrigger(trigger: () => void): () => void {
  pendingSaveTrigger = trigger;
  return () => {
    if (pendingSaveTrigger === trigger) {
      pendingSaveTrigger = null;
    }
    clearAutosaveTimer();
  };
}

/** Constants exposed for tests and consumer code. */
export const FLOW_EDITOR_AUTOSAVE_DELAY_MS = DEFAULT_AUTOSAVE_DELAY_MS;
export const FLOW_EDITOR_IDB_DEBOUNCE_MS = IDB_DEBOUNCE_MS;
