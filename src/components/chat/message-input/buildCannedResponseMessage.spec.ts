import { describe, it, expect } from 'vitest';
import { buildCannedResponseMessage } from './buildCannedResponseMessage';

describe('buildCannedResponseMessage (EVO-1685)', () => {
  it('replaces the trigger slash even though getContent returns HTML', () => {
    expect(buildCannedResponseMessage('<p>/</p>', 'Hello there')).toBe('Hello there');
  });

  it('preserves text typed before the slash', () => {
    expect(buildCannedResponseMessage('<p>oi /</p>', 'tudo bem?')).toBe('oi tudo bem?');
  });

  it('falls back to the content when there is no slash', () => {
    expect(buildCannedResponseMessage('<p>plain text</p>', 'X')).toBe('X');
  });

  it('handles empty editor content', () => {
    expect(buildCannedResponseMessage('', 'content')).toBe('content');
  });
});
