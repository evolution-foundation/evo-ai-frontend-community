import { useEffect, useState } from 'react';
import { Button, Card, CardContent } from '@evoapi/design-system';
import { ChevronDown, ChevronUp, Link2Off, RotateCcw, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelIcon } from '@/components/channels';
import AgentBotInboxSettingsFields, {
  AgentBotInboxLabelOption,
} from '@/components/channels/settings/AgentBotInboxSettingsFields';
import { AgentBot } from '@/components/channels/settings/helpers/agentBotHelpers';
import type { AgentBotInboxBinding, AgentBotInboxConfiguration } from '@/types/channels/inbox';
import type { AgentConfig } from '@/types/agents';
import { getInboxIdentifier } from './channelIdentifier';

interface AgentChannelCardProps {
  binding: AgentBotInboxBinding;
  agentBots: AgentBot[];
  labels: AgentBotInboxLabelOption[];
  agentConfig?: AgentConfig;
  highlighted: boolean;
  busy: boolean;
  canEdit: boolean;
  onUnlink: () => void;
  onReactivate: () => void;
  onSaveConfiguration: (configuration: AgentBotInboxConfiguration) => Promise<void>;
  onOpenAgentConfiguration?: () => void;
}

export default function AgentChannelCard({
  binding,
  agentBots,
  labels,
  agentConfig,
  highlighted,
  busy,
  canEdit,
  onUnlink,
  onReactivate,
  onSaveConfiguration,
  onOpenAgentConfiguration,
}: AgentChannelCardProps) {
  const { t } = useLanguage('aiAgents');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState<AgentBotInboxConfiguration>(binding.configuration);
  // Bumped when the saved configuration comes back, so the fields' own text
  // state (word list, post mode) restarts from what the server stored.
  const [draftVersion, setDraftVersion] = useState(0);
  // Keyed by content, not identity: reloading the list hands every card a new
  // object, and that must not wipe an edit in progress on an unchanged binding.
  const savedConfiguration = JSON.stringify(binding.configuration);

  useEffect(() => {
    setDraft(JSON.parse(savedConfiguration));
    setDraftVersion(version => version + 1);
  }, [savedConfiguration]);

  const { inbox } = binding;
  const isActive = binding.status === 'active';
  const identifier = getInboxIdentifier(inbox);

  const handleSave = () => onSaveConfiguration(draft);

  return (
    <Card
      data-testid={`agent-channel-card-${inbox.id}`}
      data-highlighted={highlighted || undefined}
      className={cn(
        'transition-colors duration-700',
        highlighted && 'border-primary bg-primary/5 ring-2 ring-primary/40',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <ChannelIcon channelType={inbox.channel_type} provider={inbox.provider} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">{inbox.name}</span>
              <span
                className={cn(
                  'rounded-[7px] px-2 py-0.5 text-[11px] font-bold',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {isActive ? t('edit.channels.status.active') : t('edit.channels.status.inactive')}
              </span>
            </div>
            {identifier && <p className="truncate text-xs text-muted-foreground">{identifier}</p>}
          </div>
          {!canEdit ? null : isActive ? (
            <Button type="button" variant="outline" size="sm" onClick={onUnlink} disabled={busy}>
              <Link2Off className="mr-2 h-4 w-4" />
              {t('edit.channels.actions.unlink')}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onReactivate} disabled={busy}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('edit.channels.actions.reactivate')}
            </Button>
          )}
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showAdvanced}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings className="h-4 w-4 text-muted-foreground" />
              {t('edit.channels.advanced.title')}
            </span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6">
              <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
                <AgentBotInboxSettingsFields
                  key={draftVersion}
                  inboxId={inbox.id}
                  idPrefix={`binding-${binding.id}`}
                  agentBotId={binding.agent_bot_id}
                  isFacebookInbox={inbox.channel_type === 'Channel::FacebookPage'}
                  agentBots={agentBots}
                  labels={labels}
                  value={draft}
                  onChange={setDraft}
                />
              </fieldset>

              <AgentLevelSettings config={agentConfig} onOpen={onOpenAgentConfiguration} />

              {canEdit && (
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={handleSave} disabled={busy}>
                    {t('edit.channels.advanced.save')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Debounce and segmentation belong to the agent, not to the binding: one value
 * serves every channel, edited in the Configuration tab.
 */
function AgentLevelSettings({ config, onOpen }: { config?: AgentConfig; onOpen?: () => void }) {
  const { t } = useLanguage('aiAgents');
  const segmentation = config?.enable_text_segmentation;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">{t('edit.channels.agentLevel.title')}</p>
      <p className="text-xs text-muted-foreground">{t('edit.channels.agentLevel.description')}</p>
      <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        <div className="flex gap-1">
          <dt className="text-muted-foreground">{t('edit.channels.agentLevel.debounce')}:</dt>
          <dd className="text-foreground">
            {t('edit.channels.agentLevel.seconds', { value: config?.message_wait_time ?? 0 })}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted-foreground">{t('edit.channels.agentLevel.segmentation')}:</dt>
          <dd className="text-foreground">
            {segmentation
              ? t('edit.channels.agentLevel.segmentationOn', {
                  max: config?.max_characters_per_segment ?? 0,
                })
              : t('edit.channels.agentLevel.segmentationOff')}
          </dd>
        </div>
      </dl>
      {onOpen && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onOpen}>
          {t('edit.channels.agentLevel.open')}
        </Button>
      )}
    </div>
  );
}
