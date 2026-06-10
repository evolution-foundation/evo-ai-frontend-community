import {
  Button,
  Card,
  CardContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import { HelpCircle, Plus, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelTypeStatus, formatLastSync } from '@/utils/channelStatus';
import { InboxConnectionState } from '@/types/channels/inbox';
import ChannelIcon from './ChannelIcon';
import ChannelStatusBadge from './ChannelStatusBadge';

const MAX_INBOX_ROWS = 3;

const stateDotClasses: Record<InboxConnectionState, string> = {
  connected: 'bg-emerald-500',
  pending: 'bg-amber-500',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
  unknown: 'bg-sidebar-foreground/30',
};

interface ChannelTypeCardProps {
  typeStatus: ChannelTypeStatus;
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  onManage: (typeStatus: ChannelTypeStatus) => void;
  /** Inbox ids with a live connectivity probe in flight. */
  liveLoadingIds?: Set<string>;
  /** Inbox ids whose live probe failed (stored state shown instead). */
  liveFailedIds?: Set<string>;
}

export default function ChannelTypeCard({
  typeStatus,
  onAdd,
  onManage,
  liveLoadingIds,
  liveFailedIds,
}: ChannelTypeCardProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const { type, total, activeCount, attentionCount, errorCount, status, inboxStates } = typeStatus;
  const isConfigured = total > 0;

  const summary = isConfigured
    ? [
        activeCount > 0 ? t('overview.summary.active', { count: activeCount }) : null,
        attentionCount > 0 ? t('overview.summary.attention', { count: attentionCount }) : null,
        errorCount > 0 ? t('overview.summary.error', { count: errorCount }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('overview.summary.notConfigured');

  // Inline contextual help text per channel type, falling back to the catalog
  // description when no dedicated help copy exists for the type yet.
  const helpText = t(`overview.help.${type.id}`, { defaultValue: type.description });

  return (
    <Card className="group relative flex flex-col bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="flex flex-1 flex-col p-4 gap-3">
        <div className="flex items-start gap-3">
          <ChannelIcon channelType={type.type} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base truncate text-sidebar-foreground">
                {type.name}
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('overview.actions.howToConfigure')}
                    className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm">
                  <p className="font-medium mb-1 text-sidebar-foreground">
                    {t('overview.actions.howToConfigure')}
                  </p>
                  <p className="text-sidebar-foreground/70">{helpText}</p>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-sidebar-foreground/60 line-clamp-2">{type.description}</p>
          </div>
        </div>

        {isConfigured && (
          <ul className="space-y-1">
            {inboxStates.slice(0, MAX_INBOX_ROWS).map(({ inbox, state, unmonitored }) => {
              const id = String(inbox.id);
              const isLiveLoading = liveLoadingIds?.has(id) ?? false;
              const liveFailed = liveFailedIds?.has(id) ?? false;
              const lastSync = formatLastSync(inbox.last_sync, currentLanguage);
              const stateLabel = unmonitored
                ? t('overview.inboxState.unmonitored')
                : t(`overview.inboxState.${state}`);

              return (
                <li
                  key={id}
                  className="flex items-center gap-2 text-xs text-sidebar-foreground/70"
                  title={liveFailed ? t('overview.liveCheckFailed') : undefined}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      stateDotClasses[state],
                      isLiveLoading && 'animate-pulse',
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate flex-1">{inbox.name}</span>
                  <span className="shrink-0 text-sidebar-foreground/50">
                    {isLiveLoading ? t('overview.inboxState.checking') : stateLabel}
                    {lastSync && !isLiveLoading ? ` · ${lastSync}` : ''}
                  </span>
                </li>
              );
            })}
            {total > MAX_INBOX_ROWS && (
              <li className="text-xs text-sidebar-foreground/50">
                {t('overview.moreInboxes', { count: total - MAX_INBOX_ROWS })}
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <ChannelStatusBadge status={status} />
          {isConfigured && (
            <span className="text-xs text-sidebar-foreground/60 truncate ml-2">{summary}</span>
          )}
        </div>
      </CardContent>

      <div className="flex border-t border-sidebar-border">
        {isConfigured ? (
          <Button
            variant="ghost"
            className="flex-1 rounded-none h-11 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={() => onManage(typeStatus)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('overview.actions.manage')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="flex-1 rounded-none h-11 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={() => onAdd(typeStatus)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('overview.actions.add')}
          </Button>
        )}
      </div>
    </Card>
  );
}
