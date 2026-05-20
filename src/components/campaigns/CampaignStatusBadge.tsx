import { Badge } from '@evoapi/design-system';
import { CampaignStatus } from '@/types/campaigns';
import { Clock, Send, Pause, StopCircle, CheckCircle, FileText, FlaskConical } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export default function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const { t } = useLanguage('campaigns');

  const getStatusConfig = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.DRAFT:
        return {
          label: t('status.draft'),
          variant: 'secondary' as const,
          icon: FileText,
        };
      case CampaignStatus.SCHEDULED:
        return {
          label: t('status.scheduled'),
          variant: 'default' as const,
          icon: Clock,
        };
      case CampaignStatus.SENDING:
        return {
          label: t('status.sending'),
          variant: 'default' as const,
          icon: Send,
        };
      case CampaignStatus.PAUSED:
        return {
          label: t('status.paused'),
          variant: 'secondary' as const,
          icon: Pause,
        };
      case CampaignStatus.STOPPED:
        return {
          label: t('status.stopped'),
          variant: 'destructive' as const,
          icon: StopCircle,
        };
      case CampaignStatus.COMPLETED:
        return {
          label: t('status.completed'),
          variant: 'default' as const,
          icon: CheckCircle,
        };
      case CampaignStatus.SENDING_TESTAB:
        return {
          label: t('status.sending_testab'),
          variant: 'default' as const,
          icon: FlaskConical,
        };
      default:
        return {
          label: t('status.draft'),
          variant: 'secondary' as const,
          icon: FileText,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
