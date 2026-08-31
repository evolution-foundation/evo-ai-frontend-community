import React, { ReactNode } from 'react';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@evoapi/design-system';
import { cn } from '@/utils/cn';


interface PrimaryActionButtonProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  className?: string;
  disabled?: boolean;
  tooltip?: string;
}

export default function PrimaryActionButton({
  label,
  icon,
  onClick,
  size = 'sm',
  variant = 'default',
  className,
  disabled = false,
  tooltip,
}: PrimaryActionButtonProps) {
  // Render icon correctly - if it's a component, render it as JSX
  const renderIcon = () => {
    if (!icon) return null;

    // If it's already a valid React element, render it directly
    if (React.isValidElement(icon)) {
      return <span className="mr-2">{icon}</span>;
    }

    // If it's a component constructor (function), render it as JSX
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return (
        <span className="mr-2">
          <IconComponent className="h-4 w-4" />
        </span>
      );
    }

    // Otherwise, render as is
    return <span className="mr-2">{icon}</span>;
  };

  // The design-system Button sets no `type`, so the HTML default (submit) applies:
  // inside a <form> this fires onClick AND submits. The prop contract here is
  // onClick-only, and `action.onClick` in EmptyState is typed `() => void`, so the
  // event never surfaces for a caller to preventDefault — the tsc cannot catch it.
  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        variant === 'default' && 'bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {renderIcon()}
      {label}
    </Button>
  );

  // If there's a tooltip and the button is disabled, wrap it with tooltip
  if (tooltip && disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
