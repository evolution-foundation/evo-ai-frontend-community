import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { FlowActionSubtype } from '../FlowNode/FlowNode';
import { flowCategoryBadgeVariants, type FlowCategoryBadgeKind } from './styles';

export type FlowCategoryBadgeProps =
  | (HTMLAttributes<HTMLSpanElement> & {
      variant: 'trigger' | 'condition' | 'control' | 'exit';
    })
  | (HTMLAttributes<HTMLSpanElement> & {
      variant: 'action';
      subtype: FlowActionSubtype;
    });

export const FlowCategoryBadge = forwardRef<HTMLSpanElement, FlowCategoryBadgeProps>(
  function FlowCategoryBadge(props, ref) {
    if (props.variant === 'action') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variant, subtype, className, ...rest } = props;
      const kind: FlowCategoryBadgeKind = `action-${subtype}`;
      return (
        <span
          ref={ref}
          className={cn(flowCategoryBadgeVariants({ kind }), className)}
          {...rest}
        />
      );
    }

    const { variant, className, ...rest } = props;
    return (
      <span
        ref={ref}
        className={cn(flowCategoryBadgeVariants({ kind: variant }), className)}
        {...rest}
      />
    );
  },
);

FlowCategoryBadge.displayName = 'FlowCategoryBadge';
