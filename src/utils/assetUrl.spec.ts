import { describe, it, expect } from 'vitest';
import { assetUrl } from './assetUrl';

describe('assetUrl', () => {
  it('prefixes a relative API path with the API origin (split-origin dev fix)', () => {
    const out = assetUrl('/rails/active_storage/blobs/proxy/abc/photo.jpg');
    expect(out).toMatch(/^https?:\/\//);
    expect(out.endsWith('/rails/active_storage/blobs/proxy/abc/photo.jpg')).toBe(true);
  });

  it('leaves absolute http(s) URLs untouched', () => {
    expect(assetUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(assetUrl('http://x/y.png')).toBe('http://x/y.png');
    expect(assetUrl('//cdn/a.jpg')).toBe('//cdn/a.jpg');
  });

  it('leaves blob: and data: URLs untouched', () => {
    expect(assetUrl('blob:http://localhost/xyz')).toBe('blob:http://localhost/xyz');
    expect(assetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('returns empty string for empty/nullish input', () => {
    expect(assetUrl('')).toBe('');
    expect(assetUrl(null)).toBe('');
    expect(assetUrl(undefined)).toBe('');
    expect(assetUrl('   ')).toBe('');
  });

  it('joins a path with no leading slash', () => {
    expect(assetUrl('rails/x.jpg')).toMatch(/\/rails\/x\.jpg$/);
  });
});
