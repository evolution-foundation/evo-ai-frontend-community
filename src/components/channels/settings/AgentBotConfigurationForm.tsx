import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardContent, Skeleton } from '@evoapi/design-system';
import { Bot, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import InboxesService from '@/services/channels/inboxesService';
import { getAccessibleAgents } from '@/services/agents';
import type { InboxAgentBotSummary } from '@/types/channels/inbox';
import type { Agent } from '@/types/agents';

interface AgentBotConfigurationFormProps {
  inboxId: string;
}

/**
 * The channel's agent, read-only (CRM-41). The binding is created, edited and
 * unlinked from the agent's Channels tab; this tab only says who answers and
 * leads there.
 */
export default function AgentBotConfigurationForm({ inboxId }: AgentBotConfigurationFormProps) {
  const { t } = useLanguage('channels');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [agentBot, setAgentBot] = useState<InboxAgentBotSummary | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await InboxesService.getById(inboxId);
        const bot = response.data?.agent_bot ?? null;
        if (cancelled) return;
        setAgentBot(bot);

        if (bot) {
          // The core agent mirrors its bot's name; the id match is what counts.
          const agents = await getAccessibleAgents(1, 100, { search: bot.name });
          const owner = (agents?.data || []).find(
            (agent: Agent) => agent.evolution_bot_id === bot.id,
          );
          if (!cancelled) setAgentId(owner?.id ?? null);
        }
      } catch (error) {
        console.error('Error loading the channel agent:', error);
        if (!cancelled) toast.error(t('settings.agentBotConfiguration.errors.loadError'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId]);

  const isActive = agentBot?.status === 'active';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {t('settings.agentBotConfiguration.title')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.agentBotConfiguration.readOnly.managedIn')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : agentBot ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="min-w-0">
                  <h5 className="font-medium text-foreground truncate">{agentBot.name}</h5>
                  <p className="text-sm text-muted-foreground">
                    {isActive
                      ? t('settings.agentBotConfiguration.readOnly.servedBy', { name: agentBot.name })
                      : t('settings.agentBotConfiguration.readOnly.inactiveNote', {
                          name: agentBot.name,
                        })}
                  </p>
                </div>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive
                    ? t('settings.agentBotConfiguration.status.active')
                    : t('settings.agentBotConfiguration.status.inactive')}
                </Badge>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(agentId ? `/agents/${agentId}/edit?tab=channels` : '/agents/list')
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {agentId
                  ? t('settings.agentBotConfiguration.readOnly.openAgent')
                  : t('settings.agentBotConfiguration.readOnly.openAgents')}
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4 text-center py-6">
              <p className="text-sm text-muted-foreground">
                {t('settings.agentBotConfiguration.readOnly.noAgent')}
              </p>
              <Button type="button" onClick={() => navigate('/agents/list')}>
                <Link2 className="w-4 h-4 mr-2" />
                {t('settings.agentBotConfiguration.readOnly.linkAgent')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
