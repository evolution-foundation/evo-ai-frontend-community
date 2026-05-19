import { cva, type VariantProps } from 'class-variance-authority';

export const flowFeedbackBannerVariants = cva(
  ['rounded-md', 'border', 'p-3', 'text-sm', 'leading-relaxed'],
  {
    variants: {
      variant: {
        info:
          'bg-flow-feedback-info-bg text-flow-feedback-info-fg border-flow-feedback-info-border',
        warn:
          'bg-flow-feedback-warn-bg text-flow-feedback-warn-fg border-flow-feedback-warn-border',
        error:
          'bg-flow-feedback-error-bg text-flow-feedback-error-fg border-flow-feedback-error-border',
        success:
          'bg-flow-feedback-success-bg text-flow-feedback-success-fg border-flow-feedback-success-border',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

export type FlowFeedbackBannerVariant = NonNullable<
  VariantProps<typeof flowFeedbackBannerVariants>['variant']
>;
