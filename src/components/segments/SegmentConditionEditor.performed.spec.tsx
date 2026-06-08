import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n/config';
import { getEventLabel } from '@/lib/events-manifest';
import type { PerformedNode } from '@/types/analytics';
import SegmentConditionEditor from './SegmentConditionEditor';

// Radix Select jsdom polyfills (same as ConditionRow.spec.tsx).
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: { getCustomAttributes: vi.fn().mockResolvedValue({ data: [] }) },
}));

const performed: PerformedNode = { id: 'n1', type: 'Performed', event: '', timesOperator: 'GreaterThanOrEqual', times: 1 };

function renderPerformed(condition: PerformedNode = performed) {
  const onUpdate = vi.fn();
  render(<SegmentConditionEditor condition={condition} index={0} onUpdate={onUpdate} onRemove={vi.fn()} />);
  return { onUpdate };
}

// The Performed block has several comboboxes (condition type, event, times
// operator). The event picker is the one showing the placeholder.
function eventCombobox(): HTMLElement {
  const el = screen.getAllByRole('combobox').find((c) => c.textContent?.includes('Selecione um evento'));
  if (!el) throw new Error('event combobox not found');
  return el;
}

describe('SegmentConditionEditor — Performed condition (EVO-1263)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  // Decision #7: the free-text input + aspirational templates are removed; only
  // canonical manifest events are selectable. This snapshot is intentionally new.
  it('no longer renders the free-text event input', () => {
    renderPerformed();
    expect(screen.queryByPlaceholderText('Ex: button_clicked, page_viewed')).not.toBeInTheDocument();
  });

  it('offers canonical manifest events (incl. the 5 new conversation events)', async () => {
    renderPerformed();
    const user = userEvent.setup();
    await user.click(eventCombobox());
    const list = within(await screen.findByRole('listbox'));
    expect(list.getByText(getEventLabel('contact.created', 'en'))).toBeInTheDocument();
    expect(list.getByText(getEventLabel('conversation.bot_handoff', 'en'))).toBeInTheDocument();
    // Old non-backend template options are gone (AC7).
    expect(list.queryByText('Botão Clicado')).not.toBeInTheDocument();
    expect(list.queryByText('Entrou no Segmento')).not.toBeInTheDocument();
  });

  it('selects a canonical event and reflects it in the trigger (stored as dot-notation)', async () => {
    renderPerformed();
    const user = userEvent.setup();
    const combo = eventCombobox();
    await user.click(combo);
    const list = within(await screen.findByRole('listbox'));
    await user.click(list.getByText(getEventLabel('conversation.activity', 'en')));
    // The trigger now shows the canonical event's label — the value bound to
    // PerformedNode.event is the dot-notation name `conversation.activity`.
    expect(combo).toHaveTextContent(getEventLabel('conversation.activity', 'en'));
  });

  it('renders a persisted legacy snake_case value via resolveLegacyEventName (AC6)', () => {
    // A pre-existing segment saved with the LEGACY snake_case value must still
    // display the canonical manifest label (resolved via resolveLegacyEventName),
    // even though the stored value is not migrated.
    renderPerformed({ ...performed, event: 'contact_created' });
    expect(screen.getByText(getEventLabel('contact.created', 'en'))).toBeInTheDocument();
  });

  it('shows the placeholder for a dropped non-backend value (no canonical match)', () => {
    // `button_clicked` was removed (AC7) and has no canonical equivalent, so the
    // picker falls back to the placeholder rather than mislabeling it.
    renderPerformed({ ...performed, event: 'button_clicked' });
    expect(eventCombobox()).toHaveTextContent('Selecione um evento');
  });
});
