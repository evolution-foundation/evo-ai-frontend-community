import { cn } from '@/utils/cn';

interface UnreadBadgeProps {
  count: number;
  ariaLabel?: string;
  className?: string;
}

export function UnreadBadge({ count, ariaLabel, className }: UnreadBadgeProps) {
  if (count <= 0) return null;
  const display = count < 100 ? String(count) : '99+';
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium leading-none',
        className,
      )}
    >
      {display}
    </span>
  );
}
