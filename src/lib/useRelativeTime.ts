import { useEffect, useRef, useState } from 'react';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

function intervalFor(deltaMs: number): number {
  if (deltaMs < MINUTE_MS) return 30 * SECOND_MS;
  if (deltaMs < HOUR_MS) return 60 * SECOND_MS;
  return 10 * MINUTE_MS;
}

export function useRelativeTime(date: Date | null | undefined): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  const lastDateRef = useRef(date);

  // React's "storing information from previous renders" pattern: when the
  // incoming `date` prop changes, snap `now` to the wall-clock immediately,
  // during render. Without this the user-visible label kept the previous
  // tick's `now`, so a save that flipped lastSavedAt from 2h ago to right
  // now showed "X minutes ago" where X was the user's session length.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (lastDateRef.current !== date) {
    lastDateRef.current = date;
    setNow(new Date());
  }

  useEffect(() => {
    if (!date) return;
    let timeoutId: number | undefined;
    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, intervalFor(Date.now() - date.getTime()));
    };
    schedule();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [date]);

  return now;
}
