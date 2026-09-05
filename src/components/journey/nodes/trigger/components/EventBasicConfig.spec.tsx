import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventBasicConfig } from './EventBasicConfig';
import type { EventProperty } from '@/lib/events-manifest';
import '@/i18n/config';

// Focused coverage for the extracted Básico half (EVO-1276). The broader event
// flow is already locked in by EventConfiguration.spec.tsx (which now drives this
// component through composition); these tests assert the pieces this subcomponent
// directly owns: validity reporting, the optional-filter picker, and the
// event-switch notice with Undo.

interface HarnessProps {
  initialEventName?: string;
  initialEventProperties?: EventProperty[];
  onEventPropertiesChange?: (props: EventProperty[]) => void;
  onValidityChange?: (valid: boolean) => void;
}

function Harness({
  initialEventName = '',
  initialEventProperties = [],
  onEventPropertiesChange,
  onValidityChange,
}: HarnessProps) {
  const [eventName, setEventName] = useState(initialEventName);
  const [eventProperties, setEventProperties] = useState<EventProperty[]>(initialEventProperties);
  return (
    <EventBasicConfig
      eventName={eventName}
      eventProperties={eventProperties}
      onEventNameChange={setEventName}
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
  await user.click(screen.getAllByRole('combobox')[0]);
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(label));
}

describe('EventBasicConfig (EVO-1276)', () => {
  it('reports validity = false with no event selected and true as soon as one is chosen', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);

    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    // CRM-519: properties are optional filters, never required inputs.
    await selectEvent(user, /contact created|contato criado/i);
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('offers schema keys as filters without a required marker or the event ids', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectEvent(user, /message delivered|mensagem entregue/i);

    expect(screen.queryByText('*')).toBeNull();
    expect(screen.queryByText('message_id')).toBeNull();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(1); // "+ Add filter" picker
  });

  it('keeps compatible filters on an event switch, reports the dropped ones and undoes on request', async () => {
    const onEventPropertiesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
          { path: 'channel_type', operator: { type: 'Equals', value: 'wa' } },
        ]}
        onEventPropertiesChange={onEventPropertiesChange}
      />,
    );

    await selectEvent(user, /conversation created|conversa criada/i);

    // No dialog: channel_type (same key + type) stays, message_id is dropped and reported.
    expect(onEventPropertiesChange).toHaveBeenLastCalledWith([
      { path: 'channel_type', operator: { type: 'Equals', value: 'wa' } },
    ]);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toMatch(/1 filtro removido|1 filter removed/i);

    await user.click(within(notice).getByRole('button', { name: /desfazer|undo/i }));
    expect(onEventPropertiesChange).toHaveBeenLastCalledWith([
      { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
      { path: 'channel_type', operator: { type: 'Equals', value: 'wa' } },
    ]);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('textbox', { name: /message_id/ })).toHaveProperty('value', 'm-1');
  });

  it('drops the Undo offer once the user edits a filter after the switch', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
          { path: 'content', operator: { type: 'Equals', value: 'oi' } },
        ]}
      />,
    );

    // conversation.activity keeps `content` and drops `message_id`.
    await selectEvent(user, /conversation activity|atividade na conversa/i);
    expect(screen.getByRole('status')).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: /content/ }), '!');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('custom mode is only valid once a name is typed, and says so under the field', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);

    // No event yet: the message sits under the selector.
    expect(screen.getByText(/choose an event|escolha um evento/i)).toBeTruthy();

    await selectEvent(user, /custom event|evento personalizado/i);
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText(/choose an event|escolha um evento/i)).toBeNull();
    expect(screen.getByText(/type the custom event name to save|digite o nome do evento personalizado para salvar/i)).toBeTruthy();

    await user.type(screen.getByPlaceholderText(/custom event name|nome do evento custom/i), 'button_clicked');
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText(/type the custom event name to save|digite o nome do evento personalizado para salvar/i)).toBeNull();
  });
});
