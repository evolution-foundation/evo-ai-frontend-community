export const CUSTOM_OPENAI_PROVIDER = 'custom_openai_compatible';

export interface AiProvider {
  value: string;
  label: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'together_ai', label: 'Together AI' },
  { value: 'fireworks_ai', label: 'Fireworks AI' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'vertex_ai', label: 'Google Vertex AI' },
  { value: CUSTOM_OPENAI_PROVIDER, label: 'Custom (OpenAI-compatible)' },
];

// Providers speaking the OpenAI wire protocol serve every AI feature. The rest
// are only reachable through AI Agents. Mirrors IsOpenAICompatible in
// evo-ai-core-service-community/pkg/api_key/model/api_key.go.
const OPENAI_COMPATIBLE_PROVIDERS = new Set([
  'openai',
  'azure',
  'custom',
  CUSTOM_OPENAI_PROVIDER,
]);

export function isOpenAICompatible(provider: string): boolean {
  return OPENAI_COMPATIBLE_PROVIDERS.has(provider);
}

// The API returns only the last characters of a key, never the key itself.
export function maskKey(hint?: string): string {
  return hint ? `••••${hint}` : '••••';
}

// Scopes ordered from the most generic to the most specific, mirroring
// Ai::CredentialResolver::SCOPE_CHAIN in the CRM. Rails owns the resolution
// that features rely on; this preview exists so the screen can show which
// credential is in effect without a round trip per feature.
export const SCOPE_CHAIN: ApiKeyScope[] = ['installation', 'account'];

export type ApiKeyScope = 'installation' | 'account';

interface ResolvableCredential {
  provider: string;
  scope?: ApiKeyScope;
  is_active: boolean;
  openai_compatible?: boolean;
  created_at?: string;
}

/** What the panel can say about a feature's credential.
 *
 * `legacy` is the state this screen used to be blind to: an installation that
 * has not run the migration yet resolves through Ai::CredentialResolver's
 * legacy fallback (the global OPENAI_API_SECRET or an openai hook), so AI works
 * while the registry is empty. Reporting "no credential" there told the user
 * their AI was off when it was running (EVO-2250 review, MÉDIO 15).
 */
export type CredentialResolution<T> =
  | { state: 'registry'; credential: T }
  | { state: 'legacy' }
  | { state: 'none' };

// Mirrors Ai::CredentialResolver: most specific link first, skipping
// credentials whose provider the feature cannot speak, so it falls through to a
// broader link. Within a link the OLDEST active credential wins, which is the
// `order(created_at: :asc)` of the Ruby side — array position is not an order.
export function resolveCredential<T extends ResolvableCredential>(
  credentials: T[],
  { openAICompatibleOnly = false }: { openAICompatibleOnly?: boolean } = {},
): T | undefined {
  for (const scope of [...SCOPE_CHAIN].reverse()) {
    const candidates = credentials
      .filter(
        credential =>
          credential.is_active &&
          (credential.scope ?? 'account') === scope &&
          (!openAICompatibleOnly ||
            (credential.openai_compatible ?? isOpenAICompatible(credential.provider))),
      )
      .sort(byCreatedAtAsc);

    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  return undefined;
}

// Oldest first. A credential with no timestamp sorts last rather than winning
// by accident: the server always sends one, so its absence is a partial record.
function byCreatedAtAsc(a: ResolvableCredential, b: ResolvableCredential): number {
  if (!a.created_at) return 1;
  if (!b.created_at) return -1;
  return a.created_at.localeCompare(b.created_at);
}

/** Resolves what the panel should render for a feature.
 *
 * `legacyActive` is the server's answer (the migration guard): only the backend
 * can tell "the registry is empty AND the legacy fallback is serving" apart
 * from "nothing is configured". It is consulted only when nothing resolves from
 * the registry, so a caller that does not have the answer yet should withhold
 * that branch rather than pass a guess — the pre-existing heuristic is a
 * documented last resort for a CRM that does not serve the signal at all.
 */
export function resolveCredentialState<T extends ResolvableCredential>(
  credentials: T[],
  options: { openAICompatibleOnly?: boolean; legacyActive?: boolean } = {},
): CredentialResolution<T> {
  const credential = resolveCredential(credentials, options);
  if (credential) {
    return { state: 'registry', credential };
  }

  return options.legacyActive ? { state: 'legacy' } : { state: 'none' };
}
