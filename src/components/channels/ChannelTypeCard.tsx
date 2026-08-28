import {
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system';
import { ChevronRight, Layers, Link2, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelHealthStatus, ChannelTypeStatus } from '@/utils/channelStatus';
import { CHANNEL_CAPABILITIES, ChannelCapability } from '@/constants/channelCapabilities';
import ChannelIcon from './ChannelIcon';
import ChannelConnectionsPopover from './ChannelConnectionsPopover';
import { Inbox } from '@/types/channels/inbox';

// Status dot color for the summary line, keyed by the type-level health status.
const statusDotClasses: Record<ChannelHealthStatus, string> = {
  active: 'bg-emerald-500',
  attention: 'bg-amber-500',
  error: 'bg-red-500',
  available: 'bg-muted-foreground/40',
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
  /** Open a single connection's settings. */
  onOpenInbox: (inbox: Inbox) => void;
  /** Delete a single connection. Permission gating lives in the handler. */
  onDelete: (inbox: Inbox) => void;
  liveVerifiedIds?: Set<string>;
  liveLoadingIds?: Set<string>;
  liveFailedIds?: Set<string>;
  /** When set, the connect/add action is disabled and this text is shown on hover. */
  disabledReason?: string;
}

export default function ChannelTypeCard({
  typeStatus,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
  disabledReason,
}: ChannelTypeCardProps) {
  const { t } = useLanguage('channels');
  const { type, total, status, attentionCount, errorCount } = typeStatus;
  const needsAttention = attentionCount + errorCount;
  const isConfigured = total > 0;
  const capabilities = CHANNEL_CAPABILITIES[type.type] ?? [];
  // Only WhatsApp surfaces a provider count pill, sourced from the catalog entry.
  const providerCount = type.type === 'whatsapp' ? type.providers?.length ?? 0 : 0;

  // Soft green-tint action: on-brand but calm, so the page's single solid-green
  // CTA ("Novo Canal") stays the primary. Same treatment in both states.
  const actionDisabled = !!disabledReason;
  const actionButton = (
    <Button
      variant="ghost"
      className={cn(
        'w-full',
        actionDisabled
          ? 'cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground'
          : 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary',
      )}
      disabled={actionDisabled}
      onClick={() => !actionDisabled && onAdd(typeStatus)}
    >
      <Plus className="mr-2 h-4 w-4" />
      {isConfigured ? t('overview.actions.addConnection') : t('overview.actions.connect')}
    </Button>
  );

  // When the type has no configured integration (e.g. email with neither Gmail nor
  // Outlook OAuth set up), disable the action and explain why on hover.
  const primaryAction = actionDisabled ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block w-full">{actionButton}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    actionButton
  );

  return (
    <Card className="group relative flex flex-col rounded-[14px] p-0 transition-shadow duration-200 hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-5">
        {/* Header: brand tile + name + subtitle, with a connection count on the far right. */}
        <div className="flex items-start gap-3">
          <ChannelIcon channelType={type.type} size="md" brandTile />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{type.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{type.description}</p>
          </div>
          {isConfigured && (
            <ChannelConnectionsPopover
              typeStatus={typeStatus}
              onAdd={onAdd}
              onOpenInbox={onOpenInbox}
              onDelete={onDelete}
              liveVerifiedIds={liveVerifiedIds}
              liveLoadingIds={liveLoadingIds}
              liveFailedIds={liveFailedIds}
            >
              <button
                type="button"
                aria-label={t('overview.actions.manage')}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span
                  className={cn('h-2 w-2 rounded-full', statusDotClasses[status])}
                  aria-hidden="true"
                />
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tabular-nums">{total}</span>
                {needsAttention > 0 && (
                  <span
                    data-testid="needs-attention-count"
                    title={t('overview.needsAttention', { count: needsAttention })}
                    className={cn(
                      'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                      errorCount > 0
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {needsAttention}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
              </button>
            </ChannelConnectionsPopover>
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

        {/* Primary action. */}
        {primaryAction}
      </CardContent>
    </Card>
  );
}
