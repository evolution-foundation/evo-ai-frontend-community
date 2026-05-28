import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventPropertiesForm, type EventPropertiesValue } from './EventPropertiesForm';
import '@/i18n/config';

afterEach(() => {
  vi.clearAllMocks();
});

function Harness({ eventName, initial = {} }: { eventName: string; initial?: EventPropertiesValue }) {
  const [value, setValue] = useState<EventPropertiesValue>(initial);
  const onChange = vi.fn((next: EventPropertiesValue) => setValue(next));
  return (
    <>
      <EventPropertiesForm eventName={eventName} value={value} onChange={onChange} />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

describe('EventPropertiesForm', () => {
  it('returns null for an unknown event name', () => {
    const { container } = render(
      <EventPropertiesForm eventName="not.a.real.event" value={{}} onChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // AC5: message.delivered shows message_id + channel_type + conversation_id + source as required
  it('renders required fields for message.delivered (AC5)', () => {
    render(<Harness eventName="message.delivered" />);
    // Each required field renders as a label with the field name and a "*" suffix.
    expect(screen.getByText('message_id')).toBeTruthy();
    expect(screen.getByText('channel_type')).toBeTruthy();
    expect(screen.getByText('conversation_id')).toBeTruthy();
    expect(screen.getByText('source')).toBeTruthy();
  });

  it('exposes optional fields behind a single picker (collapsed by default)', () => {
    render(<Harness eventName="message.delivered" />);
    // Optional field names should NOT be rendered yet; they should be inside the picker (combobox role).
    expect(screen.queryByText('previous_status')).toBeNull();
    expect(screen.queryByText('external_error')).toBeNull();
  });

  it('reveals an optional field on selection from the picker', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.delivered" />);

    // The picker is a Select with the i18n "Add field" placeholder.
    const picker = screen.getByRole('combobox');
    await user.click(picker);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('previous_status'));

    expect(screen.getByText('previous_status')).toBeTruthy();
  });

  it('writes the user input into value via onChange', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.delivered" />);

    const input = screen.getByLabelText(/^message_id/);
    await user.type(input, 'msg-uuid-1');

    const persisted = JSON.parse(screen.getByTestId('value').textContent ?? '{}');
    expect(persisted.message_id).toBe('msg-uuid-1');
  });

  it('flags required-missing visually when a required field is empty', () => {
    render(<Harness eventName="message.delivered" />);
    // All required fields start empty in the harness -> warnings render.
    const warnings = screen.getAllByText(/Required field|Campo obrigatório/i);
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });

  // AC4: custom event -> free key/value editor
  it('renders a free key/value editor when eventName=custom', () => {
    render(<Harness eventName="custom" />);
    expect(screen.getByPlaceholderText(/^key|^chave/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/^value|^valor/i)).toBeTruthy();
  });

  it('emits {key: value} pairs from the custom editor', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="custom" />);

    await user.type(screen.getByPlaceholderText(/^key|^chave/i), 'env');
    await user.type(screen.getByPlaceholderText(/^value|^valor/i), 'staging');

    const persisted = JSON.parse(screen.getByTestId('value').textContent ?? '{}');
    expect(persisted.env).toBe('staging');
  });

  it('seeds the custom editor with existing value entries', () => {
    render(<Harness eventName="custom" initial={{ env: 'prod', user_id: '42' }} />);
    const keys = screen.getAllByPlaceholderText(/^key|^chave/i);
    expect(keys[0]).toHaveProperty('value', 'env');
    expect(keys[1]).toHaveProperty('value', 'user_id');
  });

  // F1: switching eventName drops revealed optional fields that don't exist in
  // the new schema, so SchemaField never receives spec=undefined.
  it('does not crash when eventName switches away from a schema with revealed optionals', async () => {
    const user = userEvent.setup();
    function Switcher() {
      const [eventName, setEventName] = useState('message.delivered');
      const [value, setValue] = useState<EventPropertiesValue>({});
      return (
        <>
          <button onClick={() => setEventName('contact.created')}>switch</button>
          <EventPropertiesForm eventName={eventName} value={value} onChange={setValue} />
        </>
      );
    }
    render(<Switcher />);

    // Reveal an optional field on message.delivered
    const picker = screen.getByRole('combobox');
    await user.click(picker);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('previous_status'));
    expect(screen.getByText('previous_status')).toBeTruthy();

    // Switch eventName; previous_status is not in contact.created's schema —
    // must NOT throw and must NOT render previous_status anymore.
    await user.click(screen.getByText('switch'));
    expect(screen.queryByText('previous_status')).toBeNull();
    // contact.created shows its own required fields
    expect(screen.getByText('id')).toBeTruthy();
  });
});
