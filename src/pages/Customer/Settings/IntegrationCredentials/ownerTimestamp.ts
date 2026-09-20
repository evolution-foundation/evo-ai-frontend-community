// The owner store writes naive UTC timestamps ("2026-08-15T00:00:00", no
// zone). `new Date` would read those as LOCAL time and shift the expiry by the
// user's offset; a zoned RFC3339 value passes through untouched.
export function parseOwnerTimestamp(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}
