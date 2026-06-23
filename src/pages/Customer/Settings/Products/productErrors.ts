import { extractError } from '@/utils/apiHelpers';

// Maps a 422 validation error into a { field: message } map so the modal can
// show server errors (e.g. SKU uniqueness) inline. Returns {} for non-field errors.
// The backend emits structured details as [{ field, messages, full_messages }] via
// format_validation_errors; the legacy { field, message } and { field: [msgs] } shapes
// stay supported for resilience.
export function toFieldErrors(error: unknown): Record<string, string> {
  const { details } = extractError(error);
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    details.forEach((d) => {
      if (d && typeof d === 'object' && 'field' in d) {
        const detail = d as {
          field: string;
          message?: string;
          messages?: string[];
          full_messages?: string[];
        };
        out[detail.field] =
          detail.message ?? detail.messages?.[0] ?? detail.full_messages?.[0] ?? '';
      }
    });
  } else if (details && typeof details === 'object') {
    Object.entries(details as Record<string, unknown>).forEach(([field, msgs]) => {
      out[field] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
    });
  }
  return out;
}
