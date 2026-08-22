/**
 * CRM-210 — mirrors the auth's password rule for fail-fast validation.
 * Source of truth: devise.rb `password_length` (8..128) + User#password_complexity.
 * Its own file because exporting a helper from a component breaks Fast Refresh.
 */

/** Devise's `config.password_length` lower bound. */
export const PASSWORD_MIN_LENGTH = 8;
/** Devise's `config.password_length` upper bound. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * i18n key of the first broken rule, or null. Order only picks which message
 * shows first — the backend reports all of them and its wording wins on a 422.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'setPassword.tooShort';
  if (password.length > PASSWORD_MAX_LENGTH) return 'setPassword.tooLong';
  if (!/[a-z]/.test(password)) return 'setPassword.missingLowercase';
  if (!/[A-Z]/.test(password)) return 'setPassword.missingUppercase';
  if (!/\d/.test(password)) return 'setPassword.missingNumber';
  // Same class as the backend's PASSWORD_SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/.
  if (!/[^A-Za-z0-9]/.test(password)) return 'setPassword.missingSpecial';
  return null;
}
