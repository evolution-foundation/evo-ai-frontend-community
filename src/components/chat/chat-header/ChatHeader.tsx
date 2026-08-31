import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@evoapi/design-system/button';
import {
  ArrowLeft,
  X,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  GitBranch,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from '@evoapi/design-system/dropdown-menu';
import { Conversation } from '@/types/chat/api';
import type { Pipeline, PipelineStage } from '@/types/analytics';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { getStatusLabel } from '@/utils/chat/conversationStatus';
import ConversationStatusButton from './ConversationStatusButton';
import { STATUS_META, STATUS_META_LIGHT } from './statusMeta';
import { isPhoneBearingChannel } from '@/utils/channelUtils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { useLanguage } from '@/hooks/useLanguage';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import chatService from '@/services/chat/chatService';
import { toast } from 'sonner';
import { findItemInPipeline } from '@/utils/chat/pipelineUtils';

interface ChatHeaderProps {
  conversation: Conversation;
  onBackClick: () => void;
  onCloseConversation: () => void;
  onContactSidebarOpen: () => void;
  onMarkAsRead: (conversation: Conversation) => void;
  onMarkAsUnread: (conversation: Conversation) => void;
  onMarkAsOpen: (conversation: Conversation) => void;
  onMarkAsResolved: (conversation: Conversation) => void;
  onPostpone: (conversation: Conversation) => void;
  onMarkAsSnoozed: (conversation: Conversation) => void;
  onSetPriority: (
    conversation: Conversation,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
  ) => void;
  onPinConversation: (conversation: Conversation) => void;
  onUnpinConversation: (conversation: Conversation) => void;
  onArchiveConversation: (conversation: Conversation) => void;
  onUnarchiveConversation: (conversation: Conversation) => void;
  onAssignAgent: (conversation: Conversation) => void;
  onAssignTeam: (conversation: Conversation) => void;
  onAssignTag: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  unreadCount: number;
}

interface ConvPipelineData {
  pipelines: Pipeline[];
}

const ChatHeader = ({
  conversation,
  onBackClick,
  onCloseConversation,
  onContactSidebarOpen,
  onMarkAsOpen,
  onMarkAsResolved,
  onPostpone,
  onMarkAsSnoozed,
  onSetPriority,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
}: ChatHeaderProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  const currentStatus = conversation.status;

  const inboxName = conversation.inbox?.name || '';
  const phoneDisplay = isPhoneBearingChannel(conversation.inbox?.channel_type)
    ? formatContactPhone(conversation.contact?.phone_number)
    : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);
  const [pipelinesLoadFailed, setPipelinesLoadFailed] = useState(false);
  const [convPipelineData, setConvPipelineData] = useState<ConvPipelineData | null>(null);
  const [isLoadingConvPipelines, setIsLoadingConvPipelines] = useState(false);
  const pipelineFetchCountRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await pipelinesService.getPipelines({ is_active: true });
        if (!cancelled) {
          setAllPipelines(resp.data ?? []);
          setPipelinesLoaded(true);
        }
      } catch {
        if (!cancelled) setPipelinesLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setConvPipelineData(null);
  }, [conversation.id]);

  const reloadConvPipelineData = useCallback(() => {
    if (!isMountedRef.current) return;
    const fetchId = ++pipelineFetchCountRef.current;
    setIsLoadingConvPipelines(true);
    (async () => {
      try {
        const pipelines = await pipelinesService.getPipelinesByConversation(
          String(conversation.id),
        );
        if (!isMountedRef.current || pipelineFetchCountRef.current !== fetchId) return;
        setConvPipelineData({ pipelines });
      } catch {
        if (isMountedRef.current && pipelineFetchCountRef.current === fetchId) {
          setConvPipelineData({ pipelines: [] });
        }
      } finally {
        if (isMountedRef.current && pipelineFetchCountRef.current === fetchId) {
          setIsLoadingConvPipelines(false);
        }
      }
    })();
  }, [conversation.id]);

  useEffect(() => {
    if (!menuOpen) return;
    reloadConvPipelineData();
  }, [menuOpen, conversation.id, reloadConvPipelineData]);

  const refreshConversationBadge = useCallback(async () => {
    const [badgeResult, pipelinesResult] = await Promise.allSettled([
      chatService.getConversation(String(conversation.id)),
      pipelinesService.getPipelinesByConversation(String(conversation.id)),
    ]);

    if (badgeResult.status === 'fulfilled') {
      const raw = badgeResult.value;
      const envelope = raw as unknown as { data?: Conversation } | null;
      const updated: Conversation | null = envelope?.data ?? (raw as unknown as Conversation);
      if (updated) chatContext.conversations.updateConversation(updated);
    }

    if (pipelinesResult.status === 'fulfilled' && isMountedRef.current) {
      setConvPipelineData({ pipelines: pipelinesResult.value });
    }
  }, [conversation.id, chatContext]);

  const handlePipelineStageSelect = useCallback(
    async (pipeline: Pipeline, stage: PipelineStage) => {
      const currentPipelines = convPipelineData?.pipelines ?? [];
      const samePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const existingInOtherPipelines = currentPipelines.filter(p => p.id !== pipeline.id);
      // MOVER vs ADICIONAR por item ATIVO encontrável, não por presença do pipeline
      // (pipeline com jornada COMPLETED volta sem item ativo → precisa cair no ADD,
      // senão morre em moveError). Mesmo fix do ChatSidebar.
      const existingItem = samePipeline
        ? findItemInPipeline(samePipeline, String(conversation.id))
        : undefined;

      if (existingItem?.id) {
        try {
          await pipelinesService.moveItem({
            pipeline_id: pipeline.id,
            item_id: existingItem.id,
            from_stage_id: existingItem.stage_id,
            to_stage_id: stage.id,
          });
          toast.success(t('pipeline.moveSuccess'));
          await refreshConversationBadge();
        } catch {
          toast.error(t('pipeline.moveError'));
        }
      } else {
        if (existingInOtherPipelines.length > 0) {
          const removeResults = await Promise.allSettled(
            existingInOtherPipelines.map(p => {
              const item = findItemInPipeline(p, String(conversation.id));
              return item?.id
                ? pipelinesService.removeItemFromPipeline(p.id, item.id)
                : Promise.resolve();
            }),
          );
          if (removeResults.some(r => r.status === 'rejected')) {
            toast.error(t('pipeline.removeError'));
            reloadConvPipelineData();
            return;
          }
        }
        try {
          await pipelinesService.addItemToPipeline(pipeline.id, {
            item_id: String(conversation.id),
            type: 'conversation',
            pipeline_stage_id: stage.id,
          });
          toast.success(t('pipeline.addSuccess'));
          await refreshConversationBadge();
        } catch {
          toast.error(t('pipeline.addError'));
        }
      }
    },
    [convPipelineData, conversation.id, t, refreshConversationBadge, reloadConvPipelineData],
  );

  const handleRemoveFromPipeline = useCallback(
    async (pipeline: Pipeline) => {
      const item = findItemInPipeline(pipeline, String(conversation.id));
      const itemId = item?.id;
      if (!itemId) { toast.error(t('pipeline.removeError')); return; }
      try {
        await pipelinesService.removeItemFromPipeline(pipeline.id, itemId);
        toast.success(t('pipeline.removeSuccess'));
        await refreshConversationBadge();
      } catch {
        toast.error(t('pipeline.removeError'));
      }
    },
    [conversation.id, t, refreshConversationBadge],
  );

  const renderPipelineSubmenuContent = () => {
    if (pipelinesLoadFailed) {
      return (
        <DropdownMenuLabel
          className="text-destructive text-xs cursor-pointer"
          onClick={async () => {
            setPipelinesLoadFailed(false);
            setIsLoadingPipelines(true);
            try {
              const resp = await pipelinesService.getPipelines({ is_active: true });
              setAllPipelines(resp.data ?? []);
              setPipelinesLoaded(true);
            } catch {
              setPipelinesLoadFailed(true);
            } finally {
              setIsLoadingPipelines(false);
            }
          }}
        >
          {t('pipeline.loadError')}
        </DropdownMenuLabel>
      );
    }

    if (isLoadingPipelines || !pipelinesLoaded) {
      return <DropdownMenuLabel className="text-xs">{t('pipeline.loading')}</DropdownMenuLabel>;
    }

    if (allPipelines.length === 0) {
      return <DropdownMenuLabel className="text-xs">{t('pipeline.noPipelines')}</DropdownMenuLabel>;
    }

    const currentPipelines = convPipelineData?.pipelines ?? [];

    return (
      <>
        {allPipelines.map(pipeline => {
          const convInThisPipeline = currentPipelines.find(p => p.id === pipeline.id);
          const currentItem = convInThisPipeline
            ? findItemInPipeline(convInThisPipeline, String(conversation.id))
            : undefined;
          return (
            <DropdownMenuSub key={pipeline.id}>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {pipeline.name}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {isLoadingConvPipelines ? (
                  <DropdownMenuLabel className="text-xs">{t('pipeline.loading')}</DropdownMenuLabel>
                ) : (
                  <>
                    {(pipeline.stages ?? []).map(stage => {
                      const isCurrentStage = currentItem?.stage_id === stage.id;

                      return (
                        <DropdownMenuItem
                          key={stage.id}
                          onClick={() => handlePipelineStageSelect(pipeline, stage)}
                          className="flex items-center gap-2"
                        >
                          {isCurrentStage && <Check className="h-3 w-3 text-primary" />}
                          {!isCurrentStage && <span className="w-3" />}
                          {stage.name}
                        </DropdownMenuItem>
                      );
                    })}
                    {convInThisPipeline && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveFromPipeline(convInThisPipeline)}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          {t('pipeline.removeFrom')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </>
    );
  };

  // Menu de 3 pontinhos (§3.3 do protótipo): SÓ pipeline/atribuir/prioridade.
  // Status (aberto/pendente/pausada/concluído) já vive no ConversationStatusButton
  // dedicado — não duplica aqui. Fixar/Arquivar/Deletar/Marcar lida-não lida
  // vivem no context menu da LISTA (clique-direito), não no header da conversa
  // aberta — ver spec-extraida.md.
  const renderConversationStatusDropdown = () => {
    return (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4 fill-current text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Pipeline Actions */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              {t('pipeline.addTo')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {renderPipelineSubmenuContent()}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={() => onAssignAgent(conversation)}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4 text-primary" />
            {t('chatHeader.actions.assignAgent')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTeam(conversation)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4 text-primary" />
            {t('chatHeader.actions.assignTeam')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTag(conversation)}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4 text-primary" />
            {t('chatHeader.actions.assignTag')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('chatHeader.actions.priorityLabel', 'Prioridade')}
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'urgent')}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {t('chatHeader.actions.priorityUrgent')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'high')}
            className="flex items-center gap-2"
          >
            <ArrowUp className="h-4 w-4 text-orange-600" />
            {t('chatHeader.actions.priorityHigh')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'medium')}
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4 text-blue-600" />
            {t('chatHeader.actions.priorityMedium')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'low')}
            className="flex items-center gap-2"
          >
            <ArrowDown className="h-4 w-4 text-gray-600" />
            {t('chatHeader.actions.priorityLow')}
          </DropdownMenuItem>

          {conversation.priority && (
            <DropdownMenuItem
              onClick={() => onSetPriority(conversation, null)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('chatHeader.actions.removePriority')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="relative z-20 flex-shrink-0 p-3 md:p-4 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button for mobile — the only way out of the conversation on mobile
              (the close X is desktop-only), so it needs an accessible name of its own. */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onBackClick}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t('chatHeader.backToConversations')}</span>
          </Button>
          <div
            className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all rounded-full"
            onClick={onContactSidebarOpen}
          >
            <ContactAvatar contact={conversation.contact} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3
                className="font-semibold cursor-pointer hover:text-primary transition-colors truncate max-w-full"
                onClick={onContactSidebarOpen}
              >
                {conversation.contact?.name || t('chatHeader.contactNoName')}
              </h3>
              {phoneDisplay && (
                <span
                  className="text-sm text-muted-foreground"
                  title={t('chatHeader.phoneNumber')}
                  aria-label={`${t('chatHeader.phoneNumber')}: ${phoneDisplay}`}
                >
                  {phoneDisplay}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {/* min-w-0: a flex item's automatic minimum size is its content, so without
                  it a long inbox name overflows the header and runs under the action
                  buttons on mobile instead of truncating (EVO-2234). */}
              {inboxName && <span className="min-w-0 truncate">{inboxName}</span>}
              {(() => {
                const meta = STATUS_META_LIGHT[conversation.status] || STATUS_META_LIGHT.snoozed;
                // Rótulo LONGO do protótipo ("Atendimento em Aberto" etc.), distinto do
                // rótulo curto de getStatusLabel ("Aberta") usado em badges compactos —
                // chave própria (chatHeader.statusPill.*) para não regressar os outros
                // 5 idiomas ao fallback PT-BR do protótipo.
                const pillLabel = t(
                  `chatHeader.statusPill.${conversation.status}`,
                  STATUS_META[conversation.status]?.label || getStatusLabel(conversation.status, t),
                );
                return (
                  <>
                    {/* Mobile carries the status as short text: the pill is hidden here and
                        the ConversationStatusButton labels the NEXT action ("Concluir"), not
                        the current state — without this the status would be color-only. */}
                    <span className="md:hidden flex-shrink-0">
                      • {getStatusLabel(conversation.status, t)}
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        color: meta.text,
                        borderRadius: 9,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1,
                      }}
                    >
                      • {pillLabel}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Ações do chat */}
        <div className="flex items-center gap-2">
          {/* Botão de status: cor + próxima ação mudam conforme o status atual */}
          <ConversationStatusButton
            status={currentStatus}
            onMarkAsOpen={() => onMarkAsOpen(conversation)}
            onMarkAsResolved={() => onMarkAsResolved(conversation)}
            onMarkAsPending={() => onPostpone(conversation)}
            onMarkAsSnoozed={() => onMarkAsSnoozed(conversation)}
          />

          {/* Dropdown de ações da conversa */}
          {renderConversationStatusDropdown()}

          {/* Botão fechar conversa — hidden on mobile: the back arrow already leaves the conversation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseConversation}
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('chatHeader.closeConversation')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
