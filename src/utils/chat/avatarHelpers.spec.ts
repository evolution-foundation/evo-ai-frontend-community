import { describe, expect, it } from 'vitest';
import { getContactAvatarUrl } from './avatarHelpers';

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
