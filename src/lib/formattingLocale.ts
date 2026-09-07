import i18n from '@/i18n/config';
import { getDateFnsLocale } from './dateFnsLocale';

/** Read at formatting time so services and shared label getters follow language changes. */
export function getFormattingLocale(): string {
  return i18n.resolvedLanguage || i18n.language || 'en';
}

export function getFormattingDateFnsLocale() {
  return getDateFnsLocale(getFormattingLocale());
}
