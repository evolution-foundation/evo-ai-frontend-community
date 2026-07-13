import {
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system';
import { Layers, Link2, List, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelTypeStatus, formatLastSync } from '@/utils/channelStatus';
import { CHANNEL_CAPABILITIES, ChannelCapability } from '@/constants/channelCapabilities';
import { Inbox, InboxConnectionState } from '@/types/channels/inbox';
import ChannelIcon from './ChannelIcon';

const MAX_INBOX_ROWS = 3;

const stateDotClasses: Record<InboxConnectionState, string> = {
  connected: 'bg-emerald-500',
  pending: 'bg-amber-500',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
  unknown: 'bg-muted-foreground/40',
};

// Capability chips are color-coded by capability (reference design, EVO-2092):
// publishing = green, conversations = blue, campaigns = purple.
const capabilityChipClasses: Record<ChannelCapability, string> = {
  publishing: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  conversations: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  campaigns: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
};

interface ChannelTypeCardProps {
  typeStatus: ChannelTypeStatus;
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  /** Open a single connection's settings (row click). */
  onOpenInbox: (inbox: Inbox) => void;
  /** Delete a single connection (per-row trash). Permission gating lives in the handler. */
  onDelete: (inbox: Inbox) => void;
  /** Inbox ids whose state was confirmed live by the connectivity probe. */
  liveVerifiedIds?: Set<string>;
  /** Inbox ids with a live connectivity probe in flight. */
  liveLoadingIds?: Set<string>;
  /** Inbox ids whose live probe failed (stored state shown instead). */
  liveFailedIds?: Set<string>;
}

export default function ChannelTypeCard({
  typeStatus,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
}: ChannelTypeCardProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const { type, total, inboxStates } = typeStatus;
  const isConfigured = total > 0;
  const capabilities = CHANNEL_CAPABILITIES[type.type] ?? [];
  // Only WhatsApp surfaces a provider count pill, sourced from the catalog entry.
  const providerCount = type.type === 'whatsapp' ? type.providers?.length ?? 0 : 0;
  const isFacebook = type.type === 'facebook';

  const primaryAction = isConfigured ? (
    <Button variant="outline" className="w-full" onClick={() => onAdd(typeStatus)}>
      <Plus className="mr-2 h-4 w-4" />
      {t('overview.actions.addConnection')}
    </Button>
  ) : (
    <Button className="w-full" onClick={() => onAdd(typeStatus)}>
      <Plus className="mr-2 h-4 w-4" />
      {t('overview.actions.connect')}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="group relative flex flex-col rounded-[14px] transition-shadow duration-200 hover:shadow-md">
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          {/* Header: brand tile + name + subtitle, with a connection count on the far right. */}
          <div className="flex items-start gap-3">
            <ChannelIcon channelType={type.type} size="md" brandTile />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-foreground">{type.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{type.description}</p>
            </div>
            {isConfigured && (
              <span
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground"
                aria-label={t('overview.summary.active', { count: total })}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {total}
              </span>
            )}
          </div>

          {/* Capability chips (+ WhatsApp provider count). */}
          {(capabilities.length > 0 || providerCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {capabilities.map(capability => (
                <span
                  key={capability}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    capabilityChipClasses[capability],
                  )}
                >
                  {t(`overview.capabilities.${capability}`)}
                </span>
              ))}
              {providerCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  {t('overview.providersCount', { count: providerCount })}
                </span>
              )}
            </div>
          )}

          {/* Configured connections. */}
          {isConfigured && (
            <ul className="space-y-2">
              {inboxStates.slice(0, MAX_INBOX_ROWS).map(({ inbox, state, unmonitored }) => {
                const id = String(inbox.id);
                const isLiveLoading = liveLoadingIds?.has(id) ?? false;
                const isLiveVerified = liveVerifiedIds?.has(id) ?? false;
                const liveFailed = liveFailedIds?.has(id) ?? false;
                const lastSync = formatLastSync(inbox.last_sync, currentLanguage);
                const stateLabel = unmonitored
                  ? t('overview.inboxState.unmonitored')
                  : t(`overview.inboxState.${state}`);
                const providerLabel = (
                  inbox.provider ||
                  inbox.channel_type?.replace('Channel::', '') ||
                  ''
                ).replace(/_/g, ' ');

                return (
                  <li
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenInbox(inbox)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenInbox(inbox);
                      }
                    }}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 cursor-pointer transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    title={liveFailed ? t('overview.liveCheckFailed') : undefined}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        stateDotClasses[state],
                        isLiveLoading && 'animate-pulse',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {inbox.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {providerLabel && <span className="truncate">{providerLabel}</span>}
                        {providerLabel && (
                          <span className="shrink-0" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span className="shrink-0">
                          {isLiveLoading ? (
                            t('overview.inboxState.checking')
                          ) : isLiveVerified ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {t('overview.statusMeta.live')}
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {stateLabel} · {t('overview.statusMeta.stored')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                {t('overview.statusMeta.storedTooltip')}
                                {lastSync
                                  ? ` · ${t('overview.statusMeta.lastSync', { time: lastSync })}`
                                  : ''}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={t('overview.actions.manage')}
                      onClick={event => {
                        event.stopPropagation();
                        onOpenInbox(inbox);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('overview.actions.deleteConnection')}
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(inbox);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:text-red-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
              {total > MAX_INBOX_ROWS && (
                <li className="px-1 text-xs text-muted-foreground">
                  {t('overview.moreInboxes', { count: total - MAX_INBOX_ROWS })}
                </li>
              )}
            </ul>
          )}

          {/* Primary action, pinned to the bottom so single-button cards align. */}
          <div className="mt-auto flex flex-col gap-2 pt-1">
            {primaryAction}
            {isFacebook && (
              <button
                type="button"
                className="mx-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('overview.actions.viewAds')}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
