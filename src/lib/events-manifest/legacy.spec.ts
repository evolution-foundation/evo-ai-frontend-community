import { describe, it, expect } from 'vitest';
import { resolveLegacyEventName } from './legacy';

describe('resolveLegacyEventName', () => {
  it('returns unconfigured for empty / null / undefined input', () => {
    expect(resolveLegacyEventName('')).toEqual({ selectorValue: '', customName: null });
    expect(resolveLegacyEventName(null)).toEqual({ selectorValue: '', customName: null });
    expect(resolveLegacyEventName(undefined)).toEqual({ selectorValue: '', customName: null });
  });

  it('passes through canonical dot.notation event names unchanged', () => {
    expect(resolveLegacyEventName('contact.created')).toEqual({
      selectorValue: 'contact.created',
      customName: null,
    });
    expect(resolveLegacyEventName('message.delivered')).toEqual({
      selectorValue: 'message.delivered',
      customName: null,
    });
    expect(resolveLegacyEventName('campaign.message.clicked')).toEqual({
      selectorValue: 'campaign.message.clicked',
      customName: null,
    });
  });

  it('passes through the canonical custom placeholder without a custom name', () => {
    expect(resolveLegacyEventName('custom')).toEqual({
      selectorValue: 'custom',
      customName: null,
    });
  });

  it('upgrades known snake_case names to their canonical dot.notation equivalent', () => {
    expect(resolveLegacyEventName('contact_created')).toEqual({
      selectorValue: 'contact.created',
      customName: null,
    });
    expect(resolveLegacyEventName('contact_updated')).toEqual({
      selectorValue: 'contact.updated',
      customName: null,
    });
    expect(resolveLegacyEventName('conversation_created')).toEqual({
      selectorValue: 'conversation.created',
      customName: null,
    });
    expect(resolveLegacyEventName('message_created')).toEqual({
      selectorValue: 'message.created',
      customName: null,
    });
  });

  it('marks unknown event names as custom with the original value preserved', () => {
    expect(resolveLegacyEventName('button_click')).toEqual({
      selectorValue: 'custom',
      customName: 'button_click',
    });
    expect(resolveLegacyEventName('page_viewed')).toEqual({
      selectorValue: 'custom',
      customName: 'page_viewed',
    });
    expect(resolveLegacyEventName('product_purchased')).toEqual({
      selectorValue: 'custom',
      customName: 'product_purchased',
    });
  });

  it('preserves names that are not in the manifest even if they look canonical (no false positives)', () => {
    expect(resolveLegacyEventName('pipeline.stage.updated')).toEqual({
      selectorValue: 'custom',
      customName: 'pipeline.stage.updated',
    });
  });
});
