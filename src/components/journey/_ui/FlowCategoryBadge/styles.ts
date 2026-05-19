import { cva, type VariantProps } from 'class-variance-authority';

export const flowCategoryBadgeVariants = cva(
  [
    'inline-flex',
    'items-center',
    'gap-1',
    'rounded-full',
    'border',
    'px-2',
    'py-0.5',
    'text-xs',
    'font-medium',
  ],
  {
    variants: {
      variant: {
        trigger:
          'bg-flow-node-trigger-bg text-flow-node-trigger-fg border-flow-node-trigger-border',
        action:
          'bg-flow-node-action-message-bg text-flow-node-action-message-fg border-flow-node-action-message-border',
        condition:
          'bg-flow-node-condition-bg text-flow-node-condition-fg border-flow-node-condition-border',
        control:
          'bg-flow-node-control-bg text-flow-node-control-fg border-flow-node-control-border',
        exit:
          'bg-flow-node-exit-bg text-flow-node-exit-fg border-flow-node-exit-border',
      },
    },
    defaultVariants: {
      variant: 'trigger',
    },
  },
);

export type FlowCategoryBadgeVariant = NonNullable<
  VariantProps<typeof flowCategoryBadgeVariants>['variant']
>;
