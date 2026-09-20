import { enUS, es, fr, it, pt, ptBR } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from '@/i18n/config';

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  'pt-BR': ptBR,
  pt,
  en: enUS,
  es,
  fr,
  it,
};

/** Maps the app's i18n language (Locale) to its date-fns locale object. */
export function getDateFnsLocale(language: string): DateFnsLocale {
  return DATE_FNS_LOCALES[language as Locale] ?? enUS;
}
