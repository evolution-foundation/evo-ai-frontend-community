import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EventSelector, type EventSelectorChange } from './EventSelector';
import '@/i18n/config';

const meta: Meta<typeof EventSelector> = {
  title: 'Journey/Shared/EventSelector',
  component: EventSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Grouped + searchable picker for canonical events from `@/lib/events-manifest`. Emits `{ eventName, isCustom }`. Used by Flow Builder Trigger Event (10.6), Campaigns Trigger (10.9), segments and conditions (10.10), Trigger Pipeline Stage Changed (10.17).',
      },
    },
  },
  args: { disabled: false },
};

export default meta;
type Story = StoryObj<typeof EventSelector>;

function Wrapper(props: { initial?: string; filter?: Array<'contact' | 'conversation' | 'message' | 'campaign' | 'custom'> }) {
  const [value, setValue] = useState<string | undefined>(props.initial);
  return (
    <div style={{ width: 360 }}>
      <EventSelector
        value={value}
        onChange={(change: EventSelectorChange) => setValue(change.eventName)}
        filterByEventType={props.filter}
      />
      <pre style={{ marginTop: 12, fontSize: 12, color: '#888' }}>value: {value ?? '(none)'}</pre>
    </div>
  );
}

export const Default: Story = {
  render: () => <Wrapper />,
};

export const PreSelected: Story = {
  render: () => <Wrapper initial="message.delivered" />,
};

export const CustomSentinel: Story = {
  render: () => <Wrapper initial="custom" />,
};

export const MessageEventsOnly: Story = {
  render: () => <Wrapper filter={['message']} />,
};

export const CampaignEventsOnly: Story = {
  render: () => <Wrapper filter={['campaign']} />,
};
