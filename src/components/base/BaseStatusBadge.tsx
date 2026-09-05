import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export interface BaseStatusBadgeProps {
  status: 'active' | 'inactive' | 'blocked' | 'pending' | 'success' | 'error' | 'warning';
  text?: string;
  className?: string;
}

const statusConfig = {
  active: {
    bgClassName: 'bg-emerald-600 dark:bg-[#26533D]',
    textClassName: 'text-white',
    borderClassName: 'border-emerald-600 dark:border-[#26533D]',
  },
  inactive: {
    bgClassName: 'bg-muted',
    textClassName: 'text-foreground',
    borderClassName: 'border-border',
  },
  blocked: {
    bgClassName: 'bg-red-600 dark:bg-[#6A231D]',
    textClassName: 'text-white',
    borderClassName: 'border-red-600 dark:border-[#6A231D]',
  },
  pending: {
    bgClassName: 'bg-amber-500 dark:bg-yellow-500',
    textClassName: 'text-white',
    borderClassName: 'border-amber-500 dark:border-yellow-500',
  },
  success: {
    bgClassName: 'bg-emerald-600 dark:bg-[#26533D]',
    textClassName: 'text-white',
    borderClassName: 'border-emerald-600 dark:border-[#26533D]',
  },
  error: {
    bgClassName: 'bg-red-600 dark:bg-[#6A231D]',
    textClassName: 'text-white',
    borderClassName: 'border-red-600 dark:border-[#6A231D]',
  },
  warning: {
    bgClassName: 'bg-amber-500 dark:bg-yellow-500',
    textClassName: 'text-white',
    borderClassName: 'border-amber-500 dark:border-yellow-500',
  }
};

export default function BaseStatusBadge({ status, text, className }: BaseStatusBadgeProps) {
  const { t } = useLanguage('common');
  const config = statusConfig[status];
  const defaultText = t(`base.status.${status}`);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        config.bgClassName,
        config.textClassName,
        className
      )}
    >
      {text || defaultText}
    </span>
  );
}
