import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventConfiguration } from './EventConfiguration';
import '@/i18n/config';

interface HarnessProps {
  initialEventName?: string;
  onEventNameChange?: (name: string) => void;
}

function Harness({ initialEventName = '', onEventNameChange }: HarnessProps) {
  const [eventName, setEventName] = useState(initialEventName);
  const handleChange = (next: string) => {
    setEventName(next);
    onEventNameChange?.(next);
  };
  return (
    <EventConfiguration
      eventName={eventName}
      eventProperties={[]}
      onEventNameChange={handleChange}
      onEventPropertiesChange={() => {}}
      journeyId="test-journey-id"
    />
  );
}

describe('EventConfiguration — event name UI', () => {
  it('AC1: renders the shared EventSelector as the primary entry point', () => {
    render(<Harness />);
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('AC2: when a canonical event is selected, persists its name and shows the contextual description', async () => {
    const onEventNameChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onEventNameChange={onEventNameChange} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/contact created|contato criado/i));

    expect(onEventNameChange).toHaveBeenCalledWith('contact.created');
    // Description from the manifest entry appears under the selector.
    expect(
      await screen.findByText(/a new contact was created/i),
    ).toBeTruthy();
  });

  it('AC3: when "Custom" is picked, exposes a free-text input + warning and persists the typed name', async () => {
    const onEventNameChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onEventNameChange={onEventNameChange} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/custom event|evento personalizado/i));

    const customInput = screen.getByPlaceholderText(/custom event name|nome do evento custom/i);
    expect(customInput).toBeTruthy();
    expect(
      screen.getByText(/custom events have no schema validation|não têm validação de schema/i),
    ).toBeTruthy();

    await user.type(customInput, 'button_clicked');
    expect(onEventNameChange).toHaveBeenLastCalledWith('button_clicked');
  });

  it('AC4: a legacy node with a non-canonical event name opens in custom mode with the value preserved', () => {
    render(<Harness initialEventName="button_click" />);

    const customInput = screen.getByPlaceholderText(
      /custom event name|nome do evento custom/i,
    ) as HTMLInputElement;
    expect(customInput.value).toBe('button_click');
    expect(
      screen.getByText(/custom events have no schema validation|não têm validação de schema/i),
    ).toBeTruthy();
  });

  it('migration: a legacy snake_case node upgrades to the canonical dot.notation on display', () => {
    render(<Harness initialEventName="contact_created" />);
    // Custom-mode UI is NOT rendered because the legacy name resolves to a canonical event.
    expect(
      screen.queryByPlaceholderText(/custom event name|nome do evento custom/i),
    ).toBeNull();
    // The canonical description is surfaced.
    expect(
      screen.getByText(/a new contact was created/i),
    ).toBeTruthy();
  });

  it('typing a canonical-looking name into the custom input does NOT switch out of custom mode', async () => {
    const user = userEvent.setup();
    render(<Harness initialEventName="button_click" />);

    // Sanity: starts in custom mode with the legacy value preserved.
    const customInput = screen.getByPlaceholderText(
      /custom event name|nome do evento custom/i,
    ) as HTMLInputElement;
    expect(customInput.value).toBe('button_click');

    // Clear and type a name that would resolve as canonical if re-derived.
    await user.clear(customInput);
    await user.type(customInput, 'contact.created');

    // Custom input MUST still be visible (no premature exit from custom mode).
    expect(
      screen.queryByPlaceholderText(/custom event name|nome do evento custom/i),
    ).not.toBeNull();
    // The canonical description must NOT be rendered (we're still in custom mode).
    expect(screen.queryByText(/a new contact was created/i)).toBeNull();
    // And the warning is still visible.
    expect(
      screen.getByText(/custom events have no schema validation|não têm validação de schema/i),
    ).toBeTruthy();
  });
});
