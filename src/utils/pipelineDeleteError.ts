import { isErrorCode } from '@/utils/apiHelpers';

// EVO-2205: the backend refuses the delete with a code whose NAME is legacy
// (…WITH_CONVERSATIONS). The rule it actually enforces is "the pipeline still holds
// active items" — an item can be a contact-only lead, not just a conversation.
//
// Both delete paths (the pipelines list and the in-kanban header) swallowed that
// reason into a generic toast. The mapping lives here once so the two paths cannot
// drift, and so the rule is testable without rendering either screen.
export const PIPELINE_DELETE_BLOCKED_CODE = 'CANNOT_DELETE_PIPELINE_WITH_CONVERSATIONS';

export const PIPELINE_DELETE_BLOCKED_KEY = 'messages.deleteBlockedActiveItems';
export const PIPELINE_DELETE_GENERIC_KEY = 'messages.deleteError';

/**
 * Translation key for a failed pipeline deletion: the specific "still has active
 * items" reason when the backend said so, the generic message otherwise.
 */
export function pipelineDeleteErrorKey(error: unknown): string {
  // `error` arrives straight from a catch block, so it can be anything at all.
  // isErrorCode reads `.response` off it and would throw on null/undefined.
  if (!error || typeof error !== 'object') return PIPELINE_DELETE_GENERIC_KEY;

  return isErrorCode(error, PIPELINE_DELETE_BLOCKED_CODE)
    ? PIPELINE_DELETE_BLOCKED_KEY
    : PIPELINE_DELETE_GENERIC_KEY;
}
