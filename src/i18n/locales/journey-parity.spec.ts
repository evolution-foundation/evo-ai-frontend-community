import { describe, it, expect } from 'vitest';
import en from './en/journey.json';
import ptBR from './pt-BR/journey.json';
import pt from './pt/journey.json';
import es from './es/journey.json';
import fr from './fr/journey.json';
// Renamed to avoid shadowing vitest's `it` block helper.
import itLocale from './it/journey.json';
import { findLeaks, flatten, getAtPath } from './_lib/parity';

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

  // EVO-1275: the event-switch confirm-modal keys were added to ALL six
  // locales (the strict en↔pt-BR mirror would otherwise leave pt/es/fr/it
  // unguarded against silent drift/removal). Assert presence + non-empty
  // across every shipped locale, mirroring the EVO-1260 pattern above.
  const evo1275Keys = [
    'triggerComponents.event.eventSwitch.title',
    'triggerComponents.event.eventSwitch.body',
    'triggerComponents.event.eventSwitch.preserve',
    'triggerComponents.event.eventSwitch.clear',
  ];

  it.each([
    ['en', en],
    ['pt-BR', ptBR],
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s contains every EVO-1275 event-switch key, non-empty', (_name, locale) => {
    const offenders = evo1275Keys.filter((k) => {
      const v = getAtPath(locale, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(offenders).toEqual([]);
  });

  // Anti-leakage: catches the EVO-1260 review finding class — pt-BR
  // values byte-identical to EN that are NOT legitimate tech terms,
  // sample literals, or pure-interpolation strings. Uses the shared
  // helper (EVO-1430) with a journey-specific allowlist.
  const JOURNEY_ALLOWED_IDENTICAL = new Set<string>([
    // bare tech terms used identically in pt-BR
    'Webhook', 'JSON', 'URL', 'Auth', 'API', 'HTTP', 'HTTPS', 'OAuth',
    'Bearer', 'Token', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'UUID',
    'UTC', 'SLA', 'CRM', 'ID', 'Trigger', 'Triggers', 'Tag', 'Status',
    'Timeout', 'Headers', 'Header', 'Timestamp', 'XML', 'Total', 'Logs',
    'Form Data', 'Pipeline', 'Pipeline #{{pipelineId}}',
    // time units
    'min', 'h', 'd', 's', 'ms',
    // tech-term phrases (with optional required-marker asterisk)
    'Bearer Token', 'Bearer Token *', 'API Key', 'API Key *',
    'Basic Auth', 'Headers HTTP', 'Templates JSON', 'Bot:',
    // "Template" is the established pt-BR loanword across the Send Message
    // block (Template de mensagem, Escolha um template, …) — kept identical
    // to EN by design, so the labels match the surrounding copy.
    'Template', 'Template:',
    // strings whose only "language" content is the variable placeholder
    'Webhook {{method}}', 'Basic auth: {{username}}', 'Timeout: {{timeout}}s',
    // sample literals used as placeholders in form fields
    'X-API-Key', 'Content-Type', 'application/json',
    // EN file already contains the Portuguese word "Valor" at this key
    // (apparently authored in pt-first); pt-BR matches by coincidence.
    'Valor',
  ]);

  it('pt-BR has no English leakage (pt-BR !== EN except for whitelisted tech terms)', () => {
    const leaks = findLeaks(en, ptBR, JOURNEY_ALLOWED_IDENTICAL);
    expect(leaks).toEqual([]);
  });
});
