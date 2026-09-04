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
