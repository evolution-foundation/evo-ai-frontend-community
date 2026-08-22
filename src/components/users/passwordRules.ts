/**
 * CRM-210 — the password rule the backend enforces, mirrored for fail-fast.
 *
 * Lives in its own file, not inside SetPasswordModal: exporting a helper from a
 * component module breaks Fast Refresh (react-refresh/only-export-components),
 * and a validation rule is not a component concern anyway.
 *
 * The backend stays the authority. This only avoids charging the admin a round
 * trip to be told what we already know — the API's message is still what gets
 * shown when it does refuse.
 *
 * Mirrors:
 *   config/initializers/devise.rb  -> config.password_length = 8..128
 *   app/models/user.rb             -> User#password_complexity
 */

/** Devise's `config.password_length` lower bound. */
export const PASSWORD_MIN_LENGTH = 8;
/** Devise's `config.password_length` upper bound. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Returns the i18n key of the first rule the password breaks, or null when it
 * satisfies all of them.
 *
 * Order matters only for which message the admin sees first; the backend
 * reports every violation at once, and its wording wins on a real 422.
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
