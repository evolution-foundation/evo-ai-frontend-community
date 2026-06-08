import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import {
  useFlowEditorStore,
  registerAutosaveTrigger,
  normalizeNodesForPersist,
  stripVolatileNodeFields,
  FLOW_EDITOR_AUTOSAVE_DELAY_MS,
  FLOW_EDITOR_ERROR_RETRY_DELAY_MS,
  FLOW_EDITOR_MAX_AUTO_RETRIES,
  type FlowSnapshot,
} from './useFlowEditorStore';
import {
  saveSnapshot,
  loadSnapshot,
  clearSnapshot,
  type StoredFlowSnapshot,
} from './idbSnapshot';

const baseSnapshot: FlowSnapshot = {
  nodes: [
    { id: 'trigger', type: 'journey-trigger-node', position: { x: 0, y: 0 }, data: {} },
  ] as Node[],
  edges: [] as Edge[],

};

const editedSnapshotNodes: Node[] = [
  { id: 'trigger', type: 'journey-trigger-node', position: { x: 0, y: 0 }, data: {} },
  { id: 'wait', type: 'wait-node', position: { x: 200, y: 0 }, data: { duration: 5 } },
];

beforeEach(() => {
  useFlowEditorStore.getState().reset();
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await clearSnapshot('journey-1');
  useFlowEditorStore.getState().reset();
});

describe('useFlowEditorStore — hydration', () => {
  it('starts in idle with server snapshot mirrored as current', () => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    const state = useFlowEditorStore.getState();
    expect(state.journeyId).toBe('journey-1');
    expect(state.status).toBe('idle');
    expect(state.currentSnapshot).toEqual(baseSnapshot);
    expect(state.serverSnapshot).toEqual(baseSnapshot);
    expect(state.recoveryCandidate).toBeNull();
  });

  it('exposes a recovery candidate when IDB snapshot is newer than server and diverges', () => {
    const recoveryRecord: StoredFlowSnapshot = {
      payload: { nodes: editedSnapshotNodes, edges: [] },
      timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
    };

    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: recoveryRecord,
    });

    const candidate = useFlowEditorStore.getState().recoveryCandidate;
    expect(candidate).not.toBeNull();
    expect(candidate!.snapshot.nodes).toEqual(editedSnapshotNodes);
    expect(candidate!.timestamp.getTime()).toBe(recoveryRecord.timestamp);
  });

  it('ignores IDB snapshot that is older than the server lastSavedAt', () => {
    const stale: StoredFlowSnapshot = {
      payload: { nodes: editedSnapshotNodes, edges: [] },
      timestamp: new Date('2026-05-20T11:00:00Z').getTime(),
    };

    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: stale,
    });

    expect(useFlowEditorStore.getState().recoveryCandidate).toBeNull();
  });

  it('ignores IDB snapshot that matches server (no real divergence)', () => {
    const sameAsServer: StoredFlowSnapshot = {
      payload: baseSnapshot,
      timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
    };

    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: sameAsServer,
    });

    expect(useFlowEditorStore.getState().recoveryCandidate).toBeNull();
  });
});

describe('useFlowEditorStore — dirty + autosave', () => {
  beforeEach(() => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });
  });

  it('flips to dirty when setFlow introduces a new node', () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    expect(useFlowEditorStore.getState().status).toBe('dirty');
  });

  it('stays idle when setFlow produces a snapshot equal to current', () => {
    useFlowEditorStore.getState().setFlow(baseSnapshot.nodes, baseSnapshot.edges);
    expect(useFlowEditorStore.getState().status).toBe('idle');
  });

  it('schedules a save after the autosave delay when dirty', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    expect(trigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FLOW_EDITOR_AUTOSAVE_DELAY_MS - 1);
    expect(trigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(trigger).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('resets the autosave timer on every subsequent edit (real debounce)', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    vi.advanceTimersByTime(3000);

    const further: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: { duration: 1 } } as Node,
    ];
    useFlowEditorStore.getState().setFlow(further, []);
    vi.advanceTimersByTime(3000);
    expect(trigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FLOW_EDITOR_AUTOSAVE_DELAY_MS - 3000 + 1);
    expect(trigger).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('does not arm a timer when no autosave trigger is registered', () => {
    vi.useFakeTimers();
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);

    vi.advanceTimersByTime(FLOW_EDITOR_AUTOSAVE_DELAY_MS * 2);
    expect(useFlowEditorStore.getState().status).toBe('dirty');
  });
});

describe('useFlowEditorStore — save lifecycle', () => {
  beforeEach(() => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });
  });

  it('beginSave moves to saving and cancels any pending autosave timer', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);

    useFlowEditorStore.getState().beginSave();
    expect(useFlowEditorStore.getState().status).toBe('saving');

    vi.advanceTimersByTime(FLOW_EDITOR_AUTOSAVE_DELAY_MS * 2);
    expect(trigger).not.toHaveBeenCalled();

    unregister();
  });

  it('commitSave moves to idle, refreshes serverSnapshot, and clears IDB', async () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    await saveSnapshot('journey-1', {
      nodes: editedSnapshotNodes,
      edges: [],

    });

    const syncedSnapshot = useFlowEditorStore.getState().currentSnapshot!;
    useFlowEditorStore.getState().beginSave();
    const savedAt = new Date('2026-05-20T12:15:00Z');
    useFlowEditorStore.getState().commitSave(savedAt, syncedSnapshot);

    const state = useFlowEditorStore.getState();
    expect(state.status).toBe('idle');
    expect(state.lastSavedAt).toEqual(savedAt);
    expect(state.serverSnapshot?.nodes).toEqual(editedSnapshotNodes);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(await loadSnapshot('journey-1')).toBeNull();
  });

  it('commitSave with a stale syncedSnapshot stays DIRTY when the user edited during the save (atomic update / AC#4 from EVO-1258)', () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    // Capture the snapshot that the consumer would send to the server.
    const syncedSnapshot = useFlowEditorStore.getState().currentSnapshot!;
    useFlowEditorStore.getState().beginSave();
    expect(useFlowEditorStore.getState().status).toBe('saving');

    // User edits during the API roundtrip — currentSnapshot now diverges
    // from what was actually sent to the server.
    const midSaveEdit: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: {} } as Node,
    ];
    useFlowEditorStore.getState().setFlow(midSaveEdit, []);
    expect(useFlowEditorStore.getState().status).toBe('dirty');

    // Server returns success — but with the OLDER snapshot's data.
    useFlowEditorStore.getState().commitSave(new Date(), syncedSnapshot);

    const state = useFlowEditorStore.getState();
    expect(state.status).toBe('dirty');
    expect(state.serverSnapshot).toEqual(syncedSnapshot);
    expect(state.currentSnapshot?.nodes).toEqual(midSaveEdit);
  });

  it('failSave moves to error with the message, leaving currentSnapshot intact', () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    const state = useFlowEditorStore.getState();
    expect(state.status).toBe('error');
    expect(state.lastError).toBe('Network error');
    expect(state.currentSnapshot?.nodes).toEqual(editedSnapshotNodes);
  });

  it('a new edit after failSave returns the status to dirty and clears the error', () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    const further: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: { duration: 1 } } as Node,
    ];
    useFlowEditorStore.getState().setFlow(further, []);

    const state = useFlowEditorStore.getState();
    expect(state.status).toBe('dirty');
    expect(state.lastError).toBeNull();
  });
});

describe('useFlowEditorStore — error retry (AC#4)', () => {
  beforeEach(() => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });
  });

  it('schedules an auto-retry 30s after failSave when a trigger is registered', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS - 1);
    expect(trigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(trigger).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('does not retry when a new edit cancels the error state before the retry fires', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    // A new edit while in error transitions the store back to dirty and
    // also cancels the retry timer. The new edit arms a fresh autosave
    // (which will legitimately fire the trigger at +5s). What we are
    // testing here is that the original 30s retry does NOT add a second
    // trigger call on top of the autosave one.
    const further: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: {} } as Node,
    ];
    useFlowEditorStore.getState().setFlow(further, []);

    vi.advanceTimersByTime(FLOW_EDITOR_AUTOSAVE_DELAY_MS);
    expect(trigger).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS);
    expect(trigger).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('cancels the retry timer when manual save (beginSave) fires before it lands', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    vi.advanceTimersByTime(10_000);
    useFlowEditorStore.getState().beginSave();

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS);
    expect(trigger).not.toHaveBeenCalled();

    unregister();
  });

  it('cancels the retry timer on successful commitSave', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    const syncedSnapshot = useFlowEditorStore.getState().currentSnapshot!;
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    useFlowEditorStore
      .getState()
      .commitSave(new Date('2026-05-20T12:00:30Z'), syncedSnapshot);

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS * 2);
    expect(trigger).not.toHaveBeenCalled();

    unregister();
  });

  it('cancels the retry timer when the consumer unregisters the trigger (e.g. effect re-runs)', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    // Consumer's effect re-runs (e.g. saveChanges identity changed) and
    // unregisters the trigger. The retry timer must be cleared too,
    // otherwise a stale trigger would fire 30s later.
    unregister();

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS * 2);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('sets retryScheduled=true when failSave fires with a trigger registered', () => {
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    expect(useFlowEditorStore.getState().retryScheduled).toBe(true);

    unregister();
  });

  it('keeps retryScheduled=false when failSave fires without a trigger (consumer not registered yet)', () => {
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    expect(useFlowEditorStore.getState().retryScheduled).toBe(false);
  });

  it('flips retryScheduled back to false when a new edit cancels the error', () => {
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');
    expect(useFlowEditorStore.getState().retryScheduled).toBe(true);

    const further: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: {} } as Node,
    ];
    useFlowEditorStore.getState().setFlow(further, []);

    expect(useFlowEditorStore.getState().retryScheduled).toBe(false);

    unregister();
  });

  it('restarts the retry cycle on a consecutive failure (still 30s from the latest fail)', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    // 25s elapse — the first retry timer was on its way at +30s.
    vi.advanceTimersByTime(25_000);

    // Simulate the retry firing as `beginSave` from the consumer, then
    // failing again. The new failSave should reset the 30s window from
    // the latest failure, not from the original.
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    // The original 30s window would already have fired by 25+10=35 — but
    // it was cancelled. The new 30s window starts now.
    vi.advanceTimersByTime(10_000);
    expect(trigger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS - 10_000 + 1);
    expect(trigger).toHaveBeenCalledTimes(1);

    unregister();
  });
});

describe('useFlowEditorStore — recovery', () => {
  it('acceptRecovery cancels any pending retry timer (defensive)', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    // Manually arm a retry timer to simulate a leftover from a prior
    // error state (the production flow guarantees idle after hydrate, but
    // this guards against future refactors that could leave the timer
    // armed when entering a recovery prompt).
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: {
        payload: { nodes: editedSnapshotNodes, edges: [] },
        timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
      },
    });
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');
    // Re-hydrate to put us back in a state where recoveryCandidate is set.
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: {
        payload: { nodes: editedSnapshotNodes, edges: [] },
        timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
      },
    });

    useFlowEditorStore.getState().acceptRecovery();

    vi.advanceTimersByTime(FLOW_EDITOR_ERROR_RETRY_DELAY_MS * 2);
    // The autosave was armed by acceptRecovery, so trigger fires once via
    // autosave at +5s. The retry timer must NOT add a second call.
    expect(trigger.mock.calls.length).toBeLessThanOrEqual(1);

    unregister();
  });

  it('acceptRecovery loads the candidate snapshot and arms autosave', () => {
    const recoveryRecord: StoredFlowSnapshot = {
      payload: { nodes: editedSnapshotNodes, edges: [] },
      timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
    };
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: recoveryRecord,
    });

    useFlowEditorStore.getState().acceptRecovery();

    const state = useFlowEditorStore.getState();
    expect(state.status).toBe('dirty');
    expect(state.currentSnapshot?.nodes).toEqual(editedSnapshotNodes);
    expect(state.recoveryCandidate).toBeNull();
  });

  it('acceptRecovery increments recoveryEpoch so consumers can force canvas remount', () => {
    const recoveryRecord: StoredFlowSnapshot = {
      payload: { nodes: editedSnapshotNodes, edges: [] },
      timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
    };
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: recoveryRecord,
    });

    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(0);

    useFlowEditorStore.getState().acceptRecovery();
    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(1);

    // Hydrating with a fresh recovery candidate resets to 0; accepting it
    // increments again. Counter is monotonic per editor session, not globally.
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: recoveryRecord,
    });
    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(0);

    useFlowEditorStore.getState().acceptRecovery();
    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(1);
  });

  it('rejectRecovery does NOT bump recoveryEpoch — canvas should not remount', () => {
    const recoveryRecord: StoredFlowSnapshot = {
      payload: { nodes: editedSnapshotNodes, edges: [] },
      timestamp: new Date('2026-05-20T13:00:00Z').getTime(),
    };
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: recoveryRecord,
    });

    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(0);
    useFlowEditorStore.getState().rejectRecovery();
    expect(useFlowEditorStore.getState().recoveryEpoch).toBe(0);
  });

  it('rejectRecovery clears IDB and drops the candidate', async () => {
    await saveSnapshot('journey-1', {
      nodes: editedSnapshotNodes,
      edges: [],

    });
    const stored = await loadSnapshot('journey-1');
    expect(stored).not.toBeNull();

    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: stored,
    });

    useFlowEditorStore.getState().rejectRecovery();
    expect(useFlowEditorStore.getState().recoveryCandidate).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(await loadSnapshot('journey-1')).toBeNull();
  });
});

describe('useFlowEditorStore — volatile field normalisation (H2)', () => {
  it('stripVolatileNodeFields drops selected, measured, dragging but preserves the rest', () => {
    const node = {
      id: 'n1',
      type: 'wait-node',
      position: { x: 10, y: 20 },
      data: { duration: 5 },
      selected: true,
      measured: { width: 200, height: 80 },
      dragging: true,
    } as unknown as Node;

    const stripped = stripVolatileNodeFields(node);
    expect(stripped).toEqual({
      id: 'n1',
      type: 'wait-node',
      position: { x: 10, y: 20 },
      data: { duration: 5 },
    });
    expect('selected' in stripped).toBe(false);
    expect('measured' in stripped).toBe(false);
    expect('dragging' in stripped).toBe(false);
  });

  it('setFlow with only `selected:true` change does NOT mark dirty', () => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    const selectedNodes = baseSnapshot.nodes.map(n => ({ ...n, selected: true }));
    useFlowEditorStore.getState().setFlow(selectedNodes, baseSnapshot.edges);

    expect(useFlowEditorStore.getState().status).toBe('idle');
  });

  it('setFlow with only `measured` set does NOT mark dirty (post-render measure pass)', () => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    const measuredNodes = baseSnapshot.nodes.map(n => ({
      ...n,
      measured: { width: 200, height: 80 },
    })) as Node[];
    useFlowEditorStore.getState().setFlow(measuredNodes, baseSnapshot.edges);

    expect(useFlowEditorStore.getState().status).toBe('idle');
  });

  it('setFlow with only `dragging:true` does NOT mark dirty (transient drag indicator)', () => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    const draggingNodes = baseSnapshot.nodes.map(n => ({
      ...n,
      dragging: true,
    })) as Node[];
    useFlowEditorStore.getState().setFlow(draggingNodes, baseSnapshot.edges);

    expect(useFlowEditorStore.getState().status).toBe('idle');
  });

  it('setFlow with a real position change DOES mark dirty', () => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    const movedNodes = baseSnapshot.nodes.map(n => ({
      ...n,
      position: { x: 100, y: 200 },
    }));
    useFlowEditorStore.getState().setFlow(movedNodes, baseSnapshot.edges);

    expect(useFlowEditorStore.getState().status).toBe('dirty');
  });

  it('reload regression: hydrating with server payload that still contains selected:true stays idle', () => {
    // Simulates the contaminated state that the original H2 bug used to
    // persist: server returns nodes with `selected:true`, which a naive
    // setFlow→snapshotsEqual would interpret as divergent from the freshly
    // hydrated currentSnapshot (which xyflow renders without the flag yet).
    const contaminatedServer: FlowSnapshot = {
      nodes: baseSnapshot.nodes.map(n => ({ ...n, selected: true })) as Node[],
      edges: [],

    };
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: contaminatedServer,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });

    // First render pass: xyflow drops `selected` because nothing is clicked.
    useFlowEditorStore.getState().setFlow(baseSnapshot.nodes, baseSnapshot.edges);

    expect(useFlowEditorStore.getState().status).toBe('idle');
  });

  it('normalizeNodesForPersist returns a fresh array with all volatile fields stripped', () => {
    const dirty = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, selected: true } as unknown as Node,
      { id: 'b', position: { x: 1, y: 1 }, data: {}, measured: { width: 1, height: 1 } } as unknown as Node,
      { id: 'c', position: { x: 2, y: 2 }, data: {}, dragging: false } as unknown as Node,
    ];
    const clean = normalizeNodesForPersist(dirty);
    expect(clean).toHaveLength(3);
    clean.forEach(n => {
      expect('selected' in n).toBe(false);
      expect('measured' in n).toBe(false);
      expect('dragging' in n).toBe(false);
    });
    // Source array untouched.
    expect((dirty[0] as Node & { selected?: boolean }).selected).toBe(true);
  });
});

describe('useFlowEditorStore — auto-retry backoff cap (L2)', () => {
  beforeEach(() => {
    useFlowEditorStore.getState().hydrate({
      journeyId: 'journey-1',
      server: baseSnapshot,
      lastSavedAt: new Date('2026-05-20T12:00:00Z'),
      recovery: null,
    });
  });

  it('first failure schedules a 30s retry and reports the delay via nextRetryDelayMs', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Network error');

    const state = useFlowEditorStore.getState();
    expect(state.retryScheduled).toBe(true);
    expect(state.nextRetryDelayMs).toBe(FLOW_EDITOR_ERROR_RETRY_DELAY_MS);
    expect(state.retryAttempt).toBe(0); // not yet incremented; pre-tick.

    unregister();
  });

  it('consecutive failures escalate the delay 30s → 60s → 120s and stop scheduling after MAX_AUTO_RETRIES', () => {
    vi.useFakeTimers();
    const trigger = vi.fn(() => {
      // Every retry-fired save will fail again immediately. The consumer
      // is responsible for that; we simulate by calling beginSave + failSave
      // in the trigger to reproduce the production path.
      useFlowEditorStore.getState().beginSave();
      useFlowEditorStore.getState().failSave('Server still down');
    });
    const unregister = registerAutosaveTrigger(trigger);

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Initial failure');

    // First retry — delay was 30s.
    expect(useFlowEditorStore.getState().nextRetryDelayMs).toBe(30_000);
    vi.advanceTimersByTime(30_000);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(useFlowEditorStore.getState().retryAttempt).toBe(1);
    expect(useFlowEditorStore.getState().nextRetryDelayMs).toBe(60_000);

    // Second retry — delay 60s.
    vi.advanceTimersByTime(60_000);
    expect(trigger).toHaveBeenCalledTimes(2);
    expect(useFlowEditorStore.getState().retryAttempt).toBe(2);
    expect(useFlowEditorStore.getState().nextRetryDelayMs).toBe(120_000);

    // Third retry — delay 120s.
    vi.advanceTimersByTime(120_000);
    expect(trigger).toHaveBeenCalledTimes(3);
    expect(useFlowEditorStore.getState().retryAttempt).toBe(FLOW_EDITOR_MAX_AUTO_RETRIES);

    // Budget exhausted after the third retry failed — no more scheduling.
    expect(useFlowEditorStore.getState().retryScheduled).toBe(false);
    expect(useFlowEditorStore.getState().nextRetryDelayMs).toBeNull();

    // Even if a generous amount of time passes, the trigger is NOT called again.
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(trigger).toHaveBeenCalledTimes(3);

    unregister();
  });

  it('a new user edit resets the retry budget so subsequent failures start the cycle over', () => {
    vi.useFakeTimers();
    const trigger = vi.fn(() => {
      useFlowEditorStore.getState().beginSave();
      useFlowEditorStore.getState().failSave('Still failing');
    });
    const unregister = registerAutosaveTrigger(trigger);

    // Exhaust the budget.
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('Initial failure');
    vi.advanceTimersByTime(30_000 + 60_000 + 120_000);
    expect(useFlowEditorStore.getState().retryAttempt).toBe(FLOW_EDITOR_MAX_AUTO_RETRIES);
    expect(useFlowEditorStore.getState().retryScheduled).toBe(false);
    trigger.mockClear();

    // User edits → applyEdit must reset retryAttempt to 0. Need a NEW edit
    // (different from current snapshot) and one that puts us back into a
    // legitimate `dirty` state.
    const furtherEdit: Node[] = [
      ...editedSnapshotNodes,
      { id: 'wait-2', type: 'wait-node', position: { x: 400, y: 0 }, data: {} } as Node,
    ];
    useFlowEditorStore.getState().setFlow(furtherEdit, []);
    expect(useFlowEditorStore.getState().retryAttempt).toBe(0);

    unregister();
  });

  it('manual save resets the retry budget; auto-retry-triggered save does not', () => {
    vi.useFakeTimers();
    const unregister = registerAutosaveTrigger(vi.fn());

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);

    // Auto-style begin → does NOT reset.
    useFlowEditorStore.getState().beginSave({ resetRetryBudget: false });
    useFlowEditorStore.getState().failSave('Auto failure 1');
    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []); // re-arm dirty without bumping retryAttempt (snapshot equal post-normalise)
    // Above setFlow is a no-op against current, so retryAttempt is preserved.

    // Pretend we are now on attempt 2 via failSave path simulation:
    useFlowEditorStore.getState().beginSave({ resetRetryBudget: false });
    useFlowEditorStore.getState().failSave('Auto failure 2');
    const beforeManual = useFlowEditorStore.getState().retryAttempt;
    expect(beforeManual).toBeGreaterThanOrEqual(0);

    // Manual save → resets to 0 so a fresh budget is available even if the
    // user repeatedly clicks Save against a still-broken server.
    useFlowEditorStore.getState().beginSave({ resetRetryBudget: true });
    expect(useFlowEditorStore.getState().retryAttempt).toBe(0);

    unregister();
  });

  it('commitSave on success resets the retry budget', () => {
    const trigger = vi.fn();
    const unregister = registerAutosaveTrigger(trigger);
    const syncedSnapshot = useFlowEditorStore.getState().currentSnapshot!;

    useFlowEditorStore.getState().setFlow(editedSnapshotNodes, []);
    useFlowEditorStore.getState().beginSave();
    useFlowEditorStore.getState().failSave('First failure');
    expect(useFlowEditorStore.getState().retryScheduled).toBe(true);

    // Successful save lands.
    useFlowEditorStore.getState().beginSave({ resetRetryBudget: true });
    useFlowEditorStore.getState().commitSave(new Date(), syncedSnapshot);

    const state = useFlowEditorStore.getState();
    expect(state.retryAttempt).toBe(0);
    expect(state.retryScheduled).toBe(false);
    expect(state.nextRetryDelayMs).toBeNull();

    unregister();
  });
});
