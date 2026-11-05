import type { Country } from 'react-phone-number-input';
import type { Locale } from '@/i18n/config';

// Default calling-code country per app locale, so the phone input starts
// with the country a user of that locale is most likely to be in (BR for
// pt-BR, PT for pt, etc.) instead of always defaulting to Brazil.
const LOCALE_TO_COUNTRY: Record<Locale, Country> = {
  'pt-BR': 'BR',
  pt: 'PT',
  en: 'US',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
};

export const getDefaultPhoneCountry = (locale: Locale): Country =>
  LOCALE_TO_COUNTRY[locale] || 'BR';
