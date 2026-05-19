import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { flowNodeVariants, type FlowNodeKind } from './styles';

export type FlowActionSubtype = 'message' | 'webhook' | 'label' | 'pipeline';

export type FlowNodeProps =
  | (HTMLAttributes<HTMLDivElement> & {
      variant: 'trigger' | 'condition' | 'control' | 'exit';
    })
  | (HTMLAttributes<HTMLDivElement> & {
      variant: 'action';
      subtype: FlowActionSubtype;
    });

export const FlowNode = forwardRef<HTMLDivElement, FlowNodeProps>(function FlowNode(
  props,
  ref,
) {
  if (props.variant === 'action') {
    const { variant: _variant, subtype, className, ...rest } = props;
    const kind: FlowNodeKind = `action-${subtype}`;
    return (
      <div ref={ref} className={cn(flowNodeVariants({ kind }), className)} {...rest} />
    );
  }

  const { variant, className, ...rest } = props;
  return (
    <div ref={ref} className={cn(flowNodeVariants({ kind: variant }), className)} {...rest} />
  );
});

FlowNode.displayName = 'FlowNode';
