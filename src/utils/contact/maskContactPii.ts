/**
 * Visual masking helpers for contact PII (phone, email, WhatsApp identifier).
 *
 * Purpose: discourage casual leaks (copy/paste outside the CRM) by hiding the
 * majority of each PII string while preserving enough to identify the contact.
 * This is UX friction, NOT real security — the API still returns full values.
 *
 * Conventions:
 * - `null` / `undefined` / `''` → `null` so callers can short-circuit render.
 * - Phone: when the input is already formatted with a dash (BR pattern from
 *   `formatContactPhone` or `(DDD) NNNNN-NNNN`), preserve DDI/DDD/last-4 and
 *   replace the central digit run with literal `****`. For other strings, mask
 *   all digits except the last 4.
 * - Email: keeps domain intact, replaces local part with `m***` (fixed length
 *   so the original length doesn't leak).
 * - Identifier (JID): splits on `@`, masks prefix as a phone, keeps suffix.
 */

export function maskPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) return null;

  if (digitsOnly.length < 4) {
    return raw.replace(/\d/g, '*');
  }

  const lastDashIdx = raw.lastIndexOf('-');
  if (lastDashIdx > 0) {
    const before = raw.slice(0, lastDashIdx);
    const after = raw.slice(lastDashIdx); // includes the dash
    if (/\d/.test(before) && /\d/.test(after)) {
      return before.replace(/\d+(?=\D*$)/, '****') + after;
    }
  }

  let digitsSeen = 0;
  const totalDigits = digitsOnly.length;
  const out: string[] = [];
  for (const ch of raw) {
    if (/\d/.test(ch)) {
      digitsSeen += 1;
      out.push(digitsSeen > totalDigits - 4 ? ch : '*');
    } else {
      out.push(ch);
    }
  }
  return out.join('');
}

export function maskEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const atIdx = raw.indexOf('@');
  if (atIdx === -1) return '***';

  const local = raw.slice(0, atIdx);
  const domain = raw.slice(atIdx);

  if (!local) return `***${domain}`;
  if (local.length === 1) return `*${domain}`;

  return `${local[0]}***${domain}`;
}

export function maskIdentifier(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const atIdx = raw.indexOf('@');
  if (atIdx === -1) {
    return maskPhone(raw) ?? '***';
  }

  const prefix = raw.slice(0, atIdx);
  const suffix = raw.slice(atIdx);

  const maskedPrefix = maskPhone(prefix);
  if (!maskedPrefix) return `***${suffix}`;
  return `${maskedPrefix}${suffix}`;
}
