import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export type FlowSnapshotPayload = {
  nodes: unknown[];
  edges: unknown[];
};

export type StoredFlowSnapshot = {
  payload: FlowSnapshotPayload;
  timestamp: number;
};

const NAMESPACE = 'evo-flow-editor';
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (journeyId: string) => `${NAMESPACE}:${journeyId}`;

export async function saveSnapshot(
  journeyId: string,
  payload: FlowSnapshotPayload,
): Promise<void> {
  try {
    // xyflow attaches non-serializable handlers (setNodes / setEdges closures)
    // to the live node and edge objects. structuredClone (used by IndexedDB
    // under the hood) cannot clone functions, so a raw put() throws
    // DataCloneError. JSON.parse(JSON.stringify(...)) strips functions
    // silently, which is fine: recovery only needs the plain data shape.
    const cleanPayload = JSON.parse(JSON.stringify(payload)) as FlowSnapshotPayload;
    const record: StoredFlowSnapshot = { payload: cleanPayload, timestamp: Date.now() };
    await idbSet(keyFor(journeyId), record);
  } catch (error) {
    // IndexedDB unavailable (private mode strict / quota / old browser) or
    // payload not even JSON-serialisable. Recovery becomes best-effort;
    // never block the editor.
    console.warn('[flowEditor] failed to persist snapshot to IndexedDB', error);
  }
}

export async function loadSnapshot(
  journeyId: string,
): Promise<StoredFlowSnapshot | null> {
  try {
    const record = await idbGet<StoredFlowSnapshot | undefined>(keyFor(journeyId));
    if (!record) return null;

    if (Date.now() - record.timestamp > STALE_MS) {
      await clearSnapshot(journeyId);
      return null;
    }

    return record;
  } catch (error) {
    console.warn('[flowEditor] failed to read snapshot from IndexedDB', error);
    return null;
  }
}

export async function clearSnapshot(journeyId: string): Promise<void> {
  try {
    await idbDel(keyFor(journeyId));
  } catch (error) {
    console.warn('[flowEditor] failed to clear snapshot from IndexedDB', error);
  }
}
