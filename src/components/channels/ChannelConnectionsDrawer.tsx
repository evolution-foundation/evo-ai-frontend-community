import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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

interface ChannelConnectionsDrawerProps {
  /** The channel type whose connections are shown. `null` keeps the drawer empty/closed. */
  typeStatus: ChannelTypeStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Start the add-connection flow for this type. */
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

export default function ChannelConnectionsDrawer({
  typeStatus,
  open,
  onOpenChange,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
}: ChannelConnectionsDrawerProps) {
  const { t, currentLanguage } = useLanguage('channels');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {typeStatus && (
          <TooltipProvider delayDuration={200}>
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle>{t('overview.drawer.title')}</SheetTitle>
              <SheetDescription>{typeStatus.type.name}</SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {typeStatus.inboxStates.map(({ inbox, state, unmonitored }) => {
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
              </ul>
            </div>

            <SheetFooter className="border-t border-border p-4">
              <Button
                variant="ghost"
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                onClick={() => {
                  onAdd(typeStatus);
                  onOpenChange(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('overview.actions.addConnection')}
              </Button>
            </SheetFooter>
          </TooltipProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
