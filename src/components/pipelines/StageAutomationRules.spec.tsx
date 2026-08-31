import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StageAutomationRules from './StageAutomationRules';
import type { StageAutomationRule } from '@/types/analytics/pipelines';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
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

// The rule row renders several selects (trigger, duration, base, action…);
// the duration one is the only one whose value carries the minutes/hours label.
const durationCombobox = () =>
  screen
    .getAllByRole('combobox')
    .find(cb => /stageAutomation\.inactivity\.(minutes|hour)/.test(cb.textContent ?? ''))!;

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

  it('never rewrites an untouched rule (no onChange on mount)', () => {
    const onChange = renderRules(90);
    expect(onChange).not.toHaveBeenCalled();
  });

  // CRM-471: the rule rows used to let content dictate width — the inactivity
  // pair overflowed its card (base select 10px past the border), long labels
  // hard-clipped (text-overflow: clip) and a valueless select collapsed to a
  // bare chevron. These pin the containment contract, ReorderStagesModal-style.
  describe('containment (CRM-471)', () => {
    it('lets the inactivity pair shrink below its content (min-w-0 chain)', () => {
      renderRules(2880);
      const grid = document.querySelector('.grid.grid-cols-2');
      expect(grid).not.toBeNull();
      expect(grid!.className).toContain('min-w-0');
    });

    it('truncates the pair selects with ellipsis instead of clipping or overflowing', () => {
      renderRules(2880);
      const pair = screen.getAllByRole('combobox').filter(c => c.className.includes('min-w-0'));
      expect(pair.length).toBeGreaterThanOrEqual(2);
      pair.forEach(c => expect(c.className).toContain('[&>span]:truncate'));
    });

    it('contains the move_to_pipeline pair and the free-flowing value selects too', () => {
      const onChange = vi.fn();
      render(
        <StageAutomationRules
          rules={[{
            id: 'rule-mp',
            trigger: 'label_added',
            trigger_value: 'vip',
            action: 'move_to_pipeline',
            action_value: 'other-pipeline-id',
          }]}
          onChange={onChange}
          pipelines={[]}
        />,
      );
      // User-data selects (label/agent/template names) shrink and ellipsize —
      // a long name must never overflow the rule card (review round of CRM-471).
      const contained = screen.getAllByRole('combobox').filter(c => c.className.includes('min-w-0'));
      expect(contained.length).toBeGreaterThanOrEqual(2);
      contained.forEach(c => expect(c.className).toContain('[&>span]:truncate'));
    });

    it('keeps the fixed trigger/action selects at 200px, non-shrinking, with truncation', () => {
      renderRules(1440);
      const fixed = screen.getAllByRole('combobox').filter(c => c.className.includes('w-[200px]'));
      expect(fixed.length).toBeGreaterThanOrEqual(2);
      fixed.forEach(c => {
        expect(c.className).toContain('shrink-0');
        expect(c.className).toContain('[&>span]:truncate');
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
