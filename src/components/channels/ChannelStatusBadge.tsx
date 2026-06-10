import { Badge } from '@evoapi/design-system';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelHealthStatus } from '@/utils/channelStatus';

interface ChannelStatusBadgeProps {
  status: ChannelHealthStatus;
  className?: string;
}

const dotClasses: Record<ChannelHealthStatus, string> = {
  active: 'bg-emerald-500',
  attention: 'bg-amber-500',
  error: 'bg-red-500',
  available: 'bg-sidebar-foreground/30',
};

export default function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
  const { t } = useLanguage('channels');

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', className)}>
      <span className={cn('h-2 w-2 rounded-full', dotClasses[status])} aria-hidden="true" />
      {t(`overview.statusLabel.${status}`)}
    </Badge>
  );
}
