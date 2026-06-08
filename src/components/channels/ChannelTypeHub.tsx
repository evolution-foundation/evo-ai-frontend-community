import { useMemo } from 'react';
import { Skeleton } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { Inbox } from '@/types/channels/inbox';
import { getChannelTypes } from '@/constants/channelTypes';
import { buildChannelTypeStatuses, ChannelTypeStatus } from '@/utils/channelStatus';
import ChannelTypeCard from './ChannelTypeCard';

interface ChannelTypeHubProps {
  inboxes: Inbox[];
  isLoading: boolean;
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  onManage: (typeStatus: ChannelTypeStatus) => void;
}

export default function ChannelTypeHub({ inboxes, isLoading, onAdd, onManage }: ChannelTypeHubProps) {
  const { t, currentLanguage } = useLanguage('channels');

  // getChannelTypes() reads translated labels, so recompute when language changes.
  const typeStatuses = useMemo(
    () => buildChannelTypeStatuses(getChannelTypes(), inboxes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inboxes, currentLanguage],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-sidebar-foreground">{t('overview.title')}</h2>
        <p className="text-sm text-sidebar-foreground/60">{t('overview.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {typeStatuses.map(typeStatus => (
          <ChannelTypeCard
            key={typeStatus.type.id}
            typeStatus={typeStatus}
            onAdd={onAdd}
            onManage={onManage}
          />
        ))}
      </div>
    </div>
  );
}
