import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDocumentTitleUnreadBadge } from './useDocumentTitleUnreadBadge';

const BASE_TITLE = 'AutomaLead';

describe('useDocumentTitleUnreadBadge', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = BASE_TITLE;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('prefixes the title with the unread count when there are unread items', () => {
    renderHook(() => useDocumentTitleUnreadBadge(3));

    expect(document.title).toBe(`(3) ${BASE_TITLE}`);
  });

  it('restores the plain title when the count drops back to zero', () => {
    const { rerender } = renderHook(({ count }) => useDocumentTitleUnreadBadge(count), {
      initialProps: { count: 5 },
    });
    expect(document.title).toBe(`(5) ${BASE_TITLE}`);

    rerender({ count: 0 });

    expect(document.title).toBe(BASE_TITLE);
  });

  it('updates the prefix as the count changes', () => {
    const { rerender } = renderHook(({ count }) => useDocumentTitleUnreadBadge(count), {
      initialProps: { count: 1 },
    });
    expect(document.title).toBe(`(1) ${BASE_TITLE}`);

    rerender({ count: 12 });

    expect(document.title).toBe(`(12) ${BASE_TITLE}`);
  });

  it('never shows a negative count', () => {
    renderHook(() => useDocumentTitleUnreadBadge(-1));

    expect(document.title).toBe(BASE_TITLE);
  });

  it('does not touch the title on unmount, leaving whatever the last render set', () => {
    const { unmount } = renderHook(() => useDocumentTitleUnreadBadge(2));
    expect(document.title).toBe(`(2) ${BASE_TITLE}`);

    unmount();

    expect(document.title).toBe(`(2) ${BASE_TITLE}`);
  });
});
