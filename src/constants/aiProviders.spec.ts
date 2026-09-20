import { describe, it, expect } from 'vitest';
import { resolveCredential, resolveCredentialState } from './aiProviders';

// EVO-2250 review, MÉDIO 15: this browser-side resolution is a mirror of
// Ai::CredentialResolver, and it disagreed with it in two ways — it ordered by
// position in the array instead of created_at ASC, and it knew nothing about
// the legacy fallback, so a not-yet-migrated installation read "no credential"
// while its AI was working.

const credential = (overrides: Partial<Parameters<typeof resolveCredential>[0][number]> = {}) => ({
  provider: 'openai',
  scope: 'account' as const,
  is_active: true,
  openai_compatible: true,
  created_at: '2026-07-01T00:00:00Z',
  name: 'sem nome',
  ...overrides,
});

describe('resolveCredential — mirrors the Ruby resolver', () => {
  it('picks the OLDEST active credential in a link, not the first in the array', () => {
    const newest = credential({ name: 'nova', created_at: '2026-07-20T00:00:00Z' });
    const oldest = credential({ name: 'antiga', created_at: '2026-01-05T00:00:00Z' });

    // Array order deliberately puts the newest first: the Ruby side orders by
    // created_at ASC, so position must not decide.
    expect(resolveCredential([newest, oldest])?.name).toBe('antiga');
  });

  it('still prefers the account link over the installation one', () => {
    const installation = credential({
      name: 'da casa',
      scope: 'installation',
      created_at: '2020-01-01T00:00:00Z',
    });
    const account = credential({ name: 'da conta', created_at: '2026-07-20T00:00:00Z' });

    // The installation credential is far older, and still loses: the chain is
    // walked most-specific first, and ordering only breaks ties INSIDE a link.
    expect(resolveCredential([installation, account])?.name).toBe('da conta');
  });

  it('skips inactive credentials and providers the feature cannot speak', () => {
    const inactive = credential({ name: 'inativa', is_active: false });
    const anthropic = credential({
      name: 'anthropic',
      provider: 'anthropic',
      openai_compatible: false,
    });
    const usable = credential({ name: 'usavel', created_at: '2026-07-02T00:00:00Z' });

    expect(
      resolveCredential([inactive, anthropic, usable], { openAICompatibleOnly: true })?.name,
    ).toBe('usavel');
  });

  it('sorts a credential with no timestamp last instead of letting it win', () => {
    const undated = credential({ name: 'sem data', created_at: undefined });
    const dated = credential({ name: 'com data', created_at: '2026-07-10T00:00:00Z' });

    expect(resolveCredential([undated, dated])?.name).toBe('com data');
  });
});

describe('resolveCredentialState — the legacy state the panel was blind to', () => {
  it('reports the registry credential when there is one', () => {
    const result = resolveCredentialState([credential({ name: 'producao' })]);

    expect(result.state).toBe('registry');
    expect(result.state === 'registry' && result.credential.name).toBe('producao');
  });

  // The lie this fixes: an empty registry on a not-yet-migrated install used to
  // render "no credential" while the resolver's legacy fallback was serving.
  it('reports legacy — not "none" — when the registry is empty and the fallback is live', () => {
    expect(resolveCredentialState([], { legacyActive: true }).state).toBe('legacy');
  });

  it('reports none when the registry is empty and nothing else serves', () => {
    expect(resolveCredentialState([], { legacyActive: false }).state).toBe('none');
  });

  // A registry credential wins over the legacy fallback, which mirrors the
  // Ruby resolver: the legacy link is the TAIL of the chain.
  it('never reports legacy while a registry credential resolves', () => {
    const result = resolveCredentialState([credential({ name: 'producao' })], {
      legacyActive: true,
    });

    expect(result.state).toBe('registry');
  });
});
