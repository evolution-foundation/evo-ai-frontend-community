import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { flowCategoryBadgeVariants, type FlowCategoryBadgeVariant } from './styles';

export type FlowCategoryBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant: FlowCategoryBadgeVariant;
};

export const FlowCategoryBadge = forwardRef<HTMLSpanElement, FlowCategoryBadgeProps>(
  function FlowCategoryBadge({ variant, className, ...rest }, ref) {
    return (
      <span
        ref={ref}
        className={cn(flowCategoryBadgeVariants({ variant }), className)}
        {...rest}
      />
    );
  },
);

FlowCategoryBadge.displayName = 'FlowCategoryBadge';
