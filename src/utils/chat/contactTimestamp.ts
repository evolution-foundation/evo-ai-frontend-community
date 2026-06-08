import type { Contact } from '@/types/chat/api';

/**
 * Converts a Unix timestamp (seconds or milliseconds) or numeric string to ISO string.
 * Uses a heuristic: values < 1e12 are treated as seconds; >= 1e12 as milliseconds.
 * Returns undefined for falsy values (except 0), non-numeric input, or invalid dates.
 */
export const unixTimestampToIso = (ts: unknown): string | undefined => {
  if (!ts && ts !== 0) return undefined;
  const n = Number(ts);
  if (isNaN(n)) return undefined;
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

/**
 * Merges a full Contact response (from /contacts/:id) into a base contact,
 * enriching only the fields that the ConversationSerializer omits.
 * Base fields (name, phone_number, etc.) are always preserved from base when
 * absent or undefined in full.
 */
export const mergeFullContact = (full: Contact, base: Contact): Contact => ({
  ...base,
  identifier: full.identifier ?? base.identifier,
  additional_attributes: full.additional_attributes ?? base.additional_attributes ?? {},
  custom_attributes: full.custom_attributes ?? base.custom_attributes ?? {},
  availability_status: full.availability_status ?? base.availability_status,
  blocked: full.blocked ?? base.blocked ?? false,
  avatar_url: full.avatar_url || full.thumbnail || base.avatar_url,
  avatar: full.avatar || base.avatar,
  last_activity_at: unixTimestampToIso(full.last_activity_at) ?? base.last_activity_at,
  created_at: unixTimestampToIso(full.created_at) ?? base.created_at,
});
