import { describe, it, expect } from 'vitest';
import { extractBackendErrorMessage } from './agentUtils';

/**
 * CRM-116 — the reason for a refusal never reached the user.
 *
 * The core-service answers `{ success:false, error:{ code, message } }`, which
 * matches neither the FastAPI `detail` branch nor `data.message` — so every core
 * refusal fell through to axios's generic message. A tenant over its plan limit
 * read "Request failed with status code 422", with no mention of a limit.
 */
describe('extractBackendErrorMessage', () => {
  /** The core-service's real envelope. */
  const coreError = (status: number, code: string, message: string) => ({
    message: `Request failed with status code ${status}`, // what axios puts there
    response: { status, data: { success: false, error: { code, message }, meta: {} } },
  });

  describe("the core-service's envelope (the regression)", () => {
    it('shows why the quota refused, not axios\'s message', () => {
      const error = coreError(422, 'QUOTA_EXCEEDED', 'agents limit reached (2/2, requested 500)');

      const result = extractBackendErrorMessage(error);

      expect(result).toBe('agents limit reached (2/2, requested 500)');
      expect(result).not.toContain('Request failed with status code');
    });

    it.each([
      [403, 'FORBIDDEN', 'You do not have permission to create agents'],
      [400, 'BAD_REQUEST', 'Invalid agent configuration'],
      [500, 'INTERNAL_ERROR', 'Something went wrong'],
    ])('holds for any core status (%i %s)', (status, code, message) => {
      expect(extractBackendErrorMessage(coreError(status, code, message))).toBe(message);
    });
  });

  describe('the shapes that already worked still work', () => {
    it("keeps the processor's 422 wording (FastAPI, data.detail)", () => {
      const error = {
        response: {
          status: 422,
          data: { detail: [{ msg: 'Agent name cannot contain spaces or special characters' }] },
        },
      };

      expect(extractBackendErrorMessage(error)).toContain('não pode conter espaços');
    });

    it('keeps the data.message branch', () => {
      const error = { response: { status: 400, data: { message: 'plain message shape' } } };

      expect(extractBackendErrorMessage(error)).toBe('plain message shape');
    });

    it("falls back to axios's error when there is no response (network)", () => {
      expect(extractBackendErrorMessage({ message: 'Network Error' })).toBe('Network Error');
    });

    it('has a last resort when there is nothing at all', () => {
      expect(extractBackendErrorMessage({})).toBe('Erro desconhecido ao salvar agente');
    });
  });

  describe('precedence', () => {
    it("the FastAPI detail wins over the core envelope on the same 422", () => {
      // A 422 carrying `detail` comes from the processor and already has friendly
      // wording; the core envelope must not override it.
      const error = {
        response: {
          status: 422,
          data: {
            detail: [{ msg: 'Input should be a valid UUID' }],
            error: { code: 'X', message: 'must not surface' },
          },
        },
      };

      expect(extractBackendErrorMessage(error)).toContain('UUID');
    });

    it("the core envelope wins over axios's error.message", () => {
      const error = coreError(422, 'QUOTA_EXCEEDED', 'agents limit reached (2/2)');

      expect(extractBackendErrorMessage(error)).not.toBe(error.message);
    });
  });
});
