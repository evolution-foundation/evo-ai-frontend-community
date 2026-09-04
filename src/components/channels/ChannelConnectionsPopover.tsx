import { useState } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system';
import { Link2, List, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelTypeStatus, formatLastSync } from '@/utils/channelStatus';
import { Inbox, InboxConnectionState } from '@/types/channels/inbox';

const stateDotClasses: Record<InboxConnectionState, string> = {
  connected: 'bg-emerald-500',
  pending: 'bg-amber-500',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
  unknown: 'bg-muted-foreground/40',
};

interface ChannelConnectionsPopoverProps {
  /** The channel type whose connections are listed. */
  typeStatus: ChannelTypeStatus;
  /** Start the add-connection flow for this type. */
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  /** Open a single connection's settings (row click). */
  onOpenInbox: (inbox: Inbox) => void;
  /** Delete a single connection (per-row trash). Permission gating lives in the handler. */
  onDelete: (inbox: Inbox) => void;
  liveVerifiedIds?: Set<string>;
  liveLoadingIds?: Set<string>;
  liveFailedIds?: Set<string>;
  /** The trigger — the card's header connection group. */
  children: React.ReactNode;
}

// A lightweight popover, anchored to the card's connection group, that lists the
// channel type's connections with quick actions (open settings / delete / add).
// Chosen over a drawer/modal: it stays tied to the card and doesn't take the whole
// screen for what is a short list whose real actions jump elsewhere anyway.
export default function ChannelConnectionsPopover({
  typeStatus,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
  children,
}: ChannelConnectionsPopoverProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <TooltipProvider delayDuration={200}>
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{typeStatus.type.name}</p>
            <p className="text-xs text-muted-foreground">{t('overview.drawer.title')}</p>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            <ul className="space-y-1.5">
              {typeStatus.inboxStates.map(({ inbox, state, unmonitored }) => {
                const id = String(inbox.id);
                const isLiveLoading = liveLoadingIds?.has(id) ?? false;
                const isLiveVerified = liveVerifiedIds?.has(id) ?? false;
                const liveFailed = liveFailedIds?.has(id) ?? false;
                const lastSync = formatLastSync(inbox.last_sync, currentLanguage);
                // A probe-confirmed inbox IS monitored right now, so the stored
                // "no health source" flag must not label it — that would read as
                // "Not monitored · Live" on the same line.
                const stateLabel =
                  unmonitored && !isLiveVerified
                    ? t('overview.inboxState.unmonitored')
                    : t(`overview.inboxState.${state}`);
                const providerLabel = (
                  inbox.provider ||
                  inbox.channel_type?.replace('Channel::', '') ||
                  ''
                ).replace(/_/g, ' ');

                const openInbox = () => {
                  setOpen(false);
                  onOpenInbox(inbox);
                };

                return (
                  <li
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={openInbox}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openInbox();
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
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <Link2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        {/* One wrapping text flow, not three flex items. This column is
                            ~190px wide, and in most locales the state label alone is wider
                            than that — as three items the label could not shrink and ran
                            under the row's action buttons, taking the provider name with it. */}
                        <span className="min-w-0 break-words">
                          {providerLabel && `${providerLabel} · `}
                          {stateLabel} ·{' '}
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
                                  {t('overview.statusMeta.stored')}
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
                        openInbox();
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
                        setOpen(false);
                        onDelete(inbox);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:text-red-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              onClick={() => {
                setOpen(false);
                onAdd(typeStatus);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('overview.actions.addConnection')}
            </Button>
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
