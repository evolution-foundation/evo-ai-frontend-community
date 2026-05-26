/**
 * Per-journey "last saved at" timestamp stored on the same device that
 * performed the save. We can't trust the server's `updatedAt` for the
 * Flow Builder header because it has been observed coming back stale
 * (or with a timezone offset) right after a successful save. Persisting
 * our own wall-clock at commit time and preferring it on next mount
 * gives a label the user can recognise as honest ("Saved 12 seconds ago"
 * instead of "Saved 2 hours ago"). Falls back to the server when the
 * mark is missing (e.g. first open on a different device).
 */

const NAMESPACE = 'evo-flow-editor:last-saved';
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

const keyFor = (journeyId: string) => `${NAMESPACE}:${journeyId}`;

export function persistLastSavedAt(journeyId: string, when: Date): void {
  try {
    window.localStorage.setItem(keyFor(journeyId), String(when.getTime()));
  } catch {
    // localStorage unavailable (private mode strict / quota / SSR);
    // header will gracefully fall back to the server timestamp.
  }
}

export function loadLastSavedAt(journeyId: string): Date | null {
  try {
    const raw = window.localStorage.getItem(keyFor(journeyId));
    if (!raw) return null;
    const ms = Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    if (Date.now() - ms > STALE_MS) {
      clearLastSavedAt(journeyId);
      return null;
    }
    return new Date(ms);
  } catch {
    return null;
  }
}

export function clearLastSavedAt(journeyId: string): void {
  try {
    window.localStorage.removeItem(keyFor(journeyId));
  } catch {
    /* see persistLastSavedAt */
  }
}
