import { describe, it, expect } from 'vitest';
import {
  EVENT_NAMES,
  EVENT_CATEGORIES,
  getEvent,
  getEventCatalog,
  getEventsByCategory,
  getEventsByDtoType,
  isCanonicalEvent,
  isCustomEvent,
  getEventLabel,
} from './index';

describe('frontend events manifest mirror', () => {
  it('exposes one catalog entry per EVENT_NAME', () => {
    const catalog = getEventCatalog();
    expect(catalog).toHaveLength(EVENT_NAMES.length);
    for (const name of EVENT_NAMES) {
      expect(catalog.find((e) => e.eventName === name)).toBeDefined();
    }
  });

  // L4: invariant — custom MUST always accept any payload. No required, no
  // optional. If a future edit adds fields here, AC4 breaks.
  it('includes the custom sentinel with empty schema (AC4 invariant)', () => {
    const custom = getEvent('custom');
    expect(custom).toBeDefined();
    expect(custom?.category).toBe('custom');
    expect(custom?.schema.required).toEqual({});
    expect(custom?.schema.optional).toEqual({});
  });

  it('declares the message.delivered required fields exactly as the spec calls out (AC5)', () => {
    const md = getEvent('message.delivered');
    expect(md).toBeDefined();
    expect(Object.keys(md!.schema.required).sort()).toEqual(
      ['channel_type', 'conversation_id', 'message_id', 'source'].sort(),
    );
  });

  it('groups events by category covering all 5 categories', () => {
    const grouped = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c, getEventsByCategory(c)]));
    expect(grouped.contact.length).toBeGreaterThanOrEqual(6);
    // EVO-1263: 2 original (created/resolved) + 5 added (activity, first_reply,
    // reply_time, bot_handoff, bot_resolved) to mirror EvoFlow::EVENT_NAMES.
    expect(grouped.conversation).toHaveLength(7);
    expect(grouped.message.length).toBeGreaterThanOrEqual(4);
    expect(grouped.campaign.length).toBeGreaterThanOrEqual(4);
    expect(grouped.custom).toHaveLength(1);
  });

  // EVO-1263 (AC1): the manifest is a strict replica of the backend SSOT
  // EvoFlow::EVENT_NAMES (lib/events/evo_flow_event_names.rb), which has 22
  // canonical names including `custom`. This count is the single guard keeping
  // the frontend manifest faithful to the backend enum — keep it strict.
  it('mirrors the backend EvoFlow::EVENT_NAMES count exactly (22)', () => {
    expect(EVENT_NAMES).toHaveLength(22);
    expect(getEventCatalog()).toHaveLength(22);
  });

  // EVO-1263 (AC1): the 5 conversation events that previously existed only in
  // the backend are now present with category/labels/schema. Schemas mirror
  // EvoFlow::EventSchema exactly — conversation_id + source are the ONLY
  // required fields; inbox_id is OPTIONAL on these 5 (unlike created/resolved).
  describe('EVO-1263 new conversation events', () => {
    const NEW_EVENTS = [
      'conversation.activity',
      'conversation.first_reply',
      'conversation.reply_time',
      'conversation.bot_handoff',
      'conversation.bot_resolved',
    ] as const;

    it.each(NEW_EVENTS)('%s exists with conversation category, track dto and pt/en labels', (name) => {
      const entry = getEvent(name);
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('conversation');
      expect(entry?.dtoType).toBe('track');
      expect(entry?.labelPt.length).toBeGreaterThan(0);
      expect(entry?.labelEn.length).toBeGreaterThan(0);
    });

    it.each(NEW_EVENTS)('%s requires exactly conversation_id + source, inbox_id optional', (name) => {
      const entry = getEvent(name);
      expect(Object.keys(entry!.schema.required).sort()).toEqual(['conversation_id', 'source']);
      expect(entry!.schema.optional).toHaveProperty('inbox_id');
    });

    it('surfaces the new events through getEventCatalog (AC5 propagation)', () => {
      const names = getEventCatalog().map((e) => e.eventName);
      for (const n of NEW_EVENTS) expect(names).toContain(n);
    });
  });

  it('returns undefined for an unknown event name', () => {
    expect(getEvent('not.a.real.event')).toBeUndefined();
  });

  it('identifies canonical events with isCanonicalEvent', () => {
    expect(isCanonicalEvent('contact.created')).toBe(true);
    expect(isCanonicalEvent('custom')).toBe(true);
    expect(isCanonicalEvent('not.a.real.event')).toBe(false);
  });

  it('flags custom events with isCustomEvent', () => {
    expect(isCustomEvent('custom')).toBe(true);
    expect(isCustomEvent('contact.created')).toBe(false);
  });

  describe('getEventLabel', () => {
    it('returns the PT-BR label for pt-BR locale', () => {
      expect(getEventLabel('contact.created', 'pt-BR')).toBe('Contato criado');
    });

    it('returns the PT-BR label for pt locale', () => {
      expect(getEventLabel('contact.created', 'pt')).toBe('Contato criado');
    });

    it('returns the EN label for en locale', () => {
      expect(getEventLabel('contact.created', 'en')).toBe('Contact created');
    });

    // M3 fix: non-PT non-EN locales fall back to EN (not PT) so es/fr/it users
    // don't get Portuguese labels in an otherwise translated UI.
    it('falls back to EN for non-PT locales (es/fr/it)', () => {
      expect(getEventLabel('contact.created', 'es')).toBe('Contact created');
      expect(getEventLabel('contact.created', 'fr')).toBe('Contact created');
      expect(getEventLabel('contact.created', 'it')).toBe('Contact created');
    });

    it('returns the raw name for unknown events', () => {
      expect(getEventLabel('not.a.real.event', 'en')).toBe('not.a.real.event');
    });
  });

  describe('getEventsByDtoType (S2: track/identify filter)', () => {
    it('returns identify events for dtoType=identify (contact.*)', () => {
      const names = getEventsByDtoType('identify').map((e) => e.eventName);
      expect(names).toEqual(
        expect.arrayContaining([
          'contact.created',
          'contact.updated',
          'contact.deleted',
          'contact.label.added',
          'contact.label.removed',
          'contact.custom_attribute.changed',
        ]),
      );
      expect(names).not.toContain('message.delivered');
    });

    it('returns track events for dtoType=track (everything else)', () => {
      const names = getEventsByDtoType('track').map((e) => e.eventName);
      expect(names).toContain('message.delivered');
      expect(names).toContain('conversation.created');
      expect(names).toContain('campaign.triggered');
      expect(names).toContain('custom');
      expect(names).not.toContain('contact.created');
    });
  });
});
