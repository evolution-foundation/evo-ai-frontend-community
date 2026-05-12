import { describe, it, expect } from 'vitest';
import { formatContactPhone } from './formatContactPhone';

describe('formatContactPhone', () => {
  it('returns null for empty input', () => {
    expect(formatContactPhone('')).toBeNull();
    expect(formatContactPhone(null)).toBeNull();
    expect(formatContactPhone(undefined)).toBeNull();
  });

  it('returns null when input has no digits', () => {
    expect(formatContactPhone('abc')).toBeNull();
    expect(formatContactPhone('---')).toBeNull();
  });

  it('formats a Brazilian mobile in E.164 with grouping (13 digits)', () => {
    expect(formatContactPhone('5511999999999')).toBe('+55 11 99999-9999');
    expect(formatContactPhone('+5511999999999')).toBe('+55 11 99999-9999');
  });

  it('formats a Brazilian landline in E.164 (12 digits)', () => {
    expect(formatContactPhone('551133334444')).toBe('+55 11 3333-4444');
    expect(formatContactPhone('+551133334444')).toBe('+55 11 3333-4444');
  });

  it('strips non-digit punctuation only when the resulting digits match a BR E.164 pattern', () => {
    // Already in E.164 with BR DDI → formatted.
    expect(formatContactPhone('+55 (11) 99999-9999')).toBe('+55 11 99999-9999');
    // Local number without DDI → returned as-is. Guessing the country from
    // length produced misleading displays (e.g. `+11999999999` suggests US),
    // so we leave the original string untouched.
    expect(formatContactPhone('(11) 99999-9999')).toBe('(11) 99999-9999');
  });

  it('returns the original string for non-BR numbers (no automatic + prefix)', () => {
    expect(formatContactPhone('12155551234')).toBe('12155551234');
    expect(formatContactPhone('+12155551234')).toBe('+12155551234');
  });

  it('preserves the leading + when input is already prefixed and BR-formatted', () => {
    expect(formatContactPhone('+5511999999999')).toBe('+55 11 99999-9999');
  });

  it('leaves short or unrecognised digit strings untouched', () => {
    expect(formatContactPhone('12345')).toBe('12345');
    expect(formatContactPhone('5511999999999')).toBe('+55 11 99999-9999');
  });
});
