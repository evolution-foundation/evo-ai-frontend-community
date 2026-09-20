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
// evo-ai-core-service-community/pkg/api_key/model/api_key.go. `openrouter`
// belongs here too — verified (Task 1/2) to expose OpenAI-shaped /embeddings
// and /audio/transcriptions endpoints, not just chat.
export const OPENAI_COMPATIBLE_PROVIDERS_LIST = [
  'openai',
  'azure',
  'custom',
  CUSTOM_OPENAI_PROVIDER,
  'openrouter',
] as const;

const OPENAI_COMPATIBLE_PROVIDERS = new Set<string>(OPENAI_COMPATIBLE_PROVIDERS_LIST);

export function isOpenAICompatible(provider: string): boolean {
  return OPENAI_COMPATIBLE_PROVIDERS.has(provider);
}

// Providers that speak the OpenAI chat-completions wire protocol specifically —
// a wider set than OPENAI_COMPATIBLE_PROVIDERS_LIST, most of which don't offer
// OpenAI-compatible embeddings or audio transcription. Mirrors
// Ai::Credential::CHAT_COMPLETIONS_COMPATIBLE_PROVIDERS in the CRM and
// chatCompletionsCompatibleProviders in evo-ai-core-service-community exactly.
export const CHAT_COMPLETIONS_COMPATIBLE_PROVIDERS_LIST = [
  'openai',
  'azure',
  'custom',
  CUSTOM_OPENAI_PROVIDER,
  'openrouter',
  'groq',
  'deepseek',
  'together_ai',
  'fireworks_ai',
] as const;

const CHAT_COMPLETIONS_COMPATIBLE_PROVIDERS = new Set<string>(CHAT_COMPLETIONS_COMPATIBLE_PROVIDERS_LIST);

export function isChatCompletionsCompatible(provider: string): boolean {
  return CHAT_COMPLETIONS_COMPATIBLE_PROVIDERS.has(provider);
}

// Fixed API hosts for providers whose base URL an admin should never have to
// type by hand — mirrors KnownProviderBaseURL in evo-ai-core-service-community.
// openai/azure/custom are deliberately absent: openai's default lives in
// application config, azure endpoints are tenant-specific, and custom's whole
// purpose is a URL the admin supplies.
export const KNOWN_PROVIDER_BASE_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com',
  together_ai: 'https://api.together.xyz/v1',
  fireworks_ai: 'https://api.fireworks.ai/inference/v1',
};

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

// Mirrors Ai::ConsumerCompatibility::CONSUMERS keys in the CRM — the single
// source of truth for what a "consumer" is called. Keep this list and that
// Ruby hash in lockstep; a key added there with no entry here is invisible
// on this screen (exactly the gap that motivated this plan).
export interface AiConsumer {
  key: string;
  labelKey: string;
}

export const AI_CONSUMERS: AiConsumer[] = [
  { key: 'ai_agents', labelKey: 'consumers.aiAgents' },
  { key: 'inbox_assist', labelKey: 'consumers.inboxAssist' },
  { key: 'audio_transcription', labelKey: 'consumers.audioTranscription' },
  { key: 'label_suggestion', labelKey: 'consumers.labelSuggestion' },
  { key: 'moderation', labelKey: 'consumers.moderation' },
  { key: 'knowledge_embedding', labelKey: 'consumers.knowledgeEmbedding' },
  { key: 'memory_compression', labelKey: 'consumers.memoryCompression' },
];

interface ResolvableCredential {
  provider: string;
  scope?: ApiKeyScope;
  is_active: boolean;
  openai_compatible?: boolean;
  created_at?: string;
  allowed_consumers?: string[];
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
  { acceptedProviders, consumerKey }: { acceptedProviders?: readonly string[]; consumerKey?: string } = {},
): T | undefined {
  for (const scope of [...SCOPE_CHAIN].reverse()) {
    const candidates = credentials
      .filter(
        credential =>
          credential.is_active &&
          (credential.scope ?? 'account') === scope &&
          (!acceptedProviders || acceptedProviders.includes(credential.provider)) &&
          (!consumerKey ||
            !credential.allowed_consumers?.length ||
            credential.allowed_consumers.includes(consumerKey)),
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
  options: { acceptedProviders?: readonly string[]; legacyActive?: boolean; consumerKey?: string } = {},
): CredentialResolution<T> {
  const credential = resolveCredential(credentials, options);
  if (credential) {
    return { state: 'registry', credential };
  }

  return options.legacyActive ? { state: 'legacy' } : { state: 'none' };
}
