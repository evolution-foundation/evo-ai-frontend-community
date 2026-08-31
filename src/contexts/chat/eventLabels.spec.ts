import { describe, it, expect } from 'vitest';
import { mapEventLabels } from './eventLabels';

const CREATED_AT = '2026-08-14T10:00:00Z';
const UPDATED_AT = '2026-08-14T11:00:00Z';

// Covers the mapper only. The merge itself (the `title && color` guard and the
// empty-list override in ChatContext) needs the whole provider to exercise.
describe('mapEventLabels', () => {
  it('takes the real title and colour from labels_data', () => {
    const result = mapEventLabels(
      [{ id: 'a1', title: 'urgente', color: '#ff0000' }],
      ['urgente'],
      CREATED_AT,
      UPDATED_AT
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
    expect(result[0].title).toBe('urgente');
    expect(result[0].color).toBe('#ff0000');
  });

  it('lets labels_data win even when it is shorter than labels (orphan tag)', () => {
    const result = mapEventLabels(
      [{ id: 'a1', title: 'urgente', color: '#ff0000' }],
      ['urgente', 'b0b0b0b0-0000-0000-0000-000000000000'],
      CREATED_AT,
      UPDATED_AT
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });

  it('coerces the epoch timestamp instead of leaving a number in a string field', () => {
    const result = mapEventLabels([{ id: 'a1', title: 'urgente', color: '#ff0000' }], [], 1755172800, 1755176400);

    expect(typeof result[0].created_at).toBe('string');
    expect(result[0].created_at).toBe('1755172800');
  });

  it('returns an empty list for an empty labels_data, so a removal reflects', () => {
    expect(mapEventLabels([], ['urgente'], CREATED_AT, UPDATED_AT)).toEqual([]);
  });

  it('falls back to the titles when the backend does not send labels_data', () => {
    const result = mapEventLabels(undefined, ['urgente'], CREATED_AT, UPDATED_AT);

    expect(result[0].id).toBe('urgente');
    expect(result[0].title).toBe('urgente');
    expect(result[0].color).toBe('');
  });

  it('keeps id, title and colour of an object in the legacy field', () => {
    const result = mapEventLabels(
      undefined,
      [{ id: 'a1', title: 'urgente', color: '#ff0000', show_on_sidebar: true }],
      CREATED_AT,
      UPDATED_AT
    );

    expect(result[0]).toMatchObject({ id: 'a1', title: 'urgente', color: '#ff0000', show_on_sidebar: true });
  });

  it('does not break when the payload carries neither field', () => {
    expect(mapEventLabels(undefined, undefined, CREATED_AT, UPDATED_AT)).toEqual([]);
  });
});
