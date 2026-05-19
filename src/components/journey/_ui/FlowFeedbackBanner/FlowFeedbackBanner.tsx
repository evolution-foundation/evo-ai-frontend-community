import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import {
  flowFeedbackBannerVariants,
  type FlowFeedbackBannerVariant,
} from './styles';

export type FlowFeedbackBannerProps = HTMLAttributes<HTMLDivElement> & {
  variant: FlowFeedbackBannerVariant;
};

export const FlowFeedbackBanner = forwardRef<HTMLDivElement, FlowFeedbackBannerProps>(
  function FlowFeedbackBanner({ variant, className, role, ...rest }, ref) {
    const ariaRole = role ?? (variant === 'error' || variant === 'warn' ? 'alert' : 'status');
    return (
      <div
        ref={ref}
        role={ariaRole}
        className={cn(flowFeedbackBannerVariants({ variant }), className)}
        {...rest}
      />
    );
  },
);

FlowFeedbackBanner.displayName = 'FlowFeedbackBanner';
