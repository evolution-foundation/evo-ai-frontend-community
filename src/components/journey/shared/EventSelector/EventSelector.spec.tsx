import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventSelector } from './EventSelector';
import '@/i18n/config';

afterEach(() => {
  vi.clearAllMocks();
});

function Wrapper(props: { initial?: string }) {
  const [value, setValue] = useState<string | undefined>(props.initial);
  const handleChange = vi.fn((change) => setValue(change.eventName));
  return (
    <>
      <EventSelector value={value} onChange={handleChange} />
      <div data-testid="last-value">{value ?? ''}</div>
    </>
  );
}

describe('EventSelector', () => {
  it('renders the placeholder when no event is selected', async () => {
    render(<Wrapper />);
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('opens the popover and exposes grouped categories on click', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByRole('combobox'));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/Contact events|Eventos de Contato/i)).toBeTruthy();
    expect(within(listbox).getByText(/Message events|Eventos de Mensagem/i)).toBeTruthy();
    expect(within(listbox).getByText(/Campaign events|Eventos de Campanha/i)).toBeTruthy();
    expect(within(listbox).getByText(/Conversation events|Eventos de Conversa/i)).toBeTruthy();
  });

  // AC2: search 'message' filters to Message Events only
  it('filters items to Message events when the user types "message" in the search box', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByRole('combobox'));
    const input = await screen.findByPlaceholderText(/search|buscar|rechercher|cerca|seleziona/i);
    await user.type(input, 'message');

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText(/Contact created|Contato criado/i)).toBeNull();
    expect(within(listbox).getByText(/Message delivered|Mensagem entregue/i)).toBeTruthy();
  });

  it('emits { eventName, isCustom: false } when a canonical event is picked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EventSelector onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/Message delivered|Mensagem entregue/i));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ eventName: 'message.delivered', isCustom: false });
  });

  it('emits { eventName: "custom", isCustom: true } when the custom sentinel is picked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EventSelector onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(/Custom event|Evento personalizado/i));

    expect(onChange).toHaveBeenCalledWith({ eventName: 'custom', isCustom: true });
  });

  it('respects filterByCategory — hides categories outside the allowed set', async () => {
    const user = userEvent.setup();
    render(<EventSelector onChange={vi.fn()} filterByCategory={['message']} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText(/Contact events|Eventos de Contato/i)).toBeNull();
    expect(within(listbox).getByText(/Message events|Eventos de Mensagem/i)).toBeTruthy();
  });

  // S2 (per card): filterByEventType accepts 'track' | 'identify' — useful for
  // screens that only emit on one DTO surface.
  it('respects filterByEventType — track only (hides contact.* identify events)', async () => {
    const user = userEvent.setup();
    render(<EventSelector onChange={vi.fn()} filterByEventType={['track']} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText(/Contact events|Eventos de Contato/i)).toBeNull();
    expect(within(listbox).getByText(/Message events|Eventos de Mensagem/i)).toBeTruthy();
  });

  it('respects filterByEventType — identify only (shows only contact.* events)', async () => {
    const user = userEvent.setup();
    render(<EventSelector onChange={vi.fn()} filterByEventType={['identify']} />);

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText(/Contact events|Eventos de Contato/i)).toBeTruthy();
    expect(within(listbox).queryByText(/Message events|Eventos de Mensagem/i)).toBeNull();
    expect(within(listbox).queryByText(/Campaign events|Eventos de Campanha/i)).toBeNull();
  });

  it('renders disabled when disabled=true', () => {
    render(<EventSelector onChange={vi.fn()} disabled />);
    expect(screen.getByRole('combobox')).toHaveProperty('disabled', true);
  });

  it('renders the selected event label in the trigger', () => {
    render(<Wrapper initial="contact.created" />);
    // English label by default in test env (i18next defaults to 'en')
    expect(screen.getByRole('combobox').textContent).toMatch(/Contact created|Contato criado/i);
  });
});
