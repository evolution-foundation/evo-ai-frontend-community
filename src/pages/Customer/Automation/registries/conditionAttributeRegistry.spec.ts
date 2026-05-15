import { describe, it, expect } from 'vitest';
import {
  conditionAttributeRegistry,
  getAttributesForEvent,
  getOperatorsForAttributeInEvent,
} from './conditionAttributeRegistry';
import { conditionTypeRegistry } from './conditionTypeRegistry';

const BACKEND_CONDITION_KEYS = [
  'content',
  'email',
  'country_code',
  'status',
  'message_type',
  'assignee_id',
  'team_id',
  'referer',
  'city',
  'company',
  'inbox_id',
  'mail_subject',
  'phone_number',
  'priority',
  'pipeline_id',
  'pipeline_stage_id',
  'labels',
  'name',
  'identifier',
  'blocked',
];

describe('conditionAttributeRegistry', () => {
  it('exposes all 20 backend condition attributes', () => {
    const registryKeys = Object.keys(conditionAttributeRegistry).sort();
    expect(registryKeys).toEqual([...BACKEND_CONDITION_KEYS].sort());
  });

  it('every descriptor references a known data type', () => {
    const knownTypes = Object.keys(conditionTypeRegistry);
    for (const descriptor of Object.values(conditionAttributeRegistry)) {
      expect(knownTypes).toContain(descriptor.dataType);
    }
  });

  it('every descriptor declares at least one operator', () => {
    for (const descriptor of Object.values(conditionAttributeRegistry)) {
      expect(descriptor.operators.length).toBeGreaterThan(0);
    }
  });

  it('every descriptor has a non-empty validFor list and an i18nKey', () => {
    for (const descriptor of Object.values(conditionAttributeRegistry)) {
      expect(descriptor.validFor.length).toBeGreaterThan(0);
      expect(descriptor.i18nKey).toMatch(/^form\.fields\.attributes\./);
    }
  });

  it('pipeline_id restricts to the four allowed operators (no attribute_changed — backend does not dispatch pipeline_id transitions)', () => {
    const pipelineOps = ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'];
    expect(conditionAttributeRegistry.pipeline_id.operators.sort()).toEqual([...pipelineOps].sort());
  });

  it('pipeline_stage_id keeps the four base operators and adds attribute_changed (backend dispatches pipeline_stage_id transitions)', () => {
    const expected = ['equal_to', 'not_equal_to', 'is_present', 'is_not_present', 'attribute_changed'];
    expect(conditionAttributeRegistry.pipeline_stage_id.operators.sort()).toEqual([...expected].sort());
  });

  it('contact_created event surfaces only contact-context attributes', () => {
    const attrs = getAttributesForEvent('contact_created');
    const keys = attrs.map((a) => a.attributeKey);
    expect(keys).toContain('email');
    expect(keys).toContain('name');
    expect(keys).toContain('blocked');
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('content');
  });

  it('pipeline_stage_updated event surfaces pipeline and conversation attributes', () => {
    const attrs = getAttributesForEvent('pipeline_stage_updated');
    const keys = attrs.map((a) => a.attributeKey);
    expect(keys).toContain('pipeline_id');
    expect(keys).toContain('pipeline_stage_id');
    expect(keys).toContain('status');
  });

  it('phone_number includes starts_with operator (case-insensitive YML override)', () => {
    expect(conditionAttributeRegistry.phone_number.operators).toContain('starts_with');
  });

  describe('attribute_changed exposure', () => {
    const withAttributeChanged = ['status', 'priority', 'assignee_id', 'team_id', 'labels', 'blocked', 'pipeline_stage_id'];
    const withoutAttributeChanged = ['content', 'email', 'name', 'phone_number', 'inbox_id', 'pipeline_id', 'identifier', 'city'];

    it.each(withAttributeChanged)('exposes attribute_changed on %s', (key) => {
      expect(conditionAttributeRegistry[key].operators).toContain('attribute_changed');
    });

    it.each(withoutAttributeChanged)('does not expose attribute_changed on %s', (key) => {
      expect(conditionAttributeRegistry[key].operators).not.toContain('attribute_changed');
    });
  });

  describe('getOperatorsForAttributeInEvent', () => {
    it('keeps attribute_changed for update-type events', () => {
      const ops = getOperatorsForAttributeInEvent('status', 'conversation_updated');
      expect(ops).toContain('attribute_changed');
    });

    it('strips attribute_changed for *_created events (no previous value to compare)', () => {
      expect(getOperatorsForAttributeInEvent('status', 'conversation_created')).not.toContain('attribute_changed');
      expect(getOperatorsForAttributeInEvent('priority', 'message_created')).not.toContain('attribute_changed');
      expect(getOperatorsForAttributeInEvent('blocked', 'contact_created')).not.toContain('attribute_changed');
    });

    it('strips attribute_changed for conversation_opened', () => {
      const ops = getOperatorsForAttributeInEvent('status', 'conversation_opened');
      expect(ops).not.toContain('attribute_changed');
    });

    it('preserves non-attribute_changed operators across all events', () => {
      const ops = getOperatorsForAttributeInEvent('status', 'conversation_created');
      expect(ops).toContain('equal_to');
      expect(ops).toContain('not_equal_to');
    });

    it('returns empty array for unknown attribute keys', () => {
      expect(getOperatorsForAttributeInEvent('not_a_real_attribute', 'conversation_updated')).toEqual([]);
    });
  });
});
