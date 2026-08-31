import { describe, it, expect } from 'vitest';
import { apiErrorCode, apiErrorMessage } from './apiHelpers';

// Mirrors app/controllers/concerns/api_response_helper.rb#error_response.
function rejection(data: unknown, status = 422) {
  return { response: { status, data }, message: `Request failed with status code ${status}` };
}

describe('apiErrorMessage', () => {
  it('reads the message the backend authored', () => {
    const error = rejection({
      success: false,
      error: { code: 'QUOTA_EXCEEDED', message: 'Limite do plano excedido (5/5) para channels' },
    });

    expect(apiErrorMessage(error)).toBe('Limite do plano excedido (5/5) para channels');
  });

  it('reads the legacy string and bare-message shapes', () => {
    expect(apiErrorMessage(rejection({ error: 'Canal já existe' }))).toBe('Canal já existe');
    expect(apiErrorMessage(rejection({ message: 'Nome é obrigatório' }))).toBe(
      'Nome é obrigatório',
    );
  });

  it('returns undefined when the body carries no message', () => {
    expect(apiErrorMessage(rejection({ whatever: true }))).toBeUndefined();
    expect(apiErrorMessage(rejection(null))).toBeUndefined();
  });

  it('returns undefined for an envelope that carries a code but no message', () => {
    expect(apiErrorMessage(rejection({ success: false, error: { code: 'QUOTA_EXCEEDED' } }))).toBeUndefined();
    expect(apiErrorMessage(rejection({ success: false, error: {} }))).toBeUndefined();
    expect(apiErrorMessage(rejection({ success: false, error: { code: 'X', message: '  ' } }))).toBeUndefined();
  });

  it('ignores 5xx bodies, whose message is not written for the person on screen', () => {
    expect(apiErrorMessage(rejection({ message: 'PG::UndefinedTable: relation "x"' }, 500))).toBeUndefined();
    expect(
      apiErrorMessage(rejection({ success: false, error: { code: 'INTERNAL', message: 'NoMethodError' } }, 503)),
    ).toBeUndefined();
  });

  it('returns undefined for a rejection with no response at all', () => {
    expect(apiErrorMessage(new Error('Network Error'))).toBeUndefined();
  });

  it.each([null, undefined, 'boom', 42])('returns undefined without throwing for %p', value => {
    expect(apiErrorMessage(value)).toBeUndefined();
  });
});

describe('apiErrorCode', () => {
  it('returns the envelope code even on a 5xx', () => {
    const error = {
      response: { status: 500, data: { success: false, error: { code: 'ERR_UNDEFINED_COLUMN', message: 'Undefined column' } } },
    };
    expect(apiErrorCode(error)).toBe('ERR_UNDEFINED_COLUMN');
  });

  it('is undefined when the envelope has no code', () => {
    expect(apiErrorCode({ response: { status: 422, data: { error: { message: 'x' } } } })).toBeUndefined();
    expect(apiErrorCode({ response: { status: 500, data: { error: { code: '' } } } })).toBeUndefined();
    expect(apiErrorCode(new Error('network'))).toBeUndefined();
    expect(apiErrorCode(undefined)).toBeUndefined();
  });
});
