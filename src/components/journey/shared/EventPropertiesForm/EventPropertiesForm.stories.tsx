import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EventPropertiesForm, type EventPropertiesValue } from './EventPropertiesForm';
import '@/i18n/config';

const meta: Meta<typeof EventPropertiesForm> = {
  title: 'Journey/Shared/EventPropertiesForm',
  component: EventPropertiesForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Schema-aware form for canonical event payloads. Renders required fields by spec.type, hides optional behind a picker, and switches to a free key/value editor when `eventName=custom`. Foundation for the EVO-1275 (10.7) Event Properties refactor.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EventPropertiesForm>;

function Wrapper({ eventName, initial = {} }: { eventName: string; initial?: EventPropertiesValue }) {
  const [value, setValue] = useState<EventPropertiesValue>(initial);
  return (
    <div style={{ width: 360 }}>
      <EventPropertiesForm eventName={eventName} value={value} onChange={setValue} />
      <pre style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export const MessageDelivered: Story = {
  render: () => <Wrapper eventName="message.delivered" />,
};

export const MessageDeliveredFilled: Story = {
  render: () => (
    <Wrapper
      eventName="message.delivered"
      initial={{
        message_id: 'msg-uuid-1',
        channel_type: 'Channel::Whatsapp',
        conversation_id: 'conv-uuid-1',
        source: 'messaging',
      }}
    />
  ),
};

export const ContactCreated: Story = {
  render: () => <Wrapper eventName="contact.created" />,
};

export const CampaignMessageOpened: Story = {
  render: () => <Wrapper eventName="campaign.message.opened" />,
};

export const CustomKeyValue: Story = {
  render: () => <Wrapper eventName="custom" />,
};

export const CustomWithSeed: Story = {
  render: () => <Wrapper eventName="custom" initial={{ utm_source: 'newsletter', plan: 'pro' }} />,
};
