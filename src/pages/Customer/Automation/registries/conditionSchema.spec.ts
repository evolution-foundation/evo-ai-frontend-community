import { describe, it, expect } from 'vitest';
import { automationRuleSchema } from './index';

function baseRule(overrides: Record<string, unknown> = {}) {
  return {
    name: 'rule',
    description: '',
    event_name: 'conversation_updated',
    active: true,
    mode: 'simple',
    conditions: [],
    actions: [{ action_name: 'send_message', action_params: ['hi'] }],
    ...overrides,
  };
}

describe('automationRuleSchema condition shapes', () => {
  it('accepts attribute_changed with from/to object', () => {
    const result = automationRuleSchema.safeParse(
      baseRule({
        conditions: [
          {
            attribute_key: 'status',
            filter_operator: 'attribute_changed',
            values: { from: ['open'], to: ['resolved'] },
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts the flat values array for non attribute_changed operators', () => {
    const result = automationRuleSchema.safeParse(
      baseRule({
        conditions: [
          {
            attribute_key: 'status',
            filter_operator: 'equal_to',
            values: ['resolved'],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects attribute_changed sent with a flat values array', () => {
    const result = automationRuleSchema.safeParse(
      baseRule({
        conditions: [
          {
            attribute_key: 'status',
            filter_operator: 'attribute_changed',
            values: ['resolved'],
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects non attribute_changed operators sent with the from/to object', () => {
    const result = automationRuleSchema.safeParse(
      baseRule({
        conditions: [
          {
            attribute_key: 'status',
            filter_operator: 'equal_to',
            values: { from: ['open'], to: ['resolved'] },
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('allows empty from/to arrays (wildcards for label-added / label-removed)', () => {
    const result = automationRuleSchema.safeParse(
      baseRule({
        conditions: [
          {
            attribute_key: 'labels',
            filter_operator: 'attribute_changed',
            values: { from: [], to: ['1'] },
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });
});
