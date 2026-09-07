import { getFormattingLocale } from '@/lib/formattingLocale';
import i18n from '@/i18n/config';
import { fromUnixTime, isToday, isYesterday, isThisYear } from 'date-fns';

/**
 * Normaliza created_at (API/WebSocket) para Unix timestamp em segundos.
 * Evita "21 Jan 1970" quando o backend envia segundos como string (new Date("1739...") interpreta como ms).
 */
export function normalizeToUnixSeconds(
  value: number | string | null | undefined,
): number {
  if (value == null || value === '') {
    return Math.floor(Date.now() / 1000);
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value <= 0) return Math.floor(Date.now() / 1000);
    // Número >= 1e12 é milissegundos; senão segundos
    return value >= 1e12 ? Math.floor(value / 1000) : value;
  }
  const str = String(value).trim();
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    if (n <= 0) return Math.floor(Date.now() / 1000);
    return n >= 1e12 ? Math.floor(n / 1000) : n;
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return Math.floor(Date.now() / 1000);
  return Math.floor(ms / 1000);
}

/** Format timestamps using the active UI locale. */
const formatTime = (date: Date) => new Intl.DateTimeFormat(getFormattingLocale(), {
  hour: '2-digit', minute: '2-digit',
}).format(date);
const formatDay = (date: Date) => new Intl.DateTimeFormat(getFormattingLocale(), {
  day: 'numeric', month: 'short', ...(isThisYear(date) ? {} : { year: 'numeric' as const }),
}).format(date);

export const formatConversationTime = (timestamp: number): string => {
  if (!timestamp || timestamp <= 0) return i18n.t('common:dateTime.now');
  const date = fromUnixTime(timestamp);
  if (!Number.isFinite(date.getTime())) return i18n.t('common:dateTime.invalid');
  if (isToday(date)) return formatTime(date);
  if (isYesterday(date)) return i18n.t('common:dateTime.yesterday');
  return formatDay(date);
};

export const formatDetailedTime = (timestamp: number): string => {
  const date = fromUnixTime(timestamp);
  if (!timestamp || timestamp <= 0 || !Number.isFinite(date.getTime())) {
    return i18n.t('common:dateTime.invalid');
  }
  return new Intl.DateTimeFormat(getFormattingLocale(), {
    dateStyle: 'long', timeStyle: 'short',
  }).format(date);
};

export const formatMessageTime = (timestamp: number | string): string => {
  if (!timestamp || (typeof timestamp === 'number' && timestamp <= 0)) return '';
  const date = typeof timestamp === 'number' || /^\d+$/.test(timestamp)
    ? fromUnixTime(Number(timestamp)) : new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return i18n.t('common:dateTime.invalid');
  if (isToday(date)) return formatTime(date);
  return i18n.t('common:dateTime.dateAtTime', {
    date: isYesterday(date) ? i18n.t('common:dateTime.yesterday') : formatDay(date),
    time: formatTime(date),
  });
};
