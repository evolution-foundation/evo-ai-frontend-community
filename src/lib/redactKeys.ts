export const REDACT_KEYS: ReadonlySet<string> = new Set([
  'password',
  'passwords',
  'secret',
  'secrets',
  'token',
  'tokens',
  'api_key',
  'api_keys',
  'access_token',
  'refresh_token',
  'auth_token',
  'session_id',
  'private_key',
  'cpf',
  'rg',
  'email_password',
  'credit_card',
  'ssn',
]);

export const REDACTED_VALUE = '***';

function isRedactedKey(key: string): boolean {
  return REDACT_KEYS.has(key.toLowerCase());
}

// JSON.stringify replacer: when invoked for any key whose lowercase form is in
// REDACT_KEYS, returns the redaction marker for the WHOLE value (string,
// number, object, or array). Otherwise returns the value unchanged so
// JSON.stringify continues to traverse it. Array index callbacks receive the
// index as a string ("0", "1", ...) which never matches REDACT_KEYS, so array
// elements are not individually redacted — only when the array itself is the
// value of a redacted key.
export function redactReplacer(key: string, value: unknown): unknown {
  if (key && isRedactedKey(key)) return REDACTED_VALUE;
  return value;
}
