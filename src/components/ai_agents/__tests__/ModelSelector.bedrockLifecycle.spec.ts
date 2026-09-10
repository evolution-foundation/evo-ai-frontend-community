import { describe, it, expect, beforeAll } from 'vitest';
import { availableModels } from '@/components/ai_agents/ModelSelector';

/**
 * Freshness for the bedrock axis, which the sibling shape spec cannot cover: Bedrock has
 * no listing endpoint the product can reach, so the pinned list is the only source and
 * nothing corrects it. The AWS docs serve each model card as raw markdown (`.html` → `.md`),
 * carrying the id table and `Model lifecycle` in plain text. Reaches the network, so it is
 * out of the CI list on purpose — run it by hand when touching the axis.
 */

const DOCS_BASE = 'https://docs.aws.amazon.com/bedrock/latest/userguide';

// No rule derives the card slug from the id: the id carries a routing prefix (`global.`,
// `us.`) the slug lacks, and the slug follows the marketing name. Hence the hand pairing.
const MODEL_CARD_BY_ID: Record<string, string> = {
  'bedrock/global.anthropic.claude-opus-5': 'model-card-anthropic-claude-opus-5',
  'bedrock/global.anthropic.claude-sonnet-5': 'model-card-anthropic-claude-sonnet-5',
  'bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0': 'model-card-anthropic-claude-sonnet-4-5',
  'bedrock/us.meta.llama3-1-70b-instruct-v1:0': 'model-card-meta-llama-3-1-70b-instruct',
  'bedrock/us.deepseek.r1-v1:0': 'model-card-deepseek-deepseek-r1',
  'bedrock/mistral.mistral-7b-instruct-v0:2': 'model-card-mistral-ai-mistral-7b-instruct',
  'bedrock/amazon.nova-micro-v1:0': 'model-card-amazon-nova-micro',
};

const bedrockEntries = availableModels.filter(m => m.provider === 'bedrock');

const modelId = (value: string) => value.replace(/^bedrock\//, '');

const lifecycleOf = (markdown: string) =>
  markdown.match(/\*\*Model lifecycle:\*\*[ \t]*(.+)/)?.[1].trim();

const eolNoticeOf = (markdown: string) =>
  markdown.match(/\*\*Model EOL date:\*\*[ \t]*(.+)/)?.[1].trim();

const programmaticAccessOf = (markdown: string) =>
  markdown.split(/^## /m).find(section => section.startsWith('Programmatic Access')) ?? '';

// The id has to be a whole cell of the id table, not a substring of the page: two pins
// carry no version suffix, so a plain `includes` would read a later `claude-opus-5-1` as
// still serving the retired `claude-opus-5`, and would also match the code samples.
const servesId = (markdown: string, id: string) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w.:-])${escaped}(?![\\w.:-])`).test(programmaticAccessOf(markdown));
};

// `Model EOL date` is a floor, not an expiry ("No sooner than 3/1/2025"), so it is no
// deadline to assert — `Model lifecycle` is the field that flips. What it is good for is
// noticing a fourth shape, which would mean the field started saying something new.
const EOL_NOTICE_SHAPES = [
  /^N\/A$/,
  /^No sooner than \d{1,2}\/\d{1,2}\/\d{4}$/,
  /^Legacy: \w+ \d{1,2}, \d{4}$/,
];

const cards = new Map<string, string>();
const cardErrors = new Map<string, string>();
let docsReachable = true;

beforeAll(async () => {
  const fetches = await Promise.allSettled(
    Object.entries(MODEL_CARD_BY_ID).map(async ([id, slug]) => ({
      id,
      slug,
      response: await fetch(`${DOCS_BASE}/${slug}.md`),
    })),
  );

  // An HTTP status IS an answer, and a card answering 404 is how a retired model leaves
  // the docs — the very event this spec exists to catch, so it fails below instead of
  // skipping. Only a request that got no answer at all means the docs are out of reach.
  docsReachable = fetches.every(f => f.status === 'fulfilled');
  if (!docsReachable) return;

  for (const settled of fetches) {
    if (settled.status !== 'fulfilled') continue;
    const { id, slug, response } = settled.value;
    if (response.ok) cards.set(id, await response.text());
    else cardErrors.set(id, `${slug}.md answered ${response.status}`);
  }
}, 120_000);

describe('bedrock axis lifecycle', () => {
  it('pairs the pinned bedrock ids and the model cards both ways', () => {
    expect({
      unmapped: bedrockEntries.filter(m => !MODEL_CARD_BY_ID[m.value]).map(m => m.value),
      orphaned: Object.keys(MODEL_CARD_BY_ID).filter(
        id => !bedrockEntries.some(m => m.value === id),
      ),
    }).toEqual({ unmapped: [], orphaned: [] });
  });

  it('checks a non-empty axis, so a silent list rename never reads as a pass', () => {
    expect(bedrockEntries.length).toBeGreaterThan(0);
  });

  it('serves every pinned id from the id table of its own model card', ctx => {
    if (!docsReachable) return ctx.skip();

    const missing = Object.keys(MODEL_CARD_BY_ID)
      .map(id => ({
        id,
        why:
          cardErrors.get(id) ??
          (servesId(cards.get(id) ?? '', modelId(id)) ? '' : 'absent from Programmatic Access'),
      }))
      .filter(({ why }) => why);
    expect(missing).toEqual([]);
  });

  it('keeps every pinned id on an Active lifecycle', ctx => {
    if (!docsReachable) return ctx.skip();

    // A card that stopped carrying a lifecycle line is reported as such instead of
    // passing on an absent value.
    const notActive = Object.keys(MODEL_CARD_BY_ID)
      .map(id => ({ id, lifecycle: cardErrors.get(id) ?? lifecycleOf(cards.get(id) ?? '') }))
      .filter(({ lifecycle }) => lifecycle !== 'Active');
    expect(notActive).toEqual([]);
  });

  it('reads an EOL notice it still knows how to interpret', ctx => {
    if (!docsReachable) return ctx.skip();

    const unreadable = Object.keys(MODEL_CARD_BY_ID)
      .map(id => ({ id, notice: cardErrors.get(id) ?? eolNoticeOf(cards.get(id) ?? '') }))
      .filter(({ notice }) => !notice || !EOL_NOTICE_SHAPES.some(shape => shape.test(notice)));
    expect(unreadable).toEqual([]);
  });
});
