import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StageAutomationRules from './StageAutomationRules';
import type { MessageTemplateOption } from './StageAutomationRules';
import type { StageAutomationRule } from '@/types/analytics/pipelines';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// The pending-templates hint links out to Message Templates; the spec renders
// without a Router, so useNavigate is stubbed (the rest of the module is real).
const navigateSpy = vi.fn();
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));

const inactivityRule = (minutes: number): StageAutomationRule => ({
  id: 'rule-1',
  trigger: 'inactivity',
  trigger_value: { minutes, base: 'no_customer_reply' },
  action: 'send_direct_message',
  action_value: 'Oi! Ainda tem interesse?',
});

const renderRules = (minutes: number) => {
  const onChange = vi.fn();
  render(<StageAutomationRules rules={[inactivityRule(minutes)]} onChange={onChange} />);
  return onChange;
};

// The real parent (EditStageModal) feeds every onChange back as the new rules
// prop; the spy above does not, which would hide a value dropped on selection.
function StatefulRules({ minutes }: { minutes: number }) {
  const [rules, setRules] = useState([inactivityRule(minutes)]);
  return <StageAutomationRules rules={rules} onChange={setRules} />;
}

// The rule row renders several selects (trigger, duration, base, action…);
// the duration one is the only one whose value carries the minutes/hours label.
const durationCombobox = () => {
  const found = screen
    .getAllByRole('combobox')
    .find(cb => /stageAutomation\.inactivity\.(minutes|hour|days)/.test(cb.textContent ?? ''));
  if (!found) throw new Error('duration combobox not found — did the inactivity label keys change?');
  return found;
};

// CRM-467: the duration Select used to be a closed preset list capped at 24h.
// Values the API accepts (any positive minutes) rendered as an EMPTY select,
// making a live rule look timerless — and inviting a destructive re-save.
describe('StageAutomationRules — inactivity duration (CRM-467)', () => {
  it('renders 24h from the preset list (regression)', () => {
    renderRules(1440);
    expect(screen.getByText('24 stageAutomation.inactivity.hours')).toBeTruthy();
  });

  it('renders the new 48h preset as the selected value', () => {
    renderRules(2880);
    expect(screen.getByText('48 stageAutomation.inactivity.hours')).toBeTruthy();
  });

  it('renders an out-of-list value as a dynamic option instead of an empty select', () => {
    renderRules(90);
    expect(screen.getByText('90 stageAutomation.inactivity.minutes')).toBeTruthy();
  });

  it('offers 48h and 72h in the duration dropdown', async () => {
    const user = userEvent.setup();
    renderRules(1440);

    await user.click(durationCombobox());

    expect(screen.getByRole('option', { name: '48 stageAutomation.inactivity.hours' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '72 stageAutomation.inactivity.hours' })).toBeTruthy();
  });

  it('labels a value of a week or more in days', () => {
    renderRules(10080);
    expect(screen.getByText('7 stageAutomation.inactivity.days')).toBeTruthy();
  });

  it('never rewrites an untouched rule (no onChange on mount)', () => {
    const onChange = renderRules(90);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the API duration when another field of the rule is edited', async () => {
    const user = userEvent.setup();
    const onChange = renderRules(2880);

    await user.type(screen.getByPlaceholderText('stageAutomation.directMessagePlaceholder'), '!');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        trigger_value: { minutes: 2880, base: 'no_customer_reply' },
      }),
    ]);
  });

  it('keeps an API duration pickable after another one is selected', async () => {
    const user = userEvent.setup();
    render(<StatefulRules minutes={90} />);

    await user.click(durationCombobox());
    await user.click(screen.getByRole('option', { name: '24 stageAutomation.inactivity.hours' }));
    await user.click(durationCombobox());

    expect(
      screen.getByRole('option', { name: '90 stageAutomation.inactivity.minutes' }),
    ).toBeTruthy();
  });

  // CRM-471: the rule rows used to let content dictate width — the inactivity
  // pair overflowed its card, long labels hard-clipped (the design-system forces
  // display:flex on the value span, where text-overflow never applies) and a
  // stale value rendered an empty select. jsdom has no layout, so these pin the
  // contract: the block+truncate class on EVERY select, the ellipsis span
  // inside dotted options, and the placeholder Radix only shows for value ''.
  describe('containment (CRM-471)', () => {
    const BLOCK_VALUE = '[&>span[data-slot=select-value]]:block';
    const LONG = 'Etiqueta com um nome comprido demais para caber';
    const fixture = {
      currentPipelineId: 'p1',
      currentStageId: 's1',
      stages: [
        { id: 's1', name: 'Entrada', color: '#111' },
        { id: 's2', name: 'Qualificado', color: '#222' },
      ],
      agents: [{ id: 'a1', name: 'Agente' }],
      labels: [{ id: 'l1', title: LONG, color: '#f00' }],
      pipelines: [{ id: 'p2', name: 'Outro funil', stages: [{ id: 's9', name: 'Etapa', color: '#333' }] }],
      agentBots: [{ id: 'b1', name: 'Bot' }],
      messageTemplates: [{ id: 't1', name: 'Boas-vindas', language: 'pt_BR', status: 'APPROVED' }],
    } as unknown as Omit<Parameters<typeof StageAutomationRules>[0], 'rules' | 'onChange'>;

    const rule = (over: Partial<StageAutomationRule>, id: string): StageAutomationRule => ({
      ...inactivityRule(60),
      id,
      ...over,
    });

    // One rule per user-data select: label (trigger + action), stage, agent,
    // template, bot, pipeline+stage — every branch of the row renders.
    const allRules = () => [
      rule({ trigger: 'label_added', trigger_value: LONG, action: 'move_to_stage', action_value: 's2' }, 'r1'),
      rule({ trigger: 'conversation_status_changed', trigger_value: 'open', action: 'assign_agent', action_value: 'a1' }, 'r2'),
      rule({ trigger: 'custom_attribute_updated', trigger_value: '', action: 'apply_label', action_value: LONG }, 'r3'),
      rule({ action: 'send_template', action_value: 't1' }, 'r4'),
      rule({ trigger: 'label_added', trigger_value: '', action: 'send_ai_message', action_value: 'b1' }, 'r5'),
      rule({ action: 'move_to_pipeline', action_value: 'p2:s9' }, 'r6'),
    ];

    const renderAll = (rules = allRules()) =>
      render(<StageAutomationRules rules={rules} onChange={vi.fn()} {...fixture} />);

    const comboboxWithText = (text: string) => {
      const found = screen.getAllByRole('combobox').find(c => (c.textContent ?? '').includes(text));
      if (!found) throw new Error(`no combobox showing "${text}"`);
      return found;
    };

    it('renders every select of the six rows with the block+ellipsis contract (exact count)', () => {
      renderAll();
      const all = screen.getAllByRole('combobox');
      // r1 4 · r2 4 · r3 3 · r4 5 · r5 4 · r6 6
      expect(all).toHaveLength(26);
      all.forEach(c => {
        expect(c.className).toContain(BLOCK_VALUE);
        expect(c.className).toContain('[&>span]:truncate');
      });
    });

    it('applies the contract to each user-data select, selected value showing', () => {
      renderAll();
      ['Qualificado', 'Agente', 'Boas-vindas', 'Bot', 'Outro funil', 'Etapa'].forEach(text => {
        const c = comboboxWithText(text);
        expect(c.className).toContain(BLOCK_VALUE);
        expect(c.className).toMatch(/min-w-0/);
      });
      expect(screen.getAllByRole('combobox').filter(c => (c.textContent ?? '').includes(LONG))).toHaveLength(2);
    });

    it('keeps the fixed trigger/action selects at 200px, non-shrinking', () => {
      renderAll();
      const fixed = screen.getAllByRole('combobox').filter(c => c.className.includes('w-[200px]'));
      // 6 action selects + 5 trigger selects (custom_attribute_updated grows instead)
      expect(fixed).toHaveLength(11);
      fixed.forEach(c => expect(c.className).toContain('shrink-0'));
    });

    it('lets a trigger with no value field (custom_attribute_updated) take the row', () => {
      renderAll();
      const c = comboboxWithText('stageAutomation.triggers.custom_attribute_updated');
      expect(c.className).toContain('flex-1');
      expect(c.className).not.toContain('w-[200px]');
    });

    it('renders dotted options with their own ellipsis span so the name never hard-clips', () => {
      renderAll();
      const labelTrigger = comboboxWithText(LONG);
      const name = labelTrigger.querySelector('span.truncate');
      expect(name?.textContent).toBe(LONG);
      expect(name?.parentElement?.className).toContain('min-w-0');
    });

    it('lets the inactivity and move_to_pipeline pairs shrink below content (min-w-0 grids)', () => {
      renderAll();
      // r4 inactivity · r6 inactivity + move_to_pipeline
      const grids = document.querySelectorAll('.grid.grid-cols-2');
      expect(grids).toHaveLength(3);
      grids.forEach(g => expect(g.className).toContain('min-w-0'));
    });

    // A value the option list no longer has (deleted template, agent, label; a
    // move_to_pipeline pointing at the CURRENT pipeline) must show the
    // placeholder, not an empty box: Radix only does that for value === ''.
    describe('stale values fall back to the placeholder', () => {
      const placeholderOf = (c: HTMLElement) => c.hasAttribute('data-placeholder');

      it('template that no longer exists', () => {
        renderAll([rule({ action: 'send_template', action_value: 'gone' }, 'r')]);
        const c = comboboxWithText('stageAutomation.selectTemplate');
        expect(placeholderOf(c)).toBe(true);
      });

      it('move_to_pipeline pointing at the current pipeline', () => {
        renderAll([rule({ action: 'move_to_pipeline', action_value: 'p1:s1' }, 'r')]);
        expect(placeholderOf(comboboxWithText('stageAutomation.selectPipeline'))).toBe(true);
        expect(placeholderOf(comboboxWithText('stageAutomation.selectStage'))).toBe(true);
      });

      it('agent and label that were deleted', () => {
        renderAll([
          rule({ action: 'assign_agent', action_value: 'a-gone' }, 'ra'),
          rule({ action: 'apply_label', action_value: 'Inexistente' }, 'rl'),
        ]);
        expect(placeholderOf(comboboxWithText('stageAutomation.selectAgent'))).toBe(true);
        expect(placeholderOf(comboboxWithText('stageAutomation.selectLabel'))).toBe(true);
      });

      it('a trigger label that was deleted asks to pick one — not "any label"', () => {
        renderAll([rule({ trigger: 'label_added', trigger_value: 'Apagada', action: 'move_to_stage', action_value: 's2' }, 'r')]);
        const c = comboboxWithText('stageAutomation.selectLabel');
        expect(placeholderOf(c)).toBe(true);
        expect(c.textContent).not.toContain('stageAutomation.anyLabel');
      });

      it('"any label" (empty trigger value) is the selected sentinel, not a placeholder', () => {
        renderAll([rule({ trigger: 'label_added', trigger_value: '', action: 'move_to_stage', action_value: 's2' }, 'r')]);
        expect(placeholderOf(comboboxWithText('stageAutomation.anyLabel'))).toBe(false);
      });

      it('a known value still renders as selected (no false placeholder)', () => {
        renderAll([rule({ action: 'send_template', action_value: 't1' }, 'r')]);
        expect(placeholderOf(comboboxWithText('Boas-vindas'))).toBe(false);
      });
    });
  });

  it('emits the picked minutes and keeps the base on change', async () => {
    const user = userEvent.setup();
    const onChange = renderRules(1440);

    await user.click(durationCombobox());
    await user.click(screen.getByRole('option', { name: '72 stageAutomation.inactivity.hours' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        trigger_value: { minutes: 4320, base: 'no_customer_reply' },
      }),
    ]);
  });
});

// The owner's annotated spec (2026-08-31): a template PENDING Meta approval must
// stay visible (disabled, with the approval note) instead of collapsing into
// "no templates"; all-pending and truly-empty each get an honest hint that links
// to Message Templates.
describe('StageAutomationRules — send_template with pending templates', () => {
  const templateRule = (value: string): StageAutomationRule => ({
    ...inactivityRule(60),
    action: 'send_template',
    action_value: value,
  });
  const renderTemplates = (templates: MessageTemplateOption[], value = '') =>
    render(
      <StageAutomationRules
        rules={[templateRule(value)]}
        onChange={vi.fn()}
        messageTemplates={templates}
      />,
    );

  it('a selected PENDING template renders with the Meta-approval note', () => {
    renderTemplates(
      [
        { id: 'tpl-1', name: 'Boas-vindas', status: 'APPROVED' },
        { id: 'tpl-2', name: 'Follow-up', status: 'PENDING' },
      ],
      'tpl-2',
    );
    expect(screen.getByText(/stageAutomation\.templatePending/)).toBeTruthy();
  });

  it('only pending templates: the hint says they await approval and links out', async () => {
    renderTemplates([{ id: 'tpl-2', name: 'Follow-up', status: 'PENDING' }]);
    expect(screen.getByText('stageAutomation.templatesPendingHint')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'stageAutomation.manageTemplates' }));
    expect(navigateSpy).toHaveBeenCalledWith('/settings/message-templates');
  });

  it('truly empty: the hint asks to create one, with the same link', () => {
    renderTemplates([]);
    expect(screen.getByText('stageAutomation.noTemplatesHint')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'stageAutomation.manageTemplates' })).toBeTruthy();
  });

  it('approved templates present: no hint below the select', () => {
    renderTemplates([{ id: 'tpl-1', name: 'Boas-vindas', status: 'APPROVED' }]);
    expect(screen.queryByText('stageAutomation.templatesPendingHint')).toBeNull();
    expect(screen.queryByText('stageAutomation.noTemplatesHint')).toBeNull();
  });
});
