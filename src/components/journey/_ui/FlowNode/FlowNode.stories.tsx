import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowNode } from './FlowNode';

const meta: Meta<typeof FlowNode> = {
  title: 'Flow Builder/FlowNode',
  component: FlowNode,
  parameters: {
    docs: {
      description: {
        component:
          'Bridge component for any Flow Builder node body. Discriminated-union API: ' +
          '`variant` covers the 5 structural categories; when `variant="action"`, a ' +
          '`subtype` prop is required (TypeScript enforces this).',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['trigger', 'condition', 'control', 'exit', 'action'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof FlowNode>;

export const Trigger: Story = {
  args: { variant: 'trigger', children: 'Trigger node' },
};

export const Condition: Story = {
  args: { variant: 'condition', children: 'Condition node' },
};

export const Control: Story = {
  args: { variant: 'control', children: 'Control node' },
};

export const Exit: Story = {
  args: { variant: 'exit', children: 'Exit node' },
};

export const ActionMessage: Story = {
  args: { variant: 'action', subtype: 'message', children: 'Action · message' },
};

export const ActionWebhook: Story = {
  args: { variant: 'action', subtype: 'webhook', children: 'Action · webhook' },
};

export const ActionLabel: Story = {
  args: { variant: 'action', subtype: 'label', children: 'Action · label' },
};

export const ActionPipeline: Story = {
  args: { variant: 'action', subtype: 'pipeline', children: 'Action · pipeline' },
};

export const AllVariantsMatrix: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'All 8 variant+subtype combinations side by side. Use the Toolbar theme ' +
          'toggle to compare dark vs light at a glance, and the Accessibility panel ' +
          'to check contrast.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-flow-canvas-bg">
      <FlowNode variant="trigger">trigger</FlowNode>
      <FlowNode variant="condition">condition</FlowNode>
      <FlowNode variant="control">control</FlowNode>
      <FlowNode variant="exit">exit</FlowNode>
      <FlowNode variant="action" subtype="message">
        action · message
      </FlowNode>
      <FlowNode variant="action" subtype="webhook">
        action · webhook
      </FlowNode>
      <FlowNode variant="action" subtype="label">
        action · label
      </FlowNode>
      <FlowNode variant="action" subtype="pipeline">
        action · pipeline
      </FlowNode>
    </div>
  ),
};
