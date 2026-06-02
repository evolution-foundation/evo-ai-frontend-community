import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import i18n from '@/i18n/config';
import { getEvent, getEventLabel } from '@/lib/events-manifest';
import { ContactEventsFilters } from './contacts/ContactEventsFilters';
import AutomationEventSelector from './automation/EventSelector';
import type { AutomationRuleFormData } from '@/pages/Customer/Automation/registries';

// Cross-screen single-source-of-truth guard (EVO-1263 AC2).
//
// Multiple screens touch `event_name`. They keep their own UI/UX, but the
// label/category for a canonical event MUST be identical everywhere because all
// of them read it from the same manifest (getEventLabel / getEvent). This spec
// mounts two real consumers — Contact History filters (dot-notation values) and
// Automation Rules (snake_case enum, manifest labels for overlapping events) —
// and asserts `contact.created` renders with the SAME label in both.

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

vi.mock('@/services/campaigns/campaignsService', () => ({
  campaignsService: { list: vi.fn().mockResolvedValue({ data: [] }), get: vi.fn() },
}));

function AutomationWrapper() {
  const { control } = useForm<AutomationRuleFormData>({
    defaultValues: { event_name: 'contact_created' },
  });
  return <AutomationEventSelector control={control} />;
}

describe('event manifest consumers — cross-screen label parity (EVO-1263)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders contact.created with the same manifest label in Contact filters and Automation', async () => {
    const user = userEvent.setup();
    const expectedLabel = getEventLabel('contact.created', 'en');

    // Screen 1: Contact History filters.
    const contact = render(
      <ContactEventsFilters value={{}} onChange={() => {}} />,
    );
    await user.click(
      screen.getByRole('combobox', { name: i18n.t('contacts:events.filters.eventName') }),
    );
    expect(
      within(await screen.findByRole('listbox')).getByText(expectedLabel),
    ).toBeInTheDocument();
    contact.unmount();

    // Screen 2: Automation Rules selector.
    render(<AutomationWrapper />);
    await user.click(screen.getByRole('combobox'));
    expect(
      within(await screen.findByRole('listbox')).getByText(expectedLabel),
    ).toBeInTheDocument();
  });

  it('exposes a single category for a canonical event (consumed identically)', () => {
    expect(getEvent('contact.created')?.category).toBe('contact');
    expect(getEvent('conversation.activity')?.category).toBe('conversation');
  });
});
