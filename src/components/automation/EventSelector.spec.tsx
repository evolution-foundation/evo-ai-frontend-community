import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import i18n from '@/i18n/config';
import { getEventLabel } from '@/lib/events-manifest';
import { ALL_PHASE_1_EVENTS, type AutomationRuleFormData } from '@/pages/Customer/Automation/registries';
import EventSelector from './EventSelector';

// Radix Select needs these jsdom polyfills (same as ConditionRow.spec.tsx).
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

function Wrapper({ value = 'contact_created' }: { value?: string }) {
  const { control } = useForm<AutomationRuleFormData>({
    defaultValues: { event_name: value as AutomationRuleFormData['event_name'] },
  });
  return <EventSelector control={control} />;
}

describe('Automation EventSelector (EVO-1263)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  // EVO-1263 Open Risk resolution: the automation engine owns its own snake_case
  // trigger enum (NOT evo-flow). The list/values stay snake_case; only DISPLAY
  // labels for events with a canonical equivalent come from the manifest.
  it('keeps the authoritative snake_case trigger enum as the option set', () => {
    expect(ALL_PHASE_1_EVENTS).toContain('conversation_opened');
    expect(ALL_PHASE_1_EVENTS).toContain('pipeline_stage_updated');
    expect(ALL_PHASE_1_EVENTS).toContain('contact_created');
  });

  it('renders overlapping events with the manifest label and keeps automation-only labels', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('combobox'));

    const listbox = await screen.findByRole('listbox');

    // Overlapping event (has a canonical evo-flow equivalent) → manifest label.
    expect(within(listbox).getByText(getEventLabel('contact.created', 'en'))).toBeInTheDocument();
    // Automation-only event (no evo-flow equivalent) → keeps its i18n label.
    expect(within(listbox).getByText(i18n.t('automation:form.fields.event.options.conversation_opened'))).toBeInTheDocument();
  });

  it('matches the closed-trigger snapshot (UI preserved — AC4)', () => {
    const { container } = render(<Wrapper />);
    expect(container).toMatchSnapshot();
  });
});
