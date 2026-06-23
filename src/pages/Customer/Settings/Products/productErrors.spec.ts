import { describe, it, expect } from 'vitest';
import { toFieldErrors } from './productErrors';

// Builds an Axios-like error matching the CRM `error_response` envelope so the
// parser is exercised against the real 422 payload, not a pre-formatted stub.
const error422 = (details: unknown) => ({
  response: {
    status: 422,
    data: {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    },
  },
});

describe('toFieldErrors', () => {
  it('maps the real backend payload (format_validation_errors) to field messages', () => {
    const err = error422([
      { field: 'sku', messages: ['has already been taken'], full_messages: ['Sku has already been taken'] },
    ]);
    expect(toFieldErrors(err)).toEqual({ sku: 'has already been taken' });
  });

  it('maps multiple fields from the structured payload', () => {
    const err = error422([
      { field: 'name', messages: ["can't be blank"], full_messages: ["Name can't be blank"] },
      { field: 'default_price', messages: ['is not a number'], full_messages: ['Default price is not a number'] },
    ]);
    expect(toFieldErrors(err)).toEqual({
      name: "can't be blank",
      default_price: 'is not a number',
    });
  });

  it('falls back to full_messages when messages is absent', () => {
    const err = error422([{ field: 'sku', full_messages: ['Sku has already been taken'] }]);
    expect(toFieldErrors(err)).toEqual({ sku: 'Sku has already been taken' });
  });

  it('still supports the legacy { field, message } shape', () => {
    const err = error422([{ field: 'sku', message: 'has already been taken' }]);
    expect(toFieldErrors(err)).toEqual({ sku: 'has already been taken' });
  });

  it('still supports the legacy { field: [messages] } object shape', () => {
    const err = error422({ sku: ['has already been taken'] });
    expect(toFieldErrors(err)).toEqual({ sku: 'has already been taken' });
  });

  it('returns {} for a flat string-array payload (no field anchor)', () => {
    const err = error422(['Sku has already been taken']);
    expect(toFieldErrors(err)).toEqual({});
  });

  it('returns {} when there are no details (non-field error)', () => {
    const err = error422(undefined);
    expect(toFieldErrors(err)).toEqual({});
  });
});
