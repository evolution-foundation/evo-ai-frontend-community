import { describe, expect, it } from 'vitest';
import {
  getContactAvatarStyle,
  getContactAvatarUrl,
  getContactDisplayName,
  getContactInitials,
  isPlaceholderContactName,
} from './avatarHelpers';

describe('getContactAvatarUrl', () => {
  it('returns undefined for null/undefined contact', () => {
    expect(getContactAvatarUrl(null)).toBeUndefined();
    expect(getContactAvatarUrl(undefined)).toBeUndefined();
  });

  it('prioritizes avatar_url over thumbnail and avatar', () => {
    expect(
      getContactAvatarUrl({
        avatar_url: 'https://cdn.example.com/a.jpg',
        thumbnail: 'https://cdn.example.com/b.jpg',
        avatar: 'https://cdn.example.com/c.jpg',
      }),
    ).toBe('https://cdn.example.com/a.jpg');
  });

  // EVO-1012: backend ContactSerializer emits `thumbnail`, not `avatar_url`. The
  // helper must consume `thumbnail` when avatar_url is absent so /contacts and
  // conversation surfaces render the WhatsApp profile picture consistently.
  it('falls back to thumbnail when avatar_url is missing', () => {
    expect(
      getContactAvatarUrl({
        thumbnail: 'https://cdn.example.com/from-thumbnail.jpg',
      }),
    ).toBe('https://cdn.example.com/from-thumbnail.jpg');
  });

  it('falls back to avatar (absolute URL) when avatar_url and thumbnail are missing', () => {
    expect(
      getContactAvatarUrl({ avatar: 'https://cdn.example.com/from-avatar.jpg' }),
    ).toBe('https://cdn.example.com/from-avatar.jpg');
  });

  it('returns avatar path as-is when it starts with /', () => {
    expect(getContactAvatarUrl({ avatar: '/uploads/avatar.jpg' })).toBe(
      '/uploads/avatar.jpg',
    );
  });

  it('prefixes /uploads/ when avatar is a bare relative filename', () => {
    expect(getContactAvatarUrl({ avatar: 'avatar.jpg' })).toBe('/uploads/avatar.jpg');
  });

  it('returns undefined when no avatar field is populated', () => {
    expect(
      getContactAvatarUrl({ avatar_url: null, thumbnail: null, avatar: null }),
    ).toBeUndefined();
    expect(getContactAvatarUrl({})).toBeUndefined();
  });
});

describe('contact name presentation', () => {
  it('detects placeholder names (empty, phone, e-mail)', () => {
    for (const name of ['', null, undefined, '+5521973801603', '(21) 97380-1603', 'ana@example.com']) {
      expect(isPlaceholderContactName(name)).toBe(true);
    }
    for (const name of ['Ana Silva', 'Na', 'Telas Seidel | Financeiro']) {
      expect(isPlaceholderContactName(name)).toBe(false);
    }
  });

  it('formats phone and e-mail names for display and keeps real names', () => {
    expect(getContactDisplayName('5521973801603')).toBe('+55 21 97380-1603');
    expect(getContactDisplayName('552133334444')).toBe('+55 21 3333-4444');
    expect(getContactDisplayName('+14155550123')).toBe('+14155550123');
    expect(getContactDisplayName('laurianedeolinda@gmail.com')).toBe('Laurianedeolinda');
    expect(getContactDisplayName('maria.eduarda_s@x.com')).toBe('Maria eduarda s');
    expect(getContactDisplayName('Ana Silva')).toBe('Ana Silva');
    expect(getContactDisplayName(null)).toBe('');
  });

  it('builds initials without symbols and none for phone numbers', () => {
    expect(getContactInitials('Ana Silva')).toBe('AS');
    expect(getContactInitials('Na')).toBe('N');
    expect(getContactInitials('Telas Seidel | Financeiro')).toBe('TF');
    expect(getContactInitials('+5521973801603')).toBe('');
    expect(getContactInitials('laurianedeolinda@gmail.com')).toBe('L');
    expect(getContactInitials('Édson Álvares')).toBe('ÉÁ');
    expect(getContactInitials(null)).toBe('');
  });

  it('gives a stable color per name and none for placeholders', () => {
    expect(getContactAvatarStyle('Ana Silva')).toEqual(getContactAvatarStyle('  ana silva '));
    expect(getContactAvatarStyle('Ana Silva')).not.toEqual(getContactAvatarStyle('Bruno Dias'));
    expect(getContactAvatarStyle('5521973801603')).toBeUndefined();
    expect(Number((getContactAvatarStyle('Ana') as Record<string, unknown>)['--av-h'])).toBeGreaterThanOrEqual(0);
  });
});
