import { describe, it, expect } from 'vitest';
import { maskPhone, maskEmail, maskIdentifier } from './maskContactPii';

describe('maskPhone', () => {
  it('returns null for empty / null / undefined', () => {
    expect(maskPhone('')).toBeNull();
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });

  it('returns null when input has no digits', () => {
    expect(maskPhone('abc')).toBeNull();
  });

  it('masks a Brazilian mobile preserving DDI + DDD + last 4', () => {
    expect(maskPhone('+55 11 99999-9999')).toBe('+55 11 ****-9999');
  });

  it('masks a Brazilian landline preserving DDI + DDD + last 4', () => {
    expect(maskPhone('+55 11 3333-4444')).toBe('+55 11 ****-4444');
  });

  it('masks a BR number without DDI (parenthesised) preserving DDD + last 4', () => {
    expect(maskPhone('(11) 99999-9999')).toBe('(11) ****-9999');
  });

  it('masks an unformatted international number (no dash → last-4 rule)', () => {
    expect(maskPhone('12155551234')).toBe('*******1234');
  });

  it('masks international number with leading + (no dash → last-4 rule)', () => {
    expect(maskPhone('+12155551234')).toBe('+*******1234');
  });

  it('keeps last 4 digits for short strings without dash', () => {
    expect(maskPhone('12345')).toBe('*2345');
  });

  it('masks every digit when fewer than 4', () => {
    expect(maskPhone('123')).toBe('***');
    expect(maskPhone('1')).toBe('*');
  });

  it('preserves non-digit punctuation between masked digits', () => {
    expect(maskPhone('+1 215 555 1234')).toBe('+* *** *** 1234');
  });

  it('handles a 4-digit-only input (boundary)', () => {
    expect(maskPhone('1234')).toBe('1234');
  });
});

describe('maskEmail', () => {
  it('returns null for empty / null / undefined', () => {
    expect(maskEmail('')).toBeNull();
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
  });

  it('masks a regular email keeping first letter + domain', () => {
    expect(maskEmail('marcelo@gmail.com')).toBe('m***@gmail.com');
  });

  it('hides length even for long local parts (always 3 stars)', () => {
    expect(maskEmail('marcelogorutubajr@gmail.com')).toBe('m***@gmail.com');
  });

  it('keeps +alias hidden by masking the entire local body after first char', () => {
    expect(maskEmail('marcelo+test@gmail.com')).toBe('m***@gmail.com');
  });

  it('handles 1-char local part with single star', () => {
    expect(maskEmail('a@gmail.com')).toBe('*@gmail.com');
  });

  it('preserves short domains', () => {
    expect(maskEmail('me@a.co')).toBe('m***@a.co');
  });

  it('returns opaque *** when there is no @', () => {
    expect(maskEmail('no-arroba')).toBe('***');
  });

  it('handles missing local part', () => {
    expect(maskEmail('@noco.com')).toBe('***@noco.com');
  });
});

describe('maskIdentifier', () => {
  it('returns null for empty / null / undefined', () => {
    expect(maskIdentifier('')).toBeNull();
    expect(maskIdentifier(null)).toBeNull();
    expect(maskIdentifier(undefined)).toBeNull();
  });

  it('masks a WhatsApp JID keeping suffix intact (no dash in prefix → last-4 rule)', () => {
    expect(maskIdentifier('5511999999999@s.whatsapp.net')).toBe(
      '*********9999@s.whatsapp.net'
    );
  });

  it('masks an international JID', () => {
    expect(maskIdentifier('12155551234@s.whatsapp.net')).toBe(
      '*******1234@s.whatsapp.net'
    );
  });

  it('returns opaque *** when there are no digits and no @', () => {
    expect(maskIdentifier('something-random-no-digits')).toBe('***');
  });

  it('treats input without @ as a phone', () => {
    expect(maskIdentifier('12345')).toBe('*2345');
  });

  it('handles empty prefix with suffix', () => {
    expect(maskIdentifier('@s.whatsapp.net')).toBe('***@s.whatsapp.net');
  });
});
