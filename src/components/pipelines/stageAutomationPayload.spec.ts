import { describe, it, expect } from 'vitest';
import { buildAutomationRulesPayload } from './stageAutomationPayload';
import type { StageAutomationRule } from '@/types/analytics';

const rule: StageAutomationRule = {
  trigger: 'label_added',
  trigger_value: 'lead qualificado',
  action: 'apply_label',
  action_value: 'em negociacao',
};

describe('buildAutomationRulesPayload', () => {
  // The API merges what arrives over what is stored: a key left out is preserved, not
  // cleared. Omitting the emptied field is how the form silently lost the ability to erase.
  it('sends the empty description instead of omitting it', () => {
    expect(buildAutomationRulesPayload('', [rule])).toEqual({ description: '', rules: [rule] });
  });

  it('sends the empty rule list instead of omitting it', () => {
    expect(buildAutomationRulesPayload('Primeiro contato', [])).toEqual({
      description: 'Primeiro contato',
      rules: [],
    });
  });

  it('sends both keys when both are empty', () => {
    expect(buildAutomationRulesPayload('   ', [])).toEqual({ description: '', rules: [] });
  });

  it('keeps both when both are filled', () => {
    expect(buildAutomationRulesPayload('Primeiro contato', [rule])).toEqual({
      description: 'Primeiro contato',
      rules: [rule],
    });
  });

  // CRM-467: a duration the preset Select does not carry (written by API or by
  // Darwin) has to survive a save that never touched the rule.
  it('passes an inactivity duration outside the preset list through untouched', () => {
    const inactivityRule: StageAutomationRule = {
      trigger: 'inactivity',
      trigger_value: { minutes: 2880, base: 'no_customer_reply' },
      action: 'send_direct_message',
      action_value: 'Ainda tem interesse?',
    };

    expect(buildAutomationRulesPayload('Primeiro contato', [inactivityRule])).toEqual({
      description: 'Primeiro contato',
      rules: [{ ...inactivityRule, trigger_value: { minutes: 2880, base: 'no_customer_reply' } }],
    });
  });
});
