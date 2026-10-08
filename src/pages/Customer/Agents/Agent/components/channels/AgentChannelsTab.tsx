import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Skeleton } from '@evoapi/design-system';
import { Link2, Radio } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import AgentBotsService from '@/services/channels/agentBotsService';
import InboxesService from '@/services/channels/inboxesService';
import { labelsService } from '@/services/contacts/labelsService';
import { AgentBot } from '@/components/channels/settings/helpers/agentBotHelpers';
import { AgentBotInboxLabelOption } from '@/components/channels/settings/AgentBotInboxSettingsFields';
import type { Agent } from '@/types/agents';
import type { Label as LabelType } from '@/types/settings';
import type {
  AgentBotInboxBinding,
  AgentBotInboxConfiguration,
  AgentBotInboxStatus,
  Inbox,
} from '@/types/channels/inbox';
import AgentChannelCard from './AgentChannelCard';
import LinkChannelModal from './LinkChannelModal';

/** How long a just-linked card stays highlighted. */
export const LINK_HIGHLIGHT_MS = 3000;

interface AgentChannelsTabProps {
  agent: Agent;
  onOpenAgentConfiguration?: () => void;
}

/** The agent's channels: where an agent ↔ channel binding is created, edited and unlinked (CRM-41). */
export default function AgentChannelsTab({ agent, onOpenAgentConfiguration }: AgentChannelsTabProps) {
  const { t } = useLanguage('aiAgents');
  const navigate = useNavigate();
  const { can, isReady: permissionsReady } = usePermissions();
  // Every write here goes through the inbox routes, gated by inboxes.update.
  const canEdit = permissionsReady && can('inboxes', 'update');
  const botId = agent.evolution_bot_id || null;

  const [bindings, setBindings] = useState<AgentBotInboxBinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentBots, setAgentBots] = useState<AgentBot[]>([]);
  const [labels, setLabels] = useState<AgentBotInboxLabelOption[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyInboxIds, setBusyInboxIds] = useState<Set<string>>(() => new Set());
  const [highlightedInboxId, setHighlightedInboxId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountInboxes, setAccountInboxes] = useState<Inbox[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(false);

  const loadBindings = useCallback(async () => {
    if (!botId) return;
    setBindings(await AgentBotsService.listBotInboxes(botId));
  }, [botId]);

  useEffect(() => {
    if (!botId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);
    Promise.all([
      AgentBotsService.listBotInboxes(botId),
      AgentBotsService.getAll({ per_page: 200 }),
      labelsService.getLabels({ per_page: 200 }).catch(() => ({ data: [] })),
    ])
      .then(([botBindings, bots, labelsResponse]) => {
        if (cancelled) return;
        setBindings(botBindings);
        setAgentBots(bots);
        setLabels(
          (labelsResponse?.data || []).map((label: LabelType) => ({
            id: label.id,
            title: label.title,
            color: label.color || '#1f93ff',
          })),
        );
      })
      .catch(error => {
        console.error('Error loading agent channels:', error);
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const loadAccountInboxes = async () => {
    setIsLoadingInboxes(true);
    try {
      const response = await InboxesService.list({ per_page: 200 });
      setAccountInboxes(response.data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error(t('edit.channels.errors.loadChannels'));
      setAccountInboxes([]);
    } finally {
      setIsLoadingInboxes(false);
    }
  };

  const openLinkModal = () => {
    setIsModalOpen(true);
    loadAccountInboxes();
  };

  const boundInboxIds = useMemo(() => new Set(bindings.map(b => b.inbox_id)), [bindings]);
  const linkableInboxes = useMemo(
    () => accountInboxes.filter(inbox => !boundInboxIds.has(inbox.id)),
    [accountInboxes, boundInboxIds],
  );

  const handleLink = async (inbox: Inbox) => {
    if (!botId) return;
    try {
      // No configuration: the binding starts on the backend defaults (pending only).
      await AgentBotsService.linkInboxBot(inbox.id, botId, inbox.agent_bot?.id ?? null);
    } catch (error) {
      console.error('Error linking channel:', error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // The channel changed hands after it was checked: show the list as it is now.
        toast.error(t('edit.channels.errors.channelChanged', { channel: inbox.name }));
        loadAccountInboxes();
        return;
      }
      toast.error(t('edit.channels.errors.link'));
      return;
    }

    setIsModalOpen(false);
    toast.success(t('edit.channels.success.linked', { channel: inbox.name }));
    clearTimeout(highlightTimer.current);
    setHighlightedInboxId(inbox.id);
    highlightTimer.current = setTimeout(() => setHighlightedInboxId(null), LINK_HIGHLIGHT_MS);
    loadBindings().catch(error => {
      console.error('Error reloading the agent channels:', error);
      toast.error(t('edit.channels.errors.load'));
    });
  };

  const setBusy = (inboxId: string, busy: boolean) =>
    setBusyInboxIds(prev => {
      const next = new Set(prev);
      if (busy) next.add(inboxId);
      else next.delete(inboxId);
      return next;
    });

  // 409: the channel moved to another agent since this list was loaded.
  const handleWriteError = (error: unknown, fallbackKey: string) => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      toast.error(t('edit.channels.errors.moved'));
      loadBindings().catch(() => undefined);
      return;
    }
    toast.error(t(fallbackKey));
  };

  const changeStatus = async (binding: AgentBotInboxBinding, status: AgentBotInboxStatus) => {
    if (!botId) return;
    setBusy(binding.inbox_id, true);
    try {
      const updated = await AgentBotsService.updateInboxBinding(binding.inbox_id, botId, { status });
      setBindings(prev =>
        prev.map(b => (b.inbox_id === binding.inbox_id ? { ...b, status: updated.status } : b)),
      );
      toast.success(
        status === 'inactive'
          ? t('edit.channels.success.unlinked', { channel: binding.inbox.name })
          : t('edit.channels.success.reactivated', { channel: binding.inbox.name }),
      );
    } catch (error) {
      console.error('Error changing channel status:', error);
      handleWriteError(error, 'edit.channels.errors.status');
    } finally {
      setBusy(binding.inbox_id, false);
    }
  };

  const saveConfiguration = async (
    binding: AgentBotInboxBinding,
    configuration: AgentBotInboxConfiguration,
  ) => {
    if (!botId) return;
    setBusy(binding.inbox_id, true);
    try {
      const updated = await AgentBotsService.updateInboxBinding(binding.inbox_id, botId, {
        configuration,
      });
      setBindings(prev =>
        prev.map(b =>
          b.inbox_id === binding.inbox_id ? { ...b, configuration: updated.configuration } : b,
        ),
      );
      toast.success(t('edit.channels.success.saved'));
    } catch (error) {
      console.error('Error saving channel settings:', error);
      handleWriteError(error, 'edit.channels.errors.save');
    } finally {
      setBusy(binding.inbox_id, false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">{t('edit.channels.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('edit.channels.subtitle')}</p>
        </div>
        {botId && !loadFailed && canEdit && (
          <Button type="button" onClick={openLinkModal}>
            <Link2 className="mr-2 h-4 w-4" />
            {t('edit.channels.actions.link')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : loadFailed ? (
        <p role="alert" className="py-12 text-center text-sm text-destructive">
          {t('edit.channels.errors.load')}
        </p>
      ) : !botId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t('edit.channels.noBot')}
        </p>
      ) : bindings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Radio className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">{t('edit.channels.empty.title')}</p>
          <p className="text-sm text-muted-foreground">{t('edit.channels.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bindings.map(binding => (
            <AgentChannelCard
              key={binding.id}
              binding={binding}
              agentBots={agentBots}
              labels={labels}
              agentConfig={agent.config}
              highlighted={highlightedInboxId === binding.inbox_id}
              busy={busyInboxIds.has(binding.inbox_id)}
              canEdit={canEdit}
              onUnlink={() => changeStatus(binding, 'inactive')}
              onReactivate={() => changeStatus(binding, 'active')}
              onSaveConfiguration={configuration => saveConfiguration(binding, configuration)}
              onOpenAgentConfiguration={onOpenAgentConfiguration}
            />
          ))}
        </div>
      )}

      <LinkChannelModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        inboxes={linkableInboxes}
        isLoading={isLoadingInboxes}
        onLink={handleLink}
        onConnectNewChannel={() => navigate('/channels/new')}
      />
    </div>
  );
}
