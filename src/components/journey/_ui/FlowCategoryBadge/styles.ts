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
      kind: {
        trigger:
          'bg-flow-node-trigger-bg text-flow-node-trigger-fg border-flow-node-trigger-border',
        condition:
          'bg-flow-node-condition-bg text-flow-node-condition-fg border-flow-node-condition-border',
        control:
          'bg-flow-node-control-bg text-flow-node-control-fg border-flow-node-control-border',
        exit:
          'bg-flow-node-exit-bg text-flow-node-exit-fg border-flow-node-exit-border',
        'action-message':
          'bg-flow-node-action-message-bg text-flow-node-action-message-fg border-flow-node-action-message-border',
        'action-webhook':
          'bg-flow-node-action-webhook-bg text-flow-node-action-webhook-fg border-flow-node-action-webhook-border',
        'action-label':
          'bg-flow-node-action-label-bg text-flow-node-action-label-fg border-flow-node-action-label-border',
        'action-pipeline':
          'bg-flow-node-action-pipeline-bg text-flow-node-action-pipeline-fg border-flow-node-action-pipeline-border',
      },
    },
    defaultVariants: {
      kind: 'trigger',
    },
  },
);

export type FlowCategoryBadgeKind = NonNullable<
  VariantProps<typeof flowCategoryBadgeVariants>['kind']
>;
