import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * CRM-210 — the guard is not "an error is shown" but "what reaches toast is a
 * STRING": handing toast() an object makes React 19 unmount the root from the
 * <Toaster/>, and there is no ErrorBoundary above it.
 */

const setPasswordMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt' }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock('@/services/users', () => ({
  usersService: { setPassword: (...args: unknown[]) => setPasswordMock(...args) },
}));

import SetPasswordModal from './SetPasswordModal';
import { passwordProblem } from './passwordRules';

const USER = { id: '7', name: 'Agente Teste', email: 'a@e.com' } as never;
const VALID = 'Senha!Forte1';

/** The auth's real error envelope, as produced by error_response. */
const apiError = (status: number, code: string, message: string) => ({
  response: { status, data: { success: false, error: { code, message }, meta: {} } },
});

async function fillAndSubmit(password: string, confirmation = password) {
  const user = userEvent.setup();
  const fields = screen.getAllByLabelText(/setPassword\.(password|confirm)/);
  await user.type(fields[0], password);
  await user.type(fields[1], confirmation);
  await user.click(screen.getByRole('button', { name: 'setPassword.submit' }));
}

describe('SetPasswordModal', () => {
  beforeEach(() => {
    setPasswordMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  describe('the H3 regression: what reaches toast must be a string', () => {
    it.each([
      [422, 'VALIDATION_ERROR', 'Password must include at least one uppercase letter'],
      [403, 'FORBIDDEN', "You cannot set a super_admin's password"],
      [403, 'FORBIDDEN', 'Use the account settings flow to change your own password'],
    ])('surfaces the API message on %i %s', async (status, code, message) => {
      setPasswordMock.mockRejectedValue(apiError(status, code, message));
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID);

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      const arg = toastError.mock.calls[0][0];
      expect(typeof arg).toBe('string');
      expect(arg).toBe(message);
    });

    // A 5xx body is written for whoever operates the API. apiErrorMessage() drops
    // it; extractError() surfaced the driver's own words to the admin on screen.
    it('keeps a 5xx operator message off the screen', async () => {
      setPasswordMock.mockRejectedValue(
        apiError(500, 'ERR_UNDEFINED_COLUMN', 'PG::UndefinedColumn: column users.foo does not exist')
      );
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID);

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(toastError).toHaveBeenCalledWith('setPassword.error');
    });

    it('never passes an object, even when the API answers something unexpected', async () => {
      // The shape that used to slip through: `error` present but not an envelope
      // we know. It must degrade to the generic string, not to an object.
      setPasswordMock.mockRejectedValue({ response: { status: 500, data: { error: { weird: true } } } });
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID);

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(typeof toastError.mock.calls[0][0]).toBe('string');
    });

    it('falls back to the generic message when there is no response at all', async () => {
      setPasswordMock.mockRejectedValue(new Error('Network Error'));
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID);

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(typeof toastError.mock.calls[0][0]).toBe('string');
    });
  });

  describe('the happy path', () => {
    it('reports how many sessions were killed', async () => {
      setPasswordMock.mockResolvedValue({ success: true, revoked_sessions: 3 });
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID);

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(setPasswordMock).toHaveBeenCalledWith('7', VALID, VALID);
    });
  });

  describe('local validation (M2) — fail fast instead of buying a round trip', () => {
    it('does not call the API when the confirmation differs', async () => {
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit(VALID, `${VALID}x`);

      expect(setPasswordMock).not.toHaveBeenCalled();
      expect(toastError).toHaveBeenCalledWith('setPassword.mismatch');
    });

    it('does not call the API for a password the backend would reject', async () => {
      render(<SetPasswordModal open user={USER} onOpenChange={() => {}} />);

      await fillAndSubmit('curta1'); // < 8 chars

      expect(setPasswordMock).not.toHaveBeenCalled();
      expect(toastError).toHaveBeenCalledWith('setPassword.tooShort');
    });
  });
});

describe('passwordProblem — mirrors app/models/user.rb#password_complexity', () => {
  it.each([
    ['curta1!A', null], // 8 chars, has all four classes
    ['Senha!Forte1', null],
    ['curta1!', 'setPassword.tooShort'],
    ['SENHA!FORTE1', 'setPassword.missingLowercase'],
    ['senha!forte1', 'setPassword.missingUppercase'],
    ['Senha!Forte', 'setPassword.missingNumber'],
    ['SenhaForte12', 'setPassword.missingSpecial'],
  ])('%s -> %s', (password, expected) => {
    expect(passwordProblem(password as string)).toBe(expected);
  });

  it('rejects beyond the Devise ceiling of 128', () => {
    expect(passwordProblem(`A1!${'a'.repeat(130)}`)).toBe('setPassword.tooLong');
  });
});
