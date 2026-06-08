import { describe, it, expect } from 'vitest';
import en from './en/contacts.json';
import ptBR from './pt-BR/contacts.json';
import pt from './pt/contacts.json';
import es from './es/contacts.json';
import fr from './fr/contacts.json';
// Renamed to avoid shadowing vitest's `it` block helper.
import itLocale from './it/contacts.json';

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function flattenWithValues(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenWithValues(v, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

describe('contacts i18n parity (EVO-1244)', () => {
  const enKeys = new Set(flatten(en));

  it('pt-BR mirrors every EN key (strict, no missing, no extras)', () => {
    const ptBrKeys = new Set(flatten(ptBR));
    const missing = [...enKeys].filter((k) => !ptBrKeys.has(k));
    const extras = [...ptBrKeys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
    expect(extras).toEqual([]);
  });

  // Soft parity for other Romance locales: only assert that EVO-1244 keys
  // are present. Pre-existing drift (es=607 lines vs en=615) is out of scope
  // and will not block this card.
  const evo1244Keys = [
    'details.tabs.events',
    'events.timeline.title',
    'events.timeline.ariaLabel',
    'events.timeline.loading',
    'events.timeline.loadingMore',
    'events.timeline.loadMore',
    'events.timeline.showing',
    'events.timeline.softCapped',
    'events.timeline.empty.default',
    'events.timeline.empty.withFilters',
    'events.timeline.degraded.banner',
    'events.timeline.degraded.retry',
    'events.timeline.error.forbidden',
    'events.timeline.error.invalidFilters',
    'events.timeline.error.rateLimit',
    'events.timeline.error.generic',
    'events.timeline.error.retry',
    'events.timeline.crashed.title',
    'events.timeline.crashed.reload',
    'events.filters.title',
    'events.filters.eventType',
    'events.filters.eventName',
    'events.filters.channel',
    'events.filters.campaign',
    'events.filters.campaignPlaceholder',
    'events.filters.campaignSearchPlaceholder',
    'events.filters.campaignLoading',
    'events.filters.campaignEmpty',
    'events.filters.clearCampaign',
    'events.filters.occurredAfter',
    'events.filters.occurredBefore',
    'events.filters.clear',
    'events.filters.allEventNames',
    'events.types.all',
    'events.types.identify',
    'events.types.track',
    'events.types.page',
    'events.types.screen',
    'events.types.segment',
    'events.channels.all',
    'events.channels.api',
    'events.channels.email',
    'events.channels.facebook',
    'events.channels.instagram',
    'events.channels.line',
    'events.channels.sms',
    'events.channels.telegram',
    'events.channels.twilio_sms',
    'events.channels.twitter',
    'events.channels.web_widget',
    'events.channels.whatsapp',
    'events.card.expand',
    'events.card.collapse',
    'events.card.properties',
    'events.card.traits',
    'events.card.noData',
    'events.card.justNow',
    'events.card.enriched.campaign',
    'events.card.enriched.channel',
    'events.card.enriched.agent',
    'events.names.contact_created',
    'events.names.contact_updated',
    'events.names.contact_label_added',
    'events.names.contact_label_removed',
    'events.names.contact_custom_attribute_changed',
    'events.names.conversation_created',
    'events.names.conversation_updated',
    'events.names.conversation_resolved',
    'events.names.conversation_activity',
    'events.names.conversation_first_reply',
    'events.names.message_created',
    'events.names.pipeline_conversation_created',
    'events.names.pipeline_conversation_updated',
    'events.names.pipeline_stage_changed',
  ];

  it.each([
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s contains every EVO-1244 key', (_name, locale) => {
    const localeKeys = new Set(flatten(locale));
    const missing = evo1244Keys.filter((k) => !localeKeys.has(k));
    expect(missing).toEqual([]);
  });

  it.each([
    ['en', en],
    ['pt-BR', ptBR],
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s has non-empty string values for every EVO-1244 key', (_name, locale) => {
    const empties = evo1244Keys.filter((k) => {
      const v = getAtPath(locale, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empties).toEqual([]);
  });

  it.each([
    ['en', en],
    ['pt-BR', ptBR],
  ])('%s has non-empty string values for every key', (_name, locale) => {
    const flat = flattenWithValues(locale);
    const empties: string[] = [];
    for (const [k, v] of Object.entries(flat)) {
      if (typeof v !== 'string') continue;
      if (v.trim() === '') empties.push(k);
    }
    expect(empties).toEqual([]);
  });

  // Anti-leakage on the EVO-1244 subset only: pt-BR strings introduced by
  // this card must differ from their EN counterparts (excluding pure
  // interpolation values and shared tech / brand terms). Pre-existing drift
  // across the rest of contacts.json is not enforced.
  it('pt-BR EVO-1244 values are not English leakage', () => {
    // Protocol / brand names + identifiers that legitimately render the
    // same in English and Portuguese. Update this set when a new tech term
    // is added to events.* and review picks it up. Keeping it explicit (vs
    // matching by key path) keeps the check honest — if a non-term key
    // happens to be identical, the test will still flag it.
    const ALLOWED_IDENTICAL_VALUES = new Set<string>([
      'API', 'Email', 'Instagram', 'LINE', 'SMS', 'Telegram',
      'Twilio SMS', 'WhatsApp', 'Website',
      'Identify', 'Track', 'Page', 'Screen', 'Segment',
    ]);
    const PURE_INTERPOLATION_RE = /^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}[^a-zA-Z]*$/;
    const leaks: string[] = [];
    for (const key of evo1244Keys) {
      const enVal = getAtPath(en, key);
      const ptVal = getAtPath(ptBR, key);
      if (typeof enVal !== 'string' || typeof ptVal !== 'string') continue;
      if (!enVal.trim()) continue;
      if (enVal !== ptVal) continue;
      if (ALLOWED_IDENTICAL_VALUES.has(enVal)) continue;
      if (PURE_INTERPOLATION_RE.test(enVal)) continue;
      leaks.push(`${key} = ${JSON.stringify(enVal)}`);
    }
    expect(leaks).toEqual([]);
  });
});
