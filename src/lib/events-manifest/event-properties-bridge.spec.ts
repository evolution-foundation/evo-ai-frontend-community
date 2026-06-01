import { describe, it, expect, vi } from 'vitest';
import {
  propertiesToRecord,
  recordToProperties,
  validateEventProperties,
  preserveCompatibleValues,
  type EventProperty,
} from './event-properties-bridge';

// Unit-test the bridge against a synthetic catalog so the assertions don't drift
// with the real manifest AND so a genuine type-mismatch pair exists (the real
// catalog happens to use the same type for every shared key name). The fake
// keeps the names the spec calls out (`message.delivered` / `message_id`).
vi.mock('./index', () => {
  const FAKE: Record<string, { schema: { required: Record<string, { type: string }>; optional: Record<string, { type: string }> } }> = {
    'message.delivered': {
      schema: { required: { message_id: { type: 'uuid' } }, optional: { status: { type: 'string' } } },
    },
    'message.read': {
      schema: { required: { message_id: { type: 'uuid' } }, optional: { status: { type: 'string' } } },
    },
    // `status` is a number here → type-incompatible with message.delivered's string.
    'number.event': {
      schema: { required: {}, optional: { status: { type: 'number' }, count: { type: 'number' } } },
    },
    custom: { schema: { required: {}, optional: {} } },
  };
  return {
    getEvent: (name: string) => FAKE[name],
    isCustomEvent: (name: string) => name === 'custom',
  };
});

describe('propertiesToRecord / recordToProperties round-trip', () => {
  it('round-trips an all-Equals array', () => {
    const props: EventProperty[] = [
      { path: 'message_id', operator: { type: 'Equals', value: 'abc' } },
      { path: 'status', operator: { type: 'Equals', value: 'sent' } },
    ];
    const record = propertiesToRecord(props);
    expect(record).toEqual({ message_id: 'abc', status: 'sent' });
    expect(recordToProperties(record, props)).toEqual(props);
  });

  it('surfaces values of non-Equals operators in the record', () => {
    const props: EventProperty[] = [
      { path: 'status', operator: { type: 'Contains', value: 'fail' } },
    ];
    expect(propertiesToRecord(props)).toEqual({ status: 'fail' });
  });

  it('skips blank paths and last-write-wins on duplicates', () => {
    const props: EventProperty[] = [
      { path: '', operator: { type: 'Equals', value: 'ignored' } },
      { path: '   ', operator: { type: 'Equals', value: 'ignored' } },
      { path: 'k', operator: { type: 'Equals', value: 'first' } },
      { path: 'k', operator: { type: 'Equals', value: 'second' } },
    ];
    expect(propertiesToRecord(props)).toEqual({ k: 'second' });
  });

  it('preserves an untouched non-Equals row but flattens an edited one to Equals', () => {
    const prev: EventProperty[] = [
      { path: 'status', operator: { type: 'Contains', value: 'fail' } },
      { path: 'message_id', operator: { type: 'GreaterThan', value: 5 } },
    ];
    // status unchanged (deep-equals prev value) → operator preserved.
    // message_id edited → collapses to Equals.
    const next = recordToProperties({ status: 'fail', message_id: 9 }, prev);
    expect(next).toEqual([
      { path: 'status', operator: { type: 'Contains', value: 'fail' } },
      { path: 'message_id', operator: { type: 'Equals', value: 9 } },
    ]);
  });

  it('emits Equals rows when there is no prev context', () => {
    expect(recordToProperties({ a: '1' })).toEqual([
      { path: 'a', operator: { type: 'Equals', value: '1' } },
    ]);
  });
});

describe('validateEventProperties', () => {
  it('flags missing required fields', () => {
    expect(validateEventProperties('message.delivered', {})).toEqual({
      valid: false,
      missing: ['message_id'],
    });
  });

  it('treats empty-string / null / undefined as missing', () => {
    expect(validateEventProperties('message.delivered', { message_id: '' }).valid).toBe(false);
    expect(validateEventProperties('message.delivered', { message_id: null }).valid).toBe(false);
  });

  it('is valid when all required fields are filled', () => {
    expect(validateEventProperties('message.delivered', { message_id: 'uuid-1' })).toEqual({
      valid: true,
      missing: [],
    });
  });

  it('is always valid for custom or unknown events', () => {
    expect(validateEventProperties('custom', {}).valid).toBe(true);
    expect(validateEventProperties('does.not.exist', {}).valid).toBe(true);
  });
});

describe('preserveCompatibleValues', () => {
  it('keeps same-name-same-type values across a canonical switch', () => {
    const result = preserveCompatibleValues(
      { message_id: 'uuid-1', status: 'sent' },
      'message.delivered',
      'message.read',
    );
    expect(result).toEqual({ message_id: 'uuid-1', status: 'sent' });
  });

  it('drops a value whose type differs in the target schema', () => {
    // `status` is string in message.delivered, number in number.event → dropped.
    const result = preserveCompatibleValues(
      { status: 'sent' },
      'message.delivered',
      'number.event',
    );
    expect(result).toEqual({});
  });

  it('drops keys absent from the target schema', () => {
    const result = preserveCompatibleValues(
      { message_id: 'uuid-1', stray: 'x' },
      'message.delivered',
      'message.read',
    );
    expect(result).toEqual({ message_id: 'uuid-1' });
  });

  it('keeps everything when the target event is custom', () => {
    const record = { anything: 1, free: 'form' };
    expect(preserveCompatibleValues(record, 'message.delivered', 'custom')).toEqual(record);
  });

  it('keeps target-schema keys without a type check when the source is custom', () => {
    const result = preserveCompatibleValues(
      { message_id: 'uuid-1', stray: 'x' },
      'custom',
      'message.read',
    );
    expect(result).toEqual({ message_id: 'uuid-1' });
  });

  it('drops everything when the target event is unknown', () => {
    expect(
      preserveCompatibleValues({ message_id: 'uuid-1' }, 'message.delivered', 'nope'),
    ).toEqual({});
  });
});
