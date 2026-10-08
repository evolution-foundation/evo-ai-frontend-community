import type { FieldErrorTable } from '@/utils/apiHelpers';

/** Codes from Label's validations, keyed to the modal's messages (namespace `labels`). */
export const LABEL_FIELD_ERRORS: FieldErrorTable = {
  title: {
    taken: 'modal.validation.nameTaken',
    too_short: 'modal.validation.nameMinLength',
    blank: 'modal.validation.nameRequired',
    invalid: 'modal.validation.nameInvalid',
  },
  color: {
    blank: 'modal.validation.colorRequired',
    invalid: 'modal.validation.colorInvalid',
  },
};
