import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  persistLastSavedAt,
  loadLastSavedAt,
  clearLastSavedAt,
} from './lastSavedMark';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('lastSavedMark', () => {
  it('returns null when no mark has been persisted for the journey', () => {
    expect(loadLastSavedAt('journey-1')).toBeNull();
  });

  it('round-trips a persisted mark to a Date with matching getTime()', () => {
    const when = new Date('2026-05-20T13:45:00Z');
    persistLastSavedAt('journey-1', when);
    const loaded = loadLastSavedAt('journey-1');

    expect(loaded).not.toBeNull();
    expect(loaded!.getTime()).toBe(when.getTime());
  });

  it('isolates marks across journey ids', () => {
    persistLastSavedAt('journey-1', new Date('2026-05-20T13:00:00Z'));
    persistLastSavedAt('journey-2', new Date('2026-05-20T15:00:00Z'));

    expect(loadLastSavedAt('journey-1')!.getTime()).toBe(
      new Date('2026-05-20T13:00:00Z').getTime(),
    );
    expect(loadLastSavedAt('journey-2')!.getTime()).toBe(
      new Date('2026-05-20T15:00:00Z').getTime(),
    );
  });

  it('overwrites the previous mark when called again for the same journey', () => {
    persistLastSavedAt('journey-1', new Date('2026-05-20T13:00:00Z'));
    persistLastSavedAt('journey-1', new Date('2026-05-20T13:15:00Z'));

    expect(loadLastSavedAt('journey-1')!.getTime()).toBe(
      new Date('2026-05-20T13:15:00Z').getTime(),
    );
  });

  it('clears a mark and stops returning it', () => {
    persistLastSavedAt('journey-1', new Date('2026-05-20T13:00:00Z'));
    clearLastSavedAt('journey-1');

    expect(loadLastSavedAt('journey-1')).toBeNull();
  });

  it('drops marks older than 30 days and returns null', () => {
    const baseline = new Date('2026-05-01T00:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(baseline);
    persistLastSavedAt('journey-1', new Date(baseline));

    vi.spyOn(Date, 'now').mockReturnValue(baseline + 31 * 24 * 60 * 60 * 1000);
    expect(loadLastSavedAt('journey-1')).toBeNull();
  });

  it('ignores corrupted localStorage values gracefully', () => {
    window.localStorage.setItem('evo-flow-editor:last-saved:journey-1', 'not-a-number');
    expect(loadLastSavedAt('journey-1')).toBeNull();
  });
});
