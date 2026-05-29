import { describe, it, expect } from 'vitest';
import en from './en/journey.json';
import ptBR from './pt-BR/journey.json';
import pt from './pt/journey.json';
import es from './es/journey.json';
import fr from './fr/journey.json';
// Renamed to avoid shadowing vitest's `it` block helper.
import itLocale from './it/journey.json';

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

/**
 * Return the value at a dot-delimited path. Returns `undefined` if any
 * segment is missing.
 */
function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

describe('journey i18n parity (EVO-1260)', () => {
  const enKeys = new Set(flatten(en));

  // PT-BR is the canonical localised pair with EN per the card scope
  // ("scope inside: PT-BR and EN are kept in lock-step"). Drift here is
  // a regression of the card and must fail the suite.
  it('pt-BR mirrors every EN key (strict, no missing, no extras)', () => {
    const ptBrKeys = new Set(flatten(ptBR));
    const missing = [...enKeys].filter((k) => !ptBrKeys.has(k));
    const extras = [...ptBrKeys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
    expect(extras).toEqual([]);
  });

  // The other Romance locales (pt, es, fr, it) carry a pre-existing drift
  // from earlier features that is OUT OF SCOPE for EVO-1260. We assert
  // soft parity here: ANY KEY added or removed by EVO-1260 must show up
  // consistently across them. To do that, we test that the NEW keys
  // introduced by this card are present in all locales. Pre-existing
  // drift is documented in the card's follow-up note and not enforced.
  const evo1260Keys = [
    'panels.scheduledAction.placeholders.selectAction',
    'panels.scheduledAction.placeholders.selectChannel',
    'panels.scheduledAction.placeholders.loadingChannels',
    'panels.scheduledAction.placeholders.loadingJourneys',
    'panels.scheduledAction.messages.noChannelsConfiguredInline',
    'panels.scheduledAction.hints.characterCount',
    'panels.conditional.placeholders.selectVariable',
    'flowEditor.nodes.sendMessage.channelLabel',
  ];

  it.each([
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s contains every EVO-1260 key', (_name, locale) => {
    const localeKeys = new Set(flatten(locale));
    const missing = evo1260Keys.filter((k) => !localeKeys.has(k));
    expect(missing).toEqual([]);
  });

  // Empty-string values would pass key-presence checks but fail the user
  // (an i18n call returns "" and the UI renders blank). Reject across the
  // set of keys EVO-1260 introduced, in every locale we ship.
  it.each([
    ['en', en],
    ['pt-BR', ptBR],
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s has non-empty string values for every EVO-1260 key', (_name, locale) => {
    const empties = evo1260Keys.filter((k) => {
      const v = getAtPath(locale, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empties).toEqual([]);
  });

  // Generalised non-empty check across EN and pt-BR (the lock-step pair):
  // every string value must be non-empty. Catches an entire-file regression
  // class (e.g. a script writing "" to a key during a future sweep) that
  // the EVO-1260-only check above misses.
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

  // Anti-leakage: catches the EVO-1260 review finding class — pt-BR
  // values byte-identical to EN that are NOT legitimate tech terms,
  // sample literals, or pure-interpolation strings. The prior parity
  // checks (presence + non-empty) passed mechanically while pt-BR
  // still rendered English to the user.
  it('pt-BR has no English leakage (pt-BR !== EN except for whitelisted tech terms)', () => {
    // Some bare tech-term entries below are not currently present as
    // standalone string values; they are kept on purpose so that a future
    // key like { "foo": "URL" } is allowlisted automatically. Lean
    // alternative: prune to only-currently-used and accept that future
    // additions need an allowlist update.
    const ALLOWED_IDENTICAL_VALUES = new Set<string>([
      // bare tech terms used identically in pt-BR
      'Webhook', 'JSON', 'URL', 'Auth', 'API', 'HTTP', 'HTTPS', 'OAuth',
      'Bearer', 'Token', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'UUID',
      'UTC', 'SLA', 'CRM', 'ID', 'Trigger', 'Triggers', 'Tag', 'Status',
      'Timeout', 'Headers', 'Header', 'Timestamp', 'XML', 'Total', 'Logs',
      'Form Data', 'Pipeline', 'Pipeline #{{pipelineId}}',
      // time units
      'min', 'h', 'd', 's', 'ms',
      // symbol-only operators (unicode notequal is the literal char)
      '=', '≠', '>', '<',
      // tech-term phrases (with optional required-marker asterisk)
      'Bearer Token', 'Bearer Token *', 'API Key', 'API Key *',
      'Basic Auth', 'Headers HTTP', 'Templates JSON', 'Bot:',
      // strings whose only "language" content is the variable placeholder
      '{{duration}} {{unit}}', 'Webhook {{method}}', 'Ex: {{example}}',
      'Basic auth: {{username}}', 'Timeout: {{timeout}}s',
      // sample literals used as placeholders in form fields
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'sk-1234567890abcdef...',
      'X-API-Key',
      'https://api.exemplo.com/webhook',
      'Content-Type',
      'application/json',
      'Ex: João Silva',
      'Ex: ID-12345',
      'Ex: button_clicked, page_viewed',
      // EN file already contains the Portuguese word "Valor" at this key
      // (apparently authored in pt-first); pt-BR matches by coincidence.
      'Valor',
    ]);

    // Pure-interpolation values whose only content is a placeholder
    // followed by a numeric or symbolic suffix (e.g. "{{count}}/1000",
    // "{{progress}}%"). These have no translatable language.
    const PURE_INTERPOLATION_RE = /^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}[^a-zA-Z]*$/;

    const enFlat = flattenWithValues(en);
    const ptFlat = flattenWithValues(ptBR);
    const leaks: string[] = [];
    for (const [key, enVal] of Object.entries(enFlat)) {
      const ptVal = ptFlat[key];
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
