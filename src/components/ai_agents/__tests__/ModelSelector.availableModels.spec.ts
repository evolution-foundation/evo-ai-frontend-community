import { describe, it, expect } from 'vitest';
import { availableModels } from '@/components/ai_agents/ModelSelector';

// Shape checks, not freshness. Freshness needs the provider's own answer: the LISTS_LIVE
// axes get it the moment a key is chosen, and the bedrock axis gets it from the AWS model
// cards in ModelSelector.bedrockLifecycle.spec.ts. Vertex and Perplexity have neither, so
// their pins are still only as fresh as the last person who went looking.

const PROVIDER_PREFIX: Record<string, string> = {
  openai: 'openai/',
  gemini: 'gemini/',
  anthropic: 'anthropic/',
  openrouter: 'openrouter/',
  deepseek: 'deepseek/',
  together_ai: 'together_ai/',
  fireworks_ai: 'fireworks_ai/',
  perplexity: 'perplexity/',
  bedrock: 'bedrock/',
  vertex_ai: 'vertex_ai/',
};

// Mirrors ProviderSupportsDynamicModels in the core-service
// (pkg/api_key/service/models_fetcher.go); update both together.
const LISTS_LIVE = ['openai', 'gemini', 'anthropic', 'openrouter', 'deepseek', 'together_ai', 'fireworks_ai'];

// Perplexity is offered as a key type but has no id worth pinning: Sonar Chat
// Completions rejects any request carrying tools, and its successor speaks the
// Responses API, which the runtime cannot reach yet.
const PINNED_ON_PURPOSE_EMPTY = ['perplexity'];

// One current family. The live list wins the moment a key is chosen, so each extra
// pinned entry is only more surface to rot.
const MAX_PINNED_WHEN_LISTED_LIVE = 3;

const duplicatesOf = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter(v => {
    if (seen.has(v)) return true;
    seen.add(v);
    return false;
  });
};

describe('availableModels', () => {
  it('files every entry under a provider the picker knows', () => {
    const unknown = availableModels.filter(m => !PROVIDER_PREFIX[m.provider]);
    expect(unknown).toEqual([]);
  });

  it('prefixes every value with its own provider', () => {
    const mismatched = availableModels.filter(
      m => !m.value.startsWith(PROVIDER_PREFIX[m.provider]),
    );
    expect(mismatched).toEqual([]);
  });

  it('has no duplicate value', () => {
    expect(duplicatesOf(availableModels.map(m => m.value))).toEqual([]);
  });

  it('has no duplicate label, so two entries never look like one', () => {
    expect(duplicatesOf(availableModels.map(m => m.label))).toEqual([]);
  });

  it('keeps at most the current family pinned for a provider that lists live', () => {
    const oversized = LISTS_LIVE.filter(
      p => availableModels.filter(m => m.provider === p).length > MAX_PINNED_WHEN_LISTED_LIVE,
    );
    expect(oversized).toEqual([]);
  });

  it('pins at least one entry per provider, so a failed listing is never an empty picker', () => {
    const empty = Object.keys(PROVIDER_PREFIX).filter(
      p => !PINNED_ON_PURPOSE_EMPTY.includes(p) && !availableModels.some(m => m.provider === p),
    );
    expect(empty).toEqual([]);
  });
});
