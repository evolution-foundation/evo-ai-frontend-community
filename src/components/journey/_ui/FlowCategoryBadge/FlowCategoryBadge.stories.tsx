import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowCategoryBadge } from './FlowCategoryBadge';

const meta: Meta<typeof FlowCategoryBadge> = {
  title: 'Flow Builder/FlowCategoryBadge',
  component: FlowCategoryBadge,
  parameters: {
    docs: {
      description: {
        component:
          'Pill badge labelling a node category. Mirrors `<FlowNode>`s discriminated ' +
          'union: `variant` covers the 5 structural categories; when `variant="action"`, ' +
          'a `subtype` is required so the badge colour matches the specific action node.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof FlowCategoryBadge>;

export const Trigger: Story = {
  args: { variant: 'trigger', children: 'trigger' },
};

export const Condition: Story = {
  args: { variant: 'condition', children: 'condition' },
};

export const Control: Story = {
  args: { variant: 'control', children: 'control' },
};

export const Exit: Story = {
  args: { variant: 'exit', children: 'exit' },
};

export const ActionMessage: Story = {
  args: { variant: 'action', subtype: 'message', children: 'action · message' },
};

export const ActionWebhook: Story = {
  args: { variant: 'action', subtype: 'webhook', children: 'action · webhook' },
};

export const ActionLabel: Story = {
  args: { variant: 'action', subtype: 'label', children: 'action · label' },
};

export const ActionPipeline: Story = {
  args: { variant: 'action', subtype: 'pipeline', children: 'action · pipeline' },
};

export const AllVariantsRow: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All variants and subtypes in a single row for quick comparison.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-2 p-4 bg-flow-canvas-bg">
      <FlowCategoryBadge variant="trigger">trigger</FlowCategoryBadge>
      <FlowCategoryBadge variant="condition">condition</FlowCategoryBadge>
      <FlowCategoryBadge variant="control">control</FlowCategoryBadge>
      <FlowCategoryBadge variant="exit">exit</FlowCategoryBadge>
      <FlowCategoryBadge variant="action" subtype="message">
        action · message
      </FlowCategoryBadge>
      <FlowCategoryBadge variant="action" subtype="webhook">
        action · webhook
      </FlowCategoryBadge>
      <FlowCategoryBadge variant="action" subtype="label">
        action · label
      </FlowCategoryBadge>
      <FlowCategoryBadge variant="action" subtype="pipeline">
        action · pipeline
      </FlowCategoryBadge>
    </div>
  ),
};
