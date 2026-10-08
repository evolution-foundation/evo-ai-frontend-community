import type { FieldErrorTable } from '@/utils/apiHelpers';

/** Codes from CannedResponse's validations, keyed to the modal's messages (namespace `cannedResponses`). */
export const CANNED_RESPONSE_FIELD_ERRORS: FieldErrorTable = {
  short_code: {
    taken: 'modal.validation.shortCodeTaken',
    blank: 'modal.validation.shortCodeRequired',
  },
  content: {
    blank: 'modal.validation.contentRequired',
  },
};
