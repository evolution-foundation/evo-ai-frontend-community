import { describe, it, expect } from 'vitest';
import {
  PIPELINE_DELETE_BLOCKED_CODE,
  PIPELINE_DELETE_BLOCKED_KEY,
  PIPELINE_DELETE_GENERIC_KEY,
  pipelineDeleteErrorKey,
} from './pipelineDeleteError';

// EVO-2205: the delete rejection used to be swallowed into a generic toast on both
// delete paths. This is the shared rule both of them now apply.
describe('pipelineDeleteErrorKey', () => {
  // The exact envelope Api::V1::PipelinesController#destroy renders — see
  // app/controllers/concerns/api_response_helper.rb#error_response.
  function backendRejection(code: string) {
    return {
      response: {
        status: 422,
        data: {
          success: false,
          error: { code, message: 'Cannot delete pipeline with active items' },
        },
      },
    };
  }

  it('maps the backend rejection to the active-items reason', () => {
    expect(pipelineDeleteErrorKey(backendRejection(PIPELINE_DELETE_BLOCKED_CODE))).toBe(
      PIPELINE_DELETE_BLOCKED_KEY,
    );
  });

  it('falls back to the generic message for a different backend code', () => {
    expect(pipelineDeleteErrorKey(backendRejection('VALIDATION_ERROR'))).toBe(
      PIPELINE_DELETE_GENERIC_KEY,
    );
  });

  it('falls back to the generic message for a network failure', () => {
    expect(pipelineDeleteErrorKey(new Error('network'))).toBe(PIPELINE_DELETE_GENERIC_KEY);
  });

  // A catch block can receive anything; extractError dereferences `.response`, so a
  // nullish rejection must not blow up the error handler itself.
  it.each([null, undefined, 'boom'])('falls back without throwing for %p', value => {
    expect(pipelineDeleteErrorKey(value)).toBe(PIPELINE_DELETE_GENERIC_KEY);
  });
});
