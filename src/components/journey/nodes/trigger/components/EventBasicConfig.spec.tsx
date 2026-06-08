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
// directly owns: validity reporting, the required-field marker, and the
// preserve/clear switch dialog.

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
  it('reports validity = false with no event selected and flips to true once required fields are filled', async () => {
    const onValidityChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={onValidityChange} />);

    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await selectEvent(user, /contact created|contato criado/i);
    expect(onValidityChange).toHaveBeenLastCalledWith(false); // id + source still empty

    await user.type(screen.getByLabelText(/^id\s*\*?$/i), 'id-1');
    await user.type(screen.getByLabelText(/^source\s*\*?$/i), 'crm');
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('renders required schema fields with a "*" marker', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await selectEvent(user, /message delivered|mensagem entregue/i);

    const label = screen.getByText('message_id');
    expect(within(label).getByText('*')).toBeTruthy();
  });

  it('prompts preserve/clear when switching events with existing values', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialEventName="message.delivered"
        initialEventProperties={[
          { path: 'message_id', operator: { type: 'Equals', value: 'm-1' } },
        ]}
      />,
    );

    await selectEvent(user, /conversation created|conversa criada/i);
    expect(
      await screen.findByText(/preserve compatible values|preservar valores compatíveis/i),
    ).toBeTruthy();
  });
});
