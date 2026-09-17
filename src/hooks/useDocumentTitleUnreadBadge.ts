import { useEffect, useRef } from 'react';

// Prefixes the browser tab title with "(N) " while there are unread items,
// mirroring the classic "(1) Inbox" pattern so a backgrounded tab still
// signals new activity. Captures the real base title once, on first mount,
// so a later re-render never nests a stale "(N) (M) Title".
export const useDocumentTitleUnreadBadge = (unreadCount: number): void => {
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (baseTitleRef.current === null) {
      baseTitleRef.current = document.title;
    }

    const base = baseTitleRef.current;
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [unreadCount]);
};
