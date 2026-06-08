// Replaces every character outside [a-z0-9_] with `_`. Used to coerce
// event_name strings like `pipeline.stage_changed` or
// `evo_flow:message.delivered` into safe i18next keys — i18next treats `.`
// and `:` as path separators, so the raw event_name cannot be used directly.
export function slugifyEventName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
}
