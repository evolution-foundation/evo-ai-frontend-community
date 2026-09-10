import { describe, it, expect } from 'vitest';
import { findLeaks, isIgnorableValue } from './parity';

describe('isIgnorableValue', () => {
  it.each([
    '{{count}} providers',
    '{{count}} active',
    '{{count}} more inboxes',
  ])('does not excuse copy that merely opens with a placeholder: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });

  // The multi-placeholder rule must not reach across literal words: these are
  // the shapes it would swallow if the `[^a-zA-Z]` separator ever loosened.
  it.each([
    '{{count}} of {{total}}',
    '{{n}} and {{m}} more',
    '{{failed}} of {{total}} AI agents could not be deleted',
  ])('does not excuse copy between placeholders: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });

  it.each([
    '{{count}}/1000',
    '{{progress}}%',
    '{{duration}} {{unit}}',
    '{{start}} - {{end}}',
  ])('excuses placeholder-only values: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(true);
  });

  it.each([
    '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
    '{"user_id": "{user_id}"}',
    '["text", "image"]',
  ])('excuses JSON and array blobs: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(true);
  });

  it.each([
    '{count} providers',
    '[draft] Welcome message',
    '{not json at all}',
  ])('does not excuse brace-shaped copy that is not a blob: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });
});

describe('findLeaks', () => {
  it('reports an interpolated value left in English', () => {
    const en = { overview: { providersCount: '{{count}} providers' } };
    const pt = { overview: { providersCount: '{{count}} providers' } };

    expect(findLeaks(en, pt, new Set())).toEqual([
      'overview.providersCount = "{{count}} providers"',
    ]);
  });

  it('stays quiet once the value is translated', () => {
    const en = { overview: { providersCount: '{{count}} providers' } };
    const pt = { overview: { providersCount: '{{count}} provedores' } };

    expect(findLeaks(en, pt, new Set())).toEqual([]);
  });

  it('honours the allowlist for interpolated loanwords', () => {
    const en = { captureForms: { leadsCount: '{{count}} leads' } };
    const pt = { captureForms: { leadsCount: '{{count}} leads' } };

    expect(findLeaks(en, pt, new Set(['{{count}} leads']))).toEqual([]);
  });
});
