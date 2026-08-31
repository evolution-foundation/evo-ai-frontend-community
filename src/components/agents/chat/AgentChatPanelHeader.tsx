import { Button, Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAgentChat } from '@/contexts/agents/AgentChatContext';
import { formatDateTime } from '@/utils/time/formatDateTime';
import { Agent } from '@/types/agents';

interface AgentChatPanelHeaderProps {
  agent: Agent;
  onClose: () => void;
}

/** Must render inside AgentChatProvider: the sessions come from it. */
export function AgentChatPanelHeader({ agent, onClose }: AgentChatPanelHeaderProps) {
  const { t } = useLanguage('aiAgents');
  const { sessions, selectedSessionId, selectSession, createNewSession, deleteSession } =
    useAgentChat();

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime(),
  );

  const title = selectedSessionId
    ? `${t('chat.session') || 'Sessão'} ${selectedSessionId.substring(0, 8)}`
    : t('chat.newConversation') || 'Nova Conversa';

  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
        <MessageSquare className="h-[18px] w-[18px] text-primary" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{agent.name}</p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              aria-label={t('chat.conversations') || 'Conversas'}
            >
              <MessageSquare className="h-4 w-4" />
              {/* Neutral counter, not a notification badge: it counts saved sessions. */}
              {sessions.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-muted px-1 text-[10px] font-semibold leading-none text-muted-foreground">
                  {sessions.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-[280px] p-2">
            <p className="px-2 pb-2 pt-1 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
              {t('chat.conversations') || 'Conversas'}
            </p>

            {sortedSessions.length > 0 ? (
              <div className="space-y-1">
                {sortedSessions.map(session => {
                  const isSelected = selectedSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectSession(session.id)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') selectSession(session.id);
                      }}
                      className={`group flex cursor-pointer items-start justify-between gap-2 rounded-[9px] px-3 py-2 transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                          <span
                            className={`truncate text-[13px] font-semibold ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {session.id.substring(0, 8)}
                          </span>
                        </div>
                        <p className="ml-4 mt-0.5 text-[12px] text-muted-foreground">
                          {formatDateTime(session.update_time)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          deleteSession(session.id);
                        }}
                        aria-label={t('actions.delete') || 'Excluir'}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                {t('chat.noConversations') || 'Nenhuma conversa'}
              </p>
            )}
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={createNewSession}
          aria-label={t('chat.newConversation') || 'Nova Conversa'}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('actions.close') || 'Fechar'}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
