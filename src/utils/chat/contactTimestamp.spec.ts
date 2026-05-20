import { describe, expect, it } from 'vitest';
import { unixTimestampToIso, mergeFullContact } from './contactTimestamp';
import type { Contact } from '@/types/chat/api';

describe('unixTimestampToIso', () => {
  it('returns undefined for null, undefined, and empty string', () => {
    expect(unixTimestampToIso(null)).toBeUndefined();
    expect(unixTimestampToIso(undefined)).toBeUndefined();
    expect(unixTimestampToIso('')).toBeUndefined();
  });

  it('returns undefined for non-numeric strings', () => {
    expect(unixTimestampToIso('not-a-date')).toBeUndefined();
    expect(unixTimestampToIso('2026-01-01T00:00:00Z')).toBeUndefined();
  });

  it('handles Unix epoch (0) correctly', () => {
    expect(unixTimestampToIso(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(unixTimestampToIso('0')).toBe('1970-01-01T00:00:00.000Z');
  });

  it('treats values < 1e12 as Unix seconds', () => {
    // 1747872000 seconds = 2025-05-22T00:00:00.000Z
    const result = unixTimestampToIso(1747872000);
    expect(result).toBe('2025-05-22T00:00:00.000Z');
  });

  it('treats values >= 1e12 as Unix milliseconds', () => {
    // 1747872000000 ms = 2025-05-22T00:00:00.000Z
    const result = unixTimestampToIso(1747872000000);
    expect(result).toBe('2025-05-22T00:00:00.000Z');
  });

  it('accepts numeric strings', () => {
    expect(unixTimestampToIso('1747872000')).toBe('2025-05-22T00:00:00.000Z');
    expect(unixTimestampToIso('1747872000000')).toBe('2025-05-22T00:00:00.000Z');
  });

  it('returns undefined for NaN', () => {
    expect(unixTimestampToIso(NaN)).toBeUndefined();
  });

  it('treats exactly 1e12 as milliseconds (boundary value)', () => {
    // 1e12 is NOT < 1e12, so it is treated as ms: new Date(1e12) = 2001-09-09
    const result = unixTimestampToIso(1e12);
    expect(result).toBe('2001-09-09T01:46:40.000Z');
  });
});

const baseContact: Contact = {
  id: '1',
  name: 'Base Name',
  phone_number: '+5511999999999',
  email: 'base@example.com',
  custom_attributes: { tier: 'free' },
  additional_attributes: { source: 'web' },
  avatar_url: 'https://cdn.example.com/base.jpg',
  blocked: false,
};

describe('mergeFullContact', () => {
  it('preserves base name and phone_number when full does not override them', () => {
    const full: Contact = {
      id: '1',
      name: 'Base Name',
      custom_attributes: { tier: 'premium' },
    };
    const result = mergeFullContact(full, baseContact);
    expect(result.name).toBe('Base Name');
    expect(result.phone_number).toBe('+5511999999999');
  });

  it('merges custom_attributes from full, replacing base', () => {
    const full: Contact = { id: '1', name: 'Base Name', custom_attributes: { tier: 'premium' } };
    const result = mergeFullContact(full, baseContact);
    expect(result.custom_attributes).toEqual({ tier: 'premium' });
  });

  it('falls back to base custom_attributes when full has none', () => {
    const full: Contact = { id: '1', name: 'Base Name' };
    const result = mergeFullContact(full, baseContact);
    expect(result.custom_attributes).toEqual({ tier: 'free' });
  });

  it('converts full.last_activity_at from Unix seconds to ISO string', () => {
    const full: Contact = { id: '1', name: 'N', last_activity_at: 1747872000 as unknown as string };
    const result = mergeFullContact(full, baseContact);
    expect(result.last_activity_at).toBe('2025-05-22T00:00:00.000Z');
  });

  it('keeps base last_activity_at when full has no timestamp', () => {
    const base: Contact = { ...baseContact, last_activity_at: '2026-01-01T00:00:00.000Z' };
    const full: Contact = { id: '1', name: 'N' };
    const result = mergeFullContact(full, base);
    expect(result.last_activity_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('prefers full.avatar_url over base when present', () => {
    const full: Contact = { id: '1', name: 'N', avatar_url: 'https://cdn.example.com/new.jpg' };
    const result = mergeFullContact(full, baseContact);
    expect(result.avatar_url).toBe('https://cdn.example.com/new.jpg');
  });

  it('falls back to full.thumbnail when full.avatar_url is absent', () => {
    const full: Contact = { id: '1', name: 'N', thumbnail: 'https://cdn.example.com/thumb.jpg' };
    const result = mergeFullContact(full, baseContact);
    expect(result.avatar_url).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('falls back to base.avatar_url when full has no avatar fields', () => {
    const full: Contact = { id: '1', name: 'N' };
    const result = mergeFullContact(full, baseContact);
    expect(result.avatar_url).toBe('https://cdn.example.com/base.jpg');
  });
});
