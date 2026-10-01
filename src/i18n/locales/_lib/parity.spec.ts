import { describe, it, expect } from 'vitest';
import { findLeaks, findPortuguese, isIgnorableValue, portugueseMarker } from './parity';

describe('isIgnorableValue', () => {
  it.each([
    '{{count}} providers',
    '{{count}} active',
    '{{count}} more inboxes',
  ])('does not excuse copy that merely opens with a placeholder: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });

  // The multi-placeholder rule must not reach across literal words: these are
  // the shapes it would swallow if the `[^a-zA-Z]` separator ever loosened.
  it.each([
    '{{count}} of {{total}}',
    '{{n}} and {{m}} more',
    '{{failed}} of {{total}} AI agents could not be deleted',
  ])('does not excuse copy between placeholders: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });

  it.each([
    '{{count}}/1000',
    '{{progress}}%',
    '{{duration}} {{unit}}',
    '{{start}} - {{end}}',
  ])('excuses placeholder-only values: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(true);
  });

  it.each([
    '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
    '{"user_id": "{user_id}"}',
    '["text", "image"]',
  ])('excuses JSON and array blobs: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(true);
  });

  it.each([
    '{count} providers',
    '[draft] Welcome message',
    '{not json at all}',
  ])('does not excuse brace-shaped copy that is not a blob: %s', (value) => {
    expect(isIgnorableValue(value)).toBe(false);
  });
});

describe('findLeaks', () => {
  it('reports an interpolated value left in English', () => {
    const en = { overview: { providersCount: '{{count}} providers' } };
    const pt = { overview: { providersCount: '{{count}} providers' } };

    expect(findLeaks(en, pt, new Set())).toEqual([
      'overview.providersCount = "{{count}} providers"',
    ]);
  });

  it('stays quiet once the value is translated', () => {
    const en = { overview: { providersCount: '{{count}} providers' } };
    const pt = { overview: { providersCount: '{{count}} provedores' } };

    expect(findLeaks(en, pt, new Set())).toEqual([]);
  });

  it('honours the allowlist for interpolated loanwords', () => {
    const en = { captureForms: { leadsCount: '{{count}} leads' } };
    const pt = { captureForms: { leadsCount: '{{count}} leads' } };

    expect(findLeaks(en, pt, new Set(['{{count}} leads']))).toEqual([]);
  });
});

// The catalogs are clean, so i18n-parity stays green even with a rule broken.
describe('portugueseMarker', () => {
  it.each([
    'Gerencie sua senha e a verificação em duas etapas.',
    'Entrar na sua conta',
    'Use o Facebook Embedded Signup para configurar automaticamente seu canal WhatsApp.',
    'Nome',
    'ou',
  ])('flags a pt-BR value pasted as it is: %s', (value) => {
    expect(portugueseMarker(value)).not.toBeNull();
  });

  it('catches with each rule on its own', () => {
    expect(portugueseMarker('Ações')).toBe('ç');
    expect(portugueseMarker('A data é inválida')).toBe('é');
    expect(portugueseMarker('Ver detalhes')).toBe('detalhes');
    expect(portugueseMarker('Nenhum resultado')).toBe('nenhum');
  });

  it.each([
    'Gestiona tu contraseña y la verificación en dos pasos.',
    'Iniciar sesión en su cuenta',
    'Agentes de IA',
    'Cargando voces...',
    'Salvo que el pelo esté corto, da clic para guardar',
    'Enter your SIM number',
    'Visit example.com',
  ])('passes Spanish and English, shared forms included: %s', (value) => {
    expect(portugueseMarker(value)).toBeNull();
  });

  it('ignores interpolation placeholders and tags', () => {
    expect(portugueseMarker('{{conta}} <nome>Account</nome>')).toBeNull();
  });
});

describe('findPortuguese', () => {
  it('reports the key and skips the allowed ones', () => {
    const es = { language: { portuguese: 'Português' }, form: { name: 'Nome', email: 'Correo' } };

    expect(findPortuguese(es, new Set(['language.portuguese']))).toEqual(['form.name = "Nome"']);
  });
});
