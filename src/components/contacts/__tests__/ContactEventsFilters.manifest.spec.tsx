import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n/config';
import { getEventLabel } from '@/lib/events-manifest';
import type { ContactEventsQuery } from '@/types/contacts';
import { ContactEventsFilters } from '../ContactEventsFilters';

// Radix Select jsdom polyfills (same as ConditionRow.spec.tsx).
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// CampaignFilterAutocomplete only fetches when its popover opens; stub the
// service so a stray mount can never hit the network.
vi.mock('@/services/campaigns/campaignsService', () => ({
  campaignsService: { list: vi.fn().mockResolvedValue({ data: [] }), get: vi.fn() },
}));

function renderFilters(value: ContactEventsQuery = {}) {
  const onChange = vi.fn();
  render(<ContactEventsFilters value={value} onChange={onChange} />);
  return { onChange };
}

async function openEventNameSelect() {
  renderFilters();
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: i18n.t('contacts:events.filters.eventName') }));
  return within(await screen.findByRole('listbox'));
}

describe('ContactEventsFilters event-name dropdown (EVO-1263)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('sources options from the manifest with canonical dot-notation values', async () => {
    const list = await openEventNameSelect();
    // Manifest labels for backend-backed events are shown.
    expect(list.getByText(getEventLabel('contact.created', 'en'))).toBeInTheDocument();
    expect(list.getByText(getEventLabel('conversation.resolved', 'en'))).toBeInTheDocument();
  });

  it('surfaces the 5 new conversation events that the manifest absorbed', async () => {
    const list = await openEventNameSelect();
    expect(list.getByText(getEventLabel('conversation.activity', 'en'))).toBeInTheDocument();
    expect(list.getByText(getEventLabel('conversation.first_reply', 'en'))).toBeInTheDocument();
  });

  it('drops the non-backend events (AC7): no pipeline_* / conversation_updated', async () => {
    const list = await openEventNameSelect();
    // These labels (old i18n `events.names.*`) must no longer appear.
    expect(list.queryByText('Pipeline stage changed')).not.toBeInTheDocument();
    expect(list.queryByText('Conversation updated')).not.toBeInTheDocument();
  });

  it('stores the canonical name as the selected value (matches ClickHouse format)', async () => {
    const { onChange } = renderFilters();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: i18n.t('contacts:events.filters.eventName') }));
    const list = within(await screen.findByRole('listbox'));
    await user.click(list.getByText(getEventLabel('contact.created', 'en')));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ event_name: 'contact.created' }));
  });

  it('matches snapshot', () => {
    const { container } = render(<ContactEventsFilters value={{}} onChange={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });
});
