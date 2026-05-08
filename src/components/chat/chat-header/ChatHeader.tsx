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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@evoapi/design-system/dropdown-menu';
import { Conversation } from '@/types/chat/api';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { getStatusLabel, isPendingStatus } from '@/utils/chat/conversationStatus';
import { useLanguage } from '@/hooks/useLanguage';

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
  const currentStatus = conversation.status;
  const hasUnreadMessages = unreadCount > 0;
  const isPinned = Boolean(conversation.custom_attributes?.pinned);
  const isArchived = Boolean(conversation.custom_attributes?.archived);

  const inboxName = conversation.inbox?.name || '';
  const rawPhone = conversation.contact?.phone_number;
  const phoneDisplay = rawPhone
    ? rawPhone.startsWith('+')
      ? rawPhone
      : `+${rawPhone}`
    : null;

  const renderConversationStatusDropdown = () => {
    return (
      <DropdownMenu>
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
                  title={t('chatHeader.whatsappNumber')}
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
