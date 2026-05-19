import React, { useState } from 'react';

import { Button } from '@evoapi/design-system/button';
import { Badge } from '@evoapi/design-system/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@evoapi/design-system/dropdown-menu';
import {
  MoreVertical,
  Settings,
  MessageCircle,
  CheckCircle,
  Clock,
  Pause,
  UserPlus,
  Users,
  Tag,
  Zap,
  Mail,
  MailOpen,
  Trash2,
  Archive,
  Pin,
  GitBranch,
  Check,
  X,
} from 'lucide-react';
import { Conversation } from '@/types/chat/api';
import type { Pipeline, PipelineStage } from '@/types/analytics';
import { useConversations } from '@/hooks/chat/useConversations';
import { useLanguage } from '@/hooks/useLanguage';
import { findItemInPipeline } from '@/utils/chat/pipelineUtils';

interface ConversationActionsDropdownProps {
  conversation: Conversation | null;
  onFilterReload?: () => Promise<void>;
  onMarkAsRead?: (conversation: Conversation) => void;
  onMarkAsUnread?: (conversation: Conversation) => void;
  onAssignAgent?: (conversation: Conversation) => void;
  onAssignTeam?: (conversation: Conversation) => void;
  onAssignTag?: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
  allPipelines?: Pipeline[];
  pipelinesForConversation?: Pipeline[];
  pipelinesLoadFailed?: boolean;
  isLoadingPipelines?: boolean;
  onPipelineStageSelect?: (pipeline: Pipeline, stage: PipelineStage) => void;
  onRemoveFromPipeline?: (pipeline: Pipeline) => void;
  onRetryLoadPipelines?: () => Promise<void>;
  onDropdownOpen?: () => void;
}

const ConversationActionsDropdown: React.FC<ConversationActionsDropdownProps> = ({
  conversation,
  onFilterReload,
  onMarkAsRead,
  onMarkAsUnread,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
  onDeleteConversation,
  allPipelines,
  pipelinesForConversation,
  pipelinesLoadFailed,
  isLoadingPipelines,
  onPipelineStageSelect,
  onRemoveFromPipeline,
  onRetryLoadPipelines,
  onDropdownOpen,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isUpdatingArchive, setIsUpdatingArchive] = useState(false);
  const [open, setOpen] = useState(false);

  const { t } = useLanguage('chat');
  const conversations = useConversations();

  if (!conversation) return null;

  const handleStatusChange = async (newStatus: 'open' | 'resolved' | 'pending' | 'snoozed') => {
    setIsUpdatingStatus(true);
    try {
      await conversations.updateConversationStatus(conversation.id, newStatus, onFilterReload);
      setOpen(false);
    } catch (error) {
      console.error('❌ Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: 'low' | 'medium' | 'high' | 'urgent' | null) => {
    setIsUpdatingPriority(true);
    try {
      await conversations.updateConversationPriority(conversation.id, newPriority, onFilterReload);
      setOpen(false);
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const isPinned = Boolean(conversation.custom_attributes?.pinned);
  const isArchived = Boolean(conversation.custom_attributes?.archived);

  const handlePin = async () => {
    setIsUpdatingPin(true);
    try {
      if (isPinned) {
        await conversations.unpinConversation(conversation.id, onFilterReload);
      } else {
        await conversations.pinConversation(conversation.id, onFilterReload);
      }
      setOpen(false);
    } catch (error) {
      console.error('Error pinning conversation:', error);
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleArchive = async () => {
    setIsUpdatingArchive(true);
    try {
      if (isArchived) {
        await conversations.unarchiveConversation(conversation.id, onFilterReload);
      } else {
        await conversations.archiveConversation(conversation.id, onFilterReload);
      }
      setOpen(false);
    } catch (error) {
      console.error('Error archiving conversation:', error);
    } finally {
      setIsUpdatingArchive(false);
    }
  };

  const currentStatus = conversation.status;
  const currentPriority = conversation.priority;
  const hasUnreadMessages = (conversation.unread_count ?? 0) > 0;

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  };

  const getPriorityLabel = (priority: string) => {
    return (
      t(
        `conversationActionsDropdown.priorityLabels.${
          priority as 'low' | 'medium' | 'high' | 'urgent'
        }`,
      ) || priority
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={o => { setOpen(o); if (o) onDropdownOpen?.(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{t('conversationActionsDropdown.srOnly')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {t('conversationActionsDropdown.title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Read/Unread Actions */}
        {hasUnreadMessages ? (
          <DropdownMenuItem
            onClick={() => {
              onMarkAsRead?.(conversation);
              setOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <MailOpen className="h-4 w-4" />
            {t('conversationActionsDropdown.markAsRead')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              onMarkAsUnread?.(conversation);
              setOpen(false);
            }}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            {t('conversationActionsDropdown.markAsUnread')}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Status Actions */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('conversationActionsDropdown.status')}
        </DropdownMenuLabel>

        {currentStatus !== 'open' && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('open')}
            disabled={isUpdatingStatus}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {t('conversationActionsDropdown.markAsOpen')}
          </DropdownMenuItem>
        )}

        {currentStatus !== 'resolved' && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('resolved')}
            disabled={isUpdatingStatus}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t('conversationActionsDropdown.markAsResolved')}
          </DropdownMenuItem>
        )}

        {currentStatus !== 'pending' && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('pending')}
            disabled={isUpdatingStatus}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {t('conversationActionsDropdown.markAsPending')}
          </DropdownMenuItem>
        )}

        {currentStatus !== 'snoozed' && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('snoozed')}
            disabled={isUpdatingStatus}
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            {t('conversationActionsDropdown.pauseConversation')}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Priority Actions */}
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between">
          <span>{t('conversationActionsDropdown.priority')}</span>
          {currentPriority && (
            <Badge variant="secondary" className="text-xs">
              <Zap className={`h-3 w-3 mr-1 ${getPriorityColor(currentPriority)}`} />
              {getPriorityLabel(currentPriority)}
            </Badge>
          )}
        </DropdownMenuLabel>

        {currentPriority !== 'low' && (
          <DropdownMenuItem
            onClick={() => handlePriorityChange('low')}
            disabled={isUpdatingPriority}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4 text-gray-500" />
            {t('conversationActionsDropdown.lowPriority')}
          </DropdownMenuItem>
        )}

        {currentPriority !== 'medium' && (
          <DropdownMenuItem
            onClick={() => handlePriorityChange('medium')}
            disabled={isUpdatingPriority}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4 text-blue-500" />
            {t('conversationActionsDropdown.mediumPriority')}
          </DropdownMenuItem>
        )}

        {currentPriority !== 'high' && (
          <DropdownMenuItem
            onClick={() => handlePriorityChange('high')}
            disabled={isUpdatingPriority}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4 text-orange-500" />
            {t('conversationActionsDropdown.highPriority')}
          </DropdownMenuItem>
        )}

        {currentPriority !== 'urgent' && (
          <DropdownMenuItem
            onClick={() => handlePriorityChange('urgent')}
            disabled={isUpdatingPriority}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4 text-red-500" />
            {t('conversationActionsDropdown.priorityLabels.urgent')}
          </DropdownMenuItem>
        )}

        {currentPriority && (
          <DropdownMenuItem
            onClick={() => handlePriorityChange(null)}
            disabled={isUpdatingPriority}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Zap className="h-4 w-4" />
            {t('conversationActionsDropdown.removePriority')}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Management Actions */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('conversationActionsDropdown.management')}
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={handlePin}
          disabled={isUpdatingPin}
          className="flex items-center gap-2"
        >
          <Pin className="h-4 w-4" />
          {isPinned
            ? t('conversationActionsDropdown.unpinConversation')
            : t('conversationActionsDropdown.pinConversation')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleArchive}
          disabled={isUpdatingArchive}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          {isArchived
            ? t('conversationActionsDropdown.unarchiveConversation')
            : t('conversationActionsDropdown.archiveConversation')}
        </DropdownMenuItem>

        {allPipelines !== undefined && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('pipeline.section')}
            </DropdownMenuLabel>
            {pipelinesLoadFailed ? (
              <DropdownMenuItem
                className="text-destructive text-xs"
                onClick={() => onRetryLoadPipelines?.()}
              >
                {t('pipeline.loadError')}
              </DropdownMenuItem>
            ) : allPipelines.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs">
                {t('pipeline.noPipelines')}
              </DropdownMenuItem>
            ) : null}
            {!pipelinesLoadFailed && allPipelines.map(pipeline => {
              const convInThisPipeline = pipelinesForConversation?.find(p => p.id === pipeline.id);
              const convId = String(conversation!.id);
              return (
                <DropdownMenuSub key={pipeline.id}>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    {pipeline.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {isLoadingPipelines ? (
                      <DropdownMenuItem disabled className="text-xs">
                        {t('pipeline.loading')}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {(pipeline.stages ?? []).map(stage => {
                          const currentItem = convInThisPipeline
                            ? findItemInPipeline(convInThisPipeline, convId)
                            : undefined;
                          const isCurrentStage = currentItem?.stage_id === stage.id;
                          return (
                            <DropdownMenuItem
                              key={stage.id}
                              onClick={() => {
                                onPipelineStageSelect?.(pipeline, stage);
                                setOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              {isCurrentStage ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <span className="w-3" />
                              )}
                              {stage.name}
                            </DropdownMenuItem>
                          );
                        })}
                        {convInThisPipeline && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                onRemoveFromPipeline?.(convInThisPipeline);
                                setOpen(false);
                              }}
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
        )}

        <DropdownMenuSeparator />

        {/* Assignment Actions */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('conversationActionsDropdown.assignment')}
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => {
            onAssignAgent?.(conversation);
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {t('conversationActionsDropdown.assignAgent')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            onAssignTeam?.(conversation);
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          {t('conversationActionsDropdown.assignTeam')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            onAssignTag?.(conversation);
            setOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <Tag className="h-4 w-4" />
          {t('conversationActionsDropdown.assignTag')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Destructive Actions */}
        <DropdownMenuItem
          onClick={() => {
            onDeleteConversation?.(conversation);
            setOpen(false);
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t('conversationActionsDropdown.deleteConversation')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ConversationActionsDropdown;
