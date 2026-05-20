import { useLanguage } from '@/hooks/useLanguage';
import { Edit, Trash2, Megaphone, Eye, Pause, Play, Copy, Square } from 'lucide-react';
import { Campaign, CampaignStatus } from '@/types/campaigns';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import CampaignStatusBadge from './CampaignStatusBadge';
import CampaignTypeBadge from './CampaignTypeBadge';
import CampaignChannelBadge from './CampaignChannelBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es, fr, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@evoapi/design-system';

interface CampaignsTableProps {
  campaigns: Campaign[];
  selectedCampaigns: Campaign[];
  loading?: boolean;
  onSelectionChange: (campaigns: Campaign[]) => void;
  onCampaignClick: (campaign: Campaign) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  onStartCampaign: (campaign: Campaign) => void;
  onPauseCampaign: (campaign: Campaign) => void;
  onStopCampaign: (campaign: Campaign) => void;
  onDuplicateCampaign: (campaign: Campaign) => void;
  onViewStats: (campaign: Campaign) => void;
  onCreateCampaign?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function CampaignsTable({
  campaigns,
  selectedCampaigns,
  loading,
  onSelectionChange,
  onCampaignClick,
  onEditCampaign,
  onDeleteCampaign,
  onStartCampaign,
  onPauseCampaign,
  onStopCampaign,
  onDuplicateCampaign,
  onViewStats,
  onCreateCampaign,
  sortBy,
  sortOrder,
  onSort,
}: CampaignsTableProps) {
  const { t } = useLanguage('campaigns');
  const { i18n } = useTranslation();
  const campaignsList = campaigns || [];

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

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: getDateFnsLocale(),
      });
    } catch {
      return t('messages.invalidDate');
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('pt-BR');
  };

  const formatPercentage = (delivered: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((delivered / total) * 100)}%`;
  };

  const columns: TableColumn<Campaign>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      render: campaign => (
        <div
          className="cursor-pointer hover:opacity-80 py-2"
          onClick={() => onCampaignClick(campaign)}
        >
          <div className="font-medium text-sm truncate mb-1">{campaign.title}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CampaignTypeBadge type={campaign.type} />
            {campaign.channel_type !== undefined && (
              <CampaignChannelBadge channelType={campaign.channel_type} />
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      sortable: true,
      render: campaign => <CampaignStatusBadge status={campaign.status} />,
    },
    {
      key: 'contacts',
      label: t('table.columns.contacts'),
      sortable: true,
      render: campaign => (
        <div className="text-right">
          <div className="font-medium">{formatNumber(campaign.contacts_count)}</div>
          {campaign.stats?.total_sent !== undefined && campaign.stats.total_sent > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatNumber(campaign.stats.total_sent)} {t('table.sent')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'delivery',
      label: t('table.columns.delivery'),
      sortable: false,
      render: campaign => {
        const deliveryRate = campaign.stats?.total_sent
          ? formatPercentage(campaign.stats.total_delivered || 0, campaign.stats.total_sent)
          : '0%';
        return (
          <div className="text-right">
            <div className="font-medium">{deliveryRate}</div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(campaign.stats?.total_delivered || 0)} {t('table.delivered')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'engagement',
      label: t('table.columns.engagement'),
      sortable: false,
      render: campaign => {
        const readRate = campaign.stats?.total_delivered
          ? formatPercentage(campaign.stats.total_read || 0, campaign.stats.total_delivered)
          : '0%';
        return (
          <div className="text-right">
            <div className="font-medium">{readRate}</div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(campaign.stats?.total_read || 0)} {t('table.read')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: t('table.columns.created'),
      sortable: true,
      render: campaign => (
        <div className="text-sm">
          {formatDate(campaign.created_at)}
          {campaign.schedule_to && (
            <div className="text-xs text-muted-foreground">
              {t('table.scheduled')}: {formatDate(campaign.schedule_to)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quick_actions',
      label: t('table.columns.quickActions'),
      sortable: false,
      align: 'center',
      render: campaign => (
        <div className="flex items-center justify-center gap-1">
          {(campaign.status === CampaignStatus.DRAFT ||
            campaign.status === CampaignStatus.SCHEDULED ||
            campaign.status === CampaignStatus.PAUSED ||
            campaign.status === CampaignStatus.STOPPED) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={e => {
                e.stopPropagation();
                onStartCampaign(campaign);
              }}
              title={
                campaign.status === CampaignStatus.PAUSED || campaign.status === CampaignStatus.STOPPED
                  ? t('card.actions.resume')
                  : t('card.actions.start')
              }
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === CampaignStatus.SENDING && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={e => {
                e.stopPropagation();
                onPauseCampaign(campaign);
              }}
              title={t('card.actions.pause')}
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {(campaign.status === CampaignStatus.DRAFT ||
            campaign.status === CampaignStatus.SCHEDULED ||
            campaign.status === CampaignStatus.SENDING ||
            campaign.status === CampaignStatus.PAUSED) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={e => {
                e.stopPropagation();
                onStopCampaign(campaign);
              }}
              title={t('card.actions.cancel')}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const actions: TableAction<Campaign>[] = [
    {
      label: t('card.actions.viewStats'),
      icon: <Eye className="h-4 w-4" />,
      onClick: onViewStats,
    },
    {
      label: t('card.actions.start'),
      icon: <Play className="h-4 w-4" />,
      onClick: onStartCampaign,
      show: campaign =>
        campaign.status === CampaignStatus.DRAFT ||
        campaign.status === CampaignStatus.SCHEDULED ||
        campaign.status === CampaignStatus.PAUSED ||
        campaign.status === CampaignStatus.STOPPED,
    },
    {
      label: t('card.actions.pause'),
      icon: <Pause className="h-4 w-4" />,
      onClick: onPauseCampaign,
      show: campaign => campaign.status === CampaignStatus.SENDING,
    },
    {
      label: t('card.actions.cancel'),
      icon: <Square className="h-4 w-4" />,
      onClick: onStopCampaign,
      variant: 'destructive' as const,
      show: campaign =>
        campaign.status === CampaignStatus.DRAFT ||
        campaign.status === CampaignStatus.SCHEDULED ||
        campaign.status === CampaignStatus.SENDING ||
        campaign.status === CampaignStatus.PAUSED,
    },
    {
      label: t('card.actions.duplicate'),
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicateCampaign,
    },
    {
      label: t('card.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditCampaign,
    },
    {
      label: t('card.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteCampaign,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable<Campaign>
      data={campaignsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedCampaigns}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Megaphone}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      emptyAction={
        onCreateCampaign
          ? {
              label: t('empty.action'),
              onClick: onCreateCampaign,
            }
          : undefined
      }
      getRowKey={campaign => String(campaign.id)}
      className="border-0 shadow-none"
    />
  );
}
