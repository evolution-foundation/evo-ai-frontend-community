import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventConfiguration } from './EventConfiguration';
import '@/i18n/config';

interface EventProperty {
  path: string;
  operator: { type: string; value?: unknown };
}

interface HarnessProps {
  initialEventName?: string;
  initialEventProperties?: EventProperty[];
  onEventNameChange?: (name: string) => void;
  onEventPropertiesChange?: (props: EventProperty[]) => void;
  onValidityChange?: (valid: boolean) => void;
}

// Stateful over BOTH eventName and eventProperties so event-switch and
// property-edit round-trips behave like the real consumers.
function Harness({
  initialEventName = '',
  initialEventProperties = [],
  onEventNameChange,
  onEventPropertiesChange,
  onValidityChange,
}: HarnessProps) {
  const [eventName, setEventName] = useState(initialEventName);
  const [eventProperties, setEventProperties] = useState<EventProperty[]>(initialEventProperties);
  return (
    <EventConfiguration
      eventName={eventName}
      eventProperties={eventProperties}
      onEventNameChange={next => {
        setEventName(next);
        onEventNameChange?.(next);
      }}
      onEventPropertiesChange={next => {
        setEventProperties(next);
        onEventPropertiesChange?.(next);
      }}
      onValidityChange={onValidityChange}
      journeyId="test-journey-id"
    />
  );
}

async function selectEvent(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  // The EventSelector is the FIRST combobox; the optional-field picker (when an
  // event is already selected) renders a second one.
  await user.click(screen.getAllByRole('combobox')[0]);
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(label));
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

describe('EventConfiguration — schema-driven Event Properties form (EVO-1275)', () => {
  it('AC1: renders required schema fields with a "*" marker under the Required section', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectEvent(user, /message delivered|mensagem entregue/i);

    expect(screen.getByText(/required fields|campos obrigatórios/i)).toBeTruthy();
    // message.delivered requires message_id; the schema field renders with a "*".
    const label = screen.getByText('message_id');
    expect(label).toBeTruthy();
    expect(within(label).getByText('*')).toBeTruthy();
  });

  it('AC3: the optional-field autocomplete lists schema optionals and adds a field on select', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectEvent(user, /message delivered|mensagem entregue/i);

    // The "+ Add field" picker is the second combobox (the EventSelector is the first).
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(1);
    await user.click(comboboxes[1]);
    const option = await screen.findByRole('option', { name: 'status' });
    expect(option).toBeTruthy();
    await user.click(option);

    // Selecting it surfaces an input for that optional field.
    expect(screen.getByText('status')).toBeTruthy();
  });

  it('AC5: custom event renders a free key/value editor and reports validity = true', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);
    await selectEvent(user, /custom event|evento personalizado/i);

    expect(screen.getByText(/custom properties|propriedades personalizadas|propiedades personalizadas|propriétés personnalisées|proprietà personalizzate/i)).toBeTruthy();
    expect(screen.getAllByPlaceholderText(/key|chave|clave|clé|key/i).length).toBeGreaterThan(0);
    // Custom mode is never schema-blocked.
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('AC6: filling a required field persists an Equals filter-condition array', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onEventPropertiesChange={onEventPropertiesChange} />);
    await selectEvent(user, /contact created|contato criado/i);

    await user.type(screen.getByLabelText(/^source\s*\*?$/i), 'crm');

    const last = onEventPropertiesChange.mock.calls.at(-1)?.[0];
    expect(last).toEqual([{ path: 'source', operator: { type: 'Equals', value: 'crm' } }]);
  });

  it('AC7: editing a legacy non-Equals field collapses it to Equals while untouched rows keep their operator', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Contains', value: 'x' } },
          { path: 'channel_type', operator: { type: 'Contains', value: 'wa' } },
        ]}
        onEventPropertiesChange={onEventPropertiesChange}
      />,
    );

    // Edit only message_id; leave channel_type untouched.
    await user.type(screen.getByLabelText(/^message_id\s*\*?$/i), 'y');

    const last = onEventPropertiesChange.mock.calls.at(-1)?.[0] as EventProperty[];
    const messageId = last.find(p => p.path === 'message_id');
    const channelType = last.find(p => p.path === 'channel_type');
    expect(messageId?.operator.type).toBe('Equals'); // edited → collapsed
    expect(messageId?.operator.value).toBe('xy');
    expect(channelType?.operator.type).toBe('Contains'); // untouched → preserved
    expect(channelType?.operator.value).toBe('wa');
  });

  it('AC2 (validity): reports invalid while a required field is empty and valid once filled', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);
    await selectEvent(user, /contact created|contato criado/i);

    // contact.created requires id + source; both empty → invalid.
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await user.type(screen.getByLabelText(/^id\s*\*?$/i), 'id-1');
    await user.type(screen.getByLabelText(/^source\s*\*?$/i), 'crm');

    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('AC4: switching canonical events prompts preserve/clear; Preserve keeps compatible values and drops the rest', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
          { path: 'conversation_id', operator: { type: 'Equals', value: 'c-1' } },
          { path: 'channel_type', operator: { type: 'Equals', value: 'wa' } },
          { path: 'source', operator: { type: 'Equals', value: 'crm' } },
        ]}
        onEventPropertiesChange={onEventPropertiesChange}
      />,
    );

    await selectEvent(user, /conversation created|conversa criada/i);

    // Confirm dialog appears.
    expect(
      await screen.findByText(/preserve compatible values|preservar valores compatíveis/i),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /preserve compatible|preservar compatíveis/i }));

    const last = onEventPropertiesChange.mock.calls.at(-1)?.[0] as EventProperty[];
    const keys = last.map(p => p.path).sort();
    // conversation.created shares conversation_id (uuid), source (string), channel_type (string);
    // message_id is absent from its schema → dropped.
    expect(keys).toEqual(['channel_type', 'conversation_id', 'source']);
    expect(keys).not.toContain('message_id');
  });

  it('AC4: choosing Clear on an event switch resets properties to an empty array', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
        ]}
        onEventPropertiesChange={onEventPropertiesChange}
      />,
    );

    await selectEvent(user, /conversation created|conversa criada/i);
    await user.click(screen.getByRole('button', { name: /clear all|limpar tudo/i }));

    expect(onEventPropertiesChange).toHaveBeenLastCalledWith([]);
  });

  it('M1: dismissing the event-switch dialog (Esc) defaults to Clear, never stranding old values', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
        ]}
        onEventPropertiesChange={onEventPropertiesChange}
      />,
    );

    await selectEvent(user, /conversation created|conversa criada/i);
    expect(
      await screen.findByText(/preserve compatible values|preservar valores compatíveis/i),
    ).toBeTruthy();

    await user.keyboard('{Escape}');

    // Dismiss must not leave message.delivered's values under conversation.created.
    expect(onEventPropertiesChange).toHaveBeenLastCalledWith([]);
  });

  it('M2: an optional field that already holds a value is shown on open (not hidden behind the picker)', () => {
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          // `content` is an OPTIONAL field on message.delivered.
          { path: 'content', operator: { type: 'Equals', value: 'hello world' } },
        ]}
      />,
    );

    // The field renders immediately with its persisted value — no "+ Add field" click needed.
    expect(screen.getByText('content')).toBeTruthy();
    expect(screen.getByDisplayValue('hello world')).toBeTruthy();
  });

  it('L1: blocks validity until an event is actually selected', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);

    // No event chosen yet → invalid (Save must not be enabled by an empty config).
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    // Custom event has no required fields → valid once selected.
    await selectEvent(user, /custom event|evento personalizado/i);
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });
});
