import { Button, Card, CardContent } from '@evoapi/design-system';
import { ChevronRight, Layers, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelHealthStatus, ChannelTypeStatus } from '@/utils/channelStatus';
import { CHANNEL_CAPABILITIES, ChannelCapability } from '@/constants/channelCapabilities';
import ChannelIcon from './ChannelIcon';

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
  /** Open the connections drawer for this channel type (summary-line click). */
  onManage: (typeStatus: ChannelTypeStatus) => void;
}

export default function ChannelTypeCard({ typeStatus, onAdd, onManage }: ChannelTypeCardProps) {
  const { t } = useLanguage('channels');
  const { type, total, activeCount, attentionCount, errorCount, status } = typeStatus;
  const isConfigured = total > 0;
  const capabilities = CHANNEL_CAPABILITIES[type.type] ?? [];
  // Only WhatsApp surfaces a provider count pill, sourced from the catalog entry.
  const providerCount = type.type === 'whatsapp' ? type.providers?.length ?? 0 : 0;

  // One-line summary of the connections: everything healthy reads as "N connected";
  // otherwise lead with the total and surface the most severe problem count.
  const summaryText =
    status === 'active'
      ? t('overview.summary.connected', { count: total })
      : `${t('overview.summary.total', { count: total })} · ${
          errorCount > 0
            ? t('overview.summary.error', { count: errorCount })
            : attentionCount > 0
              ? t('overview.summary.attention', { count: attentionCount })
              : t('overview.summary.active', { count: activeCount })
        }`;

  // Soft green-tint action: on-brand but calm, so the page's single solid-green
  // CTA ("Novo Canal") stays the primary. Same treatment in both states.
  const primaryAction = (
    <Button
      variant="ghost"
      className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
      onClick={() => onAdd(typeStatus)}
    >
      <Plus className="mr-2 h-4 w-4" />
      {isConfigured ? t('overview.actions.addConnection') : t('overview.actions.connect')}
    </Button>
  );

  return (
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

        {/* Connections summary — a single fixed-height line that opens the drawer. */}
        {isConfigured && (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('overview.actions.manage')}
            onClick={() => onManage(typeStatus)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onManage(typeStatus);
              }
            }}
            className="-mx-1 flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClasses[status])}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {summaryText}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
          </div>
        )}

        {/* Primary action, pinned to the bottom so single-button cards align. */}
        <div className="mt-auto pt-1">{primaryAction}</div>
      </CardContent>
    </Card>
  );
}
