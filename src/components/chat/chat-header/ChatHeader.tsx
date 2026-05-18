import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@evoapi/design-system/button';
import {
  ArrowLeft,
  X,
  MessageCircle,
  CheckCircle,
  Clock,
  Pause,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  Trash2,
  Mail,
  MailOpen,
  Unlock,
  Pin,
  Archive,
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
import { getStatusLabel, isPendingStatus } from '@/utils/chat/conversationStatus';
import { isPhoneBearingChannel } from '@/utils/channelUtils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { useLanguage } from '@/hooks/useLanguage';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import chatService from '@/services/chat/chatService';
import { toast } from 'sonner';

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
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAsOpen,
  onMarkAsResolved,
  onPostpone,
  onMarkAsSnoozed,
  onSetPriority,
  onPinConversation,
  onUnpinConversation,
  onArchiveConversation,
  onUnarchiveConversation,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
  onDeleteConversation,
  unreadCount,
}: ChatHeaderProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  const currentStatus = conversation.status;
  const hasUnreadMessages = unreadCount > 0;
  const isPinned = Boolean(conversation.custom_attributes?.pinned);
  const isArchived = Boolean(conversation.custom_attributes?.archived);

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
    try {
      const raw = await chatService.getConversation(String(conversation.id));
      const envelope = raw as unknown as { data?: Conversation } | null;
      const updated: Conversation | null = envelope?.data ?? (raw as unknown as Conversation);
      if (updated) {
        chatContext.conversations.updateConversation(updated);
        const pipelines = await pipelinesService.getPipelinesByConversation(
          String(conversation.id),
        );
        setConvPipelineData({ pipelines });
      }
    } catch {
      // badge refresh is best-effort
    }
  }, [conversation.id, chatContext]);

  const handlePipelineStageSelect = useCallback(
    async (pipeline: Pipeline, stage: PipelineStage) => {
      const currentPipelines = convPipelineData?.pipelines ?? [];
      const existingInSamePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const existingInOtherPipelines = currentPipelines.filter(p => p.id !== pipeline.id);

      if (existingInSamePipeline) {
        const item = existingInSamePipeline.items?.find(
          i => String(i.item_id) === String(conversation.id),
        );
        const itemId = item?.id;
        if (!itemId) return;
        try {
          await pipelinesService.moveItem({
            pipeline_id: pipeline.id,
            item_id: itemId,
            from_stage_id: item.stage_id,
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
              const item = p.items?.find(i => String(i.item_id) === String(conversation.id));
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
      const item = pipeline.items?.find(i => String(i.item_id) === String(conversation.id));
      const itemId = item?.id;
      if (!itemId) return;
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
        {allPipelines.map(pipeline => (
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
                    const convInThisPipeline = currentPipelines.find(p => p.id === pipeline.id);
                    const currentItem = convInThisPipeline?.items?.find(
                      i => String(i.item_id) === String(conversation.id),
                    );
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
                  {currentPipelines.some(p => p.id === pipeline.id) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveFromPipeline(pipeline)}
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
        ))}
      </>
    );
  };

  const renderConversationStatusDropdown = () => {
    return (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Read/Unread Actions */}
          {hasUnreadMessages ? (
            <DropdownMenuItem
              onClick={() => onMarkAsRead(conversation)}
              className="flex items-center gap-2"
            >
              <MailOpen className="h-4 w-4" />
              {t('chatHeader.actions.markAsRead')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onMarkAsUnread(conversation)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t('chatHeader.actions.markAsUnread')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Status Actions */}
          {currentStatus !== 'open' && (
            <DropdownMenuItem
              onClick={() => onMarkAsOpen(conversation)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsOpen')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'resolved' && (
            <DropdownMenuItem
              onClick={() => onMarkAsResolved(conversation)}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsResolved')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'pending' && (
            <DropdownMenuItem
              onClick={() => onPostpone(conversation)}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t('chatHeader.actions.markAsPending')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'snoozed' && (
            <DropdownMenuItem
              onClick={() => onMarkAsSnoozed(conversation)}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              {t('chatHeader.actions.pauseConversation')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Priority Actions */}
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              isPinned ? onUnpinConversation(conversation) : onPinConversation(conversation)
            }
            className="flex items-center gap-2"
          >
            <Pin className="h-4 w-4" />
            {isPinned
              ? t('chatHeader.actions.unpinConversation')
              : t('chatHeader.actions.pinConversation')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              isArchived
                ? onUnarchiveConversation(conversation)
                : onArchiveConversation(conversation)
            }
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {isArchived
              ? t('chatHeader.actions.unarchiveConversation')
              : t('chatHeader.actions.archiveConversation')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Pipeline Actions */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              {t('pipeline.addTo')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {renderPipelineSubmenuContent()}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onAssignAgent(conversation)}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4" />
            {t('chatHeader.actions.assignAgent')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTeam(conversation)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {t('chatHeader.actions.assignTeam')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTag(conversation)}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            {t('chatHeader.actions.assignTag')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onDeleteConversation(conversation)}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('chatHeader.actions.deleteConversation')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex-shrink-0 p-4 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onBackClick}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all rounded-full"
            onClick={onContactSidebarOpen}
          >
            <ContactAvatar contact={conversation.contact} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">
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
              {inboxName && (
                <>
                  <span>{inboxName}</span>
                  <span>•</span>
                </>
              )}
              <span>
                {t('chatHeader.status')} {getStatusLabel(conversation.status)}
              </span>
            </div>
          </div>
        </div>
        {/* Ações do chat */}
        <div className="flex items-center gap-2">
          {/* Botão abrir conversa pendente */}
          {isPendingStatus(conversation.status) && (
            <Button
              variant="plain"
              size="sm"
              onClick={() => onMarkAsOpen(conversation)}
              className="flex items-center gap-2 text-primary hover:text-primary/80 hover:bg-primary/10 transition-all duration-200"
            >
              <Unlock className="h-4 w-4" />
              {t('chatHeader.openConversation')}
            </Button>
          )}

          {/* Dropdown de ações da conversa */}
          {renderConversationStatusDropdown()}

          {/* Botão fechar conversa */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseConversation}
            className="text-muted-foreground hover:text-foreground"
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
