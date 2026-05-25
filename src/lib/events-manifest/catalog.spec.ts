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
    expect(grouped.conversation).toHaveLength(2);
    expect(grouped.message.length).toBeGreaterThanOrEqual(4);
    expect(grouped.campaign.length).toBeGreaterThanOrEqual(4);
    expect(grouped.custom).toHaveLength(1);
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
