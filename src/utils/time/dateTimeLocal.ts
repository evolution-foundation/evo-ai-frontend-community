import { format } from 'date-fns';

/**
 * `<input type="datetime-local">` value (`yyyy-MM-ddTHH:mm`) in the browser's local time.
 * Slicing the API's ISO string (`slice(0, 16)`) puts the UTC time in the field, and sending
 * it back through `new Date(value).toISOString()` shifts the instant by the offset on every save.
 */
export function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}
