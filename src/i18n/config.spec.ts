import { afterEach, describe, expect, it, vi } from 'vitest';

// The language is resolved once, at import, so each case needs a fresh module.
async function languageFor(browserLang: string, saved?: string) {
  localStorage.clear();
  if (saved) localStorage.setItem('i18nextLng', saved);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLang);
  vi.resetModules();
  const { default: i18n } = await import('./config');
  return i18n.language;
}

describe('browser language detection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt', 'pt'],
    ['pt-PT', 'pt-BR'],
    ['pt-AO', 'pt-BR'],
    ['fr-FR', 'fr'],
    ['it-IT', 'it'],
    ['es-ES', 'es'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
  ])('%s resolves to %s', async (browserLang, expected) => {
    expect(await languageFor(browserLang)).toBe(expected);
  });

  it('a saved language wins over the browser', async () => {
    expect(await languageFor('pt-PT', 'fr')).toBe('fr');
  });
});
