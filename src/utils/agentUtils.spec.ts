import { describe, it, expect } from 'vitest';
import { extractBackendErrorMessage } from './agentUtils';

/**
 * CRM-116 — o motivo da recusa nunca chegava ao usuário.
 *
 * O core-service (Go) responde `{ success:false, error:{ code, message } }`.
 * `extractBackendErrorMessage` lia `data.detail` (shape do FastAPI) e
 * `data.message`, e nenhum dos dois existe nesse envelope — então TUDO que o core
 * recusa caía no `error.message` do axios.
 *
 * Na prática: quem estourava a cota de agentes do plano via
 * "Request failed with status code 422", sem uma palavra sobre plano ou limite.
 * A recusa funcionava; a explicação se perdia no caminho.
 *
 * O mesmo bug já tinha sido corrigido neste SPA em customToolsService.ts, com o
 * comentário dizendo que antes "callers only ever saw axios's generic message".
 */
describe('extractBackendErrorMessage', () => {
  /** O envelope real do core-service. */
  const coreError = (status: number, code: string, message: string) => ({
    message: `Request failed with status code ${status}`, // o que o axios põe
    response: { status, data: { success: false, error: { code, message }, meta: {} } },
  });

  describe('o envelope do core-service (a regressão)', () => {
    it('mostra o motivo da cota estourada, não a mensagem do axios', () => {
      const error = coreError(422, 'QUOTA_EXCEEDED', 'agents limit reached (2/2, requested 500)');

      const result = extractBackendErrorMessage(error);

      expect(result).toBe('agents limit reached (2/2, requested 500)');
      expect(result).not.toContain('Request failed with status code');
    });

    it.each([
      [403, 'FORBIDDEN', 'You do not have permission to create agents'],
      [400, 'BAD_REQUEST', 'Invalid agent configuration'],
      [500, 'INTERNAL_ERROR', 'Something went wrong'],
    ])('vale para qualquer status do core (%i %s)', (status, code, message) => {
      expect(extractBackendErrorMessage(coreError(status, code, message))).toBe(message);
    });
  });

  describe('os shapes que já funcionavam continuam funcionando', () => {
    it('mantém a personalização do 422 do processor (FastAPI, data.detail)', () => {
      const error = {
        response: {
          status: 422,
          data: { detail: [{ msg: 'Agent name cannot contain spaces or special characters' }] },
        },
      };

      expect(extractBackendErrorMessage(error)).toContain('não pode conter espaços');
    });

    it('mantém o ramo data.message', () => {
      const error = { response: { status: 400, data: { message: 'plain message shape' } } };

      expect(extractBackendErrorMessage(error)).toBe('plain message shape');
    });

    it('cai no erro do axios quando não há resposta (rede)', () => {
      expect(extractBackendErrorMessage({ message: 'Network Error' })).toBe('Network Error');
    });

    it('tem um último recurso quando não há nada', () => {
      expect(extractBackendErrorMessage({})).toBe('Erro desconhecido ao salvar agente');
    });
  });

  describe('precedência', () => {
    it('o detail do FastAPI ganha do envelope do core no mesmo 422', () => {
      // Um 422 com `detail` vem do processor e já tinha tratamento amigável;
      // o envelope do core não deve atropelá-lo.
      const error = {
        response: {
          status: 422,
          data: {
            detail: [{ msg: 'Input should be a valid UUID' }],
            error: { code: 'X', message: 'nao deve aparecer' },
          },
        },
      };

      expect(extractBackendErrorMessage(error)).toContain('UUID');
    });

    it('o envelope do core ganha do error.message do axios', () => {
      const error = coreError(422, 'QUOTA_EXCEEDED', 'agents limit reached (2/2)');

      expect(extractBackendErrorMessage(error)).not.toBe(error.message);
    });
  });
});
