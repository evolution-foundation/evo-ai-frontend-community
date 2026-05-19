import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowFeedbackBanner } from './FlowFeedbackBanner';

const meta: Meta<typeof FlowFeedbackBanner> = {
  title: 'Flow Builder/FlowFeedbackBanner',
  component: FlowFeedbackBanner,
  parameters: {
    docs: {
      description: {
        component:
          'Inline alert for Flow Builder modals and panels. Four semantic variants ' +
          '(info / warn / error / success); ARIA role defaults to `alert` for ' +
          'warn/error and `status` for info/success, overridable via the `role` prop.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'warn', 'error', 'success'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof FlowFeedbackBanner>;

export const Info: Story = {
  args: { variant: 'info', children: 'WhatsApp Cloud channels require a template.' },
};

export const Warn: Story = {
  args: { variant: 'warn', children: 'This trigger will fire for every contact in the journey.' },
};

export const Error: Story = {
  args: { variant: 'error', children: 'Webhook URL must use https:// in production.' },
};

export const Success: Story = {
  args: { variant: 'success', children: 'Configuration saved.' },
};

export const Stack: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All four variants stacked vertically as they would appear in a panel.',
      },
    },
  },
  render: () => (
    <div className="space-y-2 max-w-xl">
      <FlowFeedbackBanner variant="info">Informational note.</FlowFeedbackBanner>
      <FlowFeedbackBanner variant="warn">Heads up — this affects all contacts.</FlowFeedbackBanner>
      <FlowFeedbackBanner variant="error">Action failed; check the input.</FlowFeedbackBanner>
      <FlowFeedbackBanner variant="success">Saved.</FlowFeedbackBanner>
    </div>
  ),
};
