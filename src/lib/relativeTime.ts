export type FormatRelativeTimeOptions = {
  locale: string;
  justNowLabel: string;
  justNowThresholdSeconds?: number;
};

const DEFAULT_JUST_NOW_SECONDS = 5;
const FALLBACK_LOCALE = 'en';

const formatterCache = new Map<string, Intl.RelativeTimeFormat>();

function getFormatter(locale: string): Intl.RelativeTimeFormat {
  const cached = formatterCache.get(locale);
  if (cached) return cached;
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  } catch {
    rtf =
      formatterCache.get(FALLBACK_LOCALE) ??
      new Intl.RelativeTimeFormat(FALLBACK_LOCALE, { numeric: 'auto' });
    formatterCache.set(FALLBACK_LOCALE, rtf);
  }
  formatterCache.set(locale, rtf);
  return rtf;
}

export function formatRelativeTime(
  date: Date,
  now: Date,
  { locale, justNowLabel, justNowThresholdSeconds = DEFAULT_JUST_NOW_SECONDS }: FormatRelativeTimeOptions,
): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(Math.abs(diffMs) / 1000);

  if (diffSec < justNowThresholdSeconds) return justNowLabel;

  const rtf = getFormatter(locale);

  if (diffSec < 60) return rtf.format(-diffSec, 'second');

  // Floor (not round) so each minute/hour/day label sticks for its full unit
  // window — avoids the "just transitioned to 1m, jumped to 2m at 1m30s" jolt.
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');

  const diffDay = Math.floor(diffHr / 24);
  return rtf.format(-diffDay, 'day');
}
