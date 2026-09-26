import type { Country } from 'react-phone-number-input';
import type { Locale } from '@/i18n/config';

// Default calling-code country per app locale, so the phone input starts
// with the country a user of that locale is most likely to be in.
//
// Inboxes on this product are overwhelmingly Brazilian, and the backend's
// own channel locale is frequently stored as the bare "pt" (rather than the
// "pt_BR"/"pt-BR" variant) even for Brazilian businesses — widgetService's
// normalizeWidgetLocale() maps that bare "pt" straight through here. Treating
// generic "pt" as Portugal (PT) silently defaulted the phone country to +351
// for Brazilian customers, causing valid DDD-format (+55) numbers to fail
// validation. Default "pt" to BR to match actual usage.
const LOCALE_TO_COUNTRY: Record<Locale, Country> = {
  'pt-BR': 'BR',
  pt: 'BR',
  en: 'US',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
};

export const getDefaultPhoneCountry = (locale: Locale): Country =>
  LOCALE_TO_COUNTRY[locale] || 'BR';
