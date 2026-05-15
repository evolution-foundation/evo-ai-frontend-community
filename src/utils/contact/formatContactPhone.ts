/**
 * Format a contact phone number for display.
 *
 * Returns null for empty input so callers can use `phone && ...` to hide the
 * element entirely. The formatter targets Brazilian E.164 numbers (the common
 * case in Evolution). For anything else the original string is returned
 * untouched — guessing country code from digit count produced misleading
 * displays for legacy contacts saved without a DDI (e.g. `(11) 99999-9999`
 * was being shown as `+11999999999`, which suggests US dialing).
 */
export function formatContactPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Brazil mobile in E.164: 55 + DDD (2) + 9 + 8 digits = 13 digits.
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  // Brazil landline in E.164: 55 + DDD (2) + 8 digits = 12 digits.
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  return raw;
}
