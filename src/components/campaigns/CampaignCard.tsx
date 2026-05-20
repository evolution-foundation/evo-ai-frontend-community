import { useLanguage } from '@/hooks/useLanguage';
import { Button, Card, CardContent } from '@evoapi/design-system';
import { Edit, Trash2, Eye, Play, Pause, Copy, BarChart3, Calendar, Square } from 'lucide-react';
import { Campaign, CampaignStatus } from '@/types/campaigns';
import CampaignStatusBadge from './CampaignStatusBadge';
import CampaignTypeBadge from './CampaignTypeBadge';
import CampaignChannelBadge from './CampaignChannelBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es, fr, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

type CampaignCardProps = {
  campaign: Campaign;
  onViewDetails?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onStop?: (campaign: Campaign) => void;
  onDuplicate?: (campaign: Campaign) => void;
  onViewStats?: (campaign: Campaign) => void;
};

export default function CampaignCard({
  campaign,
  onViewDetails,
  onEdit,
  onDelete,
  onPause,
  onResume,
  onStop,
  onDuplicate,
  onViewStats,
}: CampaignCardProps) {
  const { t } = useLanguage('campaigns');
  const { i18n } = useTranslation();

  const getDateFnsLocale = () => {
    switch (i18n.language) {
      case 'pt-BR':
      case 'pt':
        return ptBR;
      case 'es':
        return es;
      case 'fr':
        return fr;
      case 'it':
        return it;
      default:
        return enUS;
    }
  };

  const canPause = campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.SCHEDULED;
  const canResume = campaign.status === CampaignStatus.PAUSED;
  const canStop =
    campaign.status === CampaignStatus.SENDING ||
    campaign.status === CampaignStatus.SCHEDULED ||
    campaign.status === CampaignStatus.PAUSED;

  // Helper function to safely format date distance
  const formatDateDistance = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: getDateFnsLocale()
      });
    } catch {
      return '-';
    }
  };

  return (
    <Card className="group relative bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="p-0">
        <div
          className="flex items-start justify-between gap-3 p-4 border-b border-sidebar-border cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onViewDetails?.(campaign)}
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-sidebar-foreground">
              {campaign.title}
            </h3>
            {campaign.description && (
              <p className="text-xs text-sidebar-foreground/60 truncate mt-1">{campaign.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <CampaignTypeBadge type={campaign.type} />
              <CampaignChannelBadge channelType={campaign.channel_type} />
            </div>
          </div>
          <div>
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>

        <div className="px-4 py-3 text-xs text-sidebar-foreground/70 space-y-2">
          <div className="flex items-center justify-between">
            <span>{t('card.contacts')}</span>
            <span className="font-mono">{campaign.contacts_count?.toLocaleString() || 0}</span>
          </div>

          {campaign.schedule_to && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('card.scheduledFor')}
              </span>
              <span className="font-mono text-xs">
                {formatDateDistance((campaign as any).schedule_to || (campaign as any).scheduleTo)}
              </span>
            </div>
          )}

          {campaign.stats && campaign.stats.total_sent > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span>{t('card.sent')}</span>
                <span className="font-mono">{campaign.stats.total_sent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('card.deliveryRate')}</span>
                <span className="font-mono">{campaign.stats.delivery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('card.readRate')}</span>
                <span className="font-mono">{campaign.stats.read_rate.toFixed(1)}%</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-sidebar-border/50">
            <span>{t('card.created')}</span>
            <span className="text-xs">
              {formatDateDistance((campaign as any).created_at || (campaign as any).createdAt)}
            </span>
          </div>
        </div>

        <div className="flex border-t border-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {canPause && (
            <>
              <Button
                variant="ghost"
                className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={e => {
                  e.stopPropagation();
                  onPause?.(campaign);
                }}
                title={t('card.actions.pause')}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}

          {canResume && (
            <>
              <Button
                variant="ghost"
                className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={e => {
                  e.stopPropagation();
                  onResume?.(campaign);
                }}
                title={t('card.actions.resume')}
              >
                <Play className="h-4 w-4" />
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}
          {canStop && (
            <>
              <Button
                variant="ghost"
                className="rounded-none h-12 px-3 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={e => {
                  e.stopPropagation();
                  onStop?.(campaign);
                }}
                title={t('card.actions.stop')}
              >
                <Square className="h-4 w-4" />
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}

          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onViewDetails?.(campaign);
            }}
            title={t('card.actions.viewDetails')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <div className="w-px bg-sidebar-border" />

          {campaign.stats && campaign.stats.total_sent > 0 && (
            <>
              <Button
                variant="ghost"
                className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={e => {
                  e.stopPropagation();
                  onViewStats?.(campaign);
                }}
                title={t('card.actions.viewStats')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}

          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onDuplicate?.(campaign);
            }}
            title={t('card.actions.duplicate')}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <div className="w-px bg-sidebar-border" />

          {campaign.status === CampaignStatus.DRAFT && (
            <>
              <Button
                variant="ghost"
                className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={e => {
                  e.stopPropagation();
                  onEdit?.(campaign);
                }}
                title={t('card.actions.edit')}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}

          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={e => {
              e.stopPropagation();
              onDelete?.(campaign);
            }}
            title={t('card.actions.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
