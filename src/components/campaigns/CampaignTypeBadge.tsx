import { Badge } from '@evoapi/design-system';
import { CampaignType } from '@/types/campaigns';
import { Layers, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface CampaignTypeBadgeProps {
  type: CampaignType;
  className?: string;
}

export default function CampaignTypeBadge({ type, className }: CampaignTypeBadgeProps) {
  const { t } = useLanguage('campaigns');

  const getTypeConfig = (type: CampaignType) => {
    switch (type) {
      case CampaignType.SIMPLE:
        return {
          label: t('type.simple'),
          variant: 'outline' as const,
          icon: Layers,
        };
      case CampaignType.RECURRING:
        return {
          label: t('type.recurring'),
          variant: 'outline' as const,
          icon: RefreshCw,
        };
      default:
        return {
          label: t('type.simple'),
          variant: 'outline' as const,
          icon: Layers,
        };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
