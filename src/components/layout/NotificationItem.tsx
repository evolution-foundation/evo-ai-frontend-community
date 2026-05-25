import { useLanguage } from '@/hooks/useLanguage';
import { useRelativeTime } from '@/lib/useRelativeTime';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@evoapi/design-system';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, pt, enUS, es, fr, it } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { useMemo } from 'react';
import { Notification } from '@/services/notifications/NotificationsService';

const DATE_FNS_LOCALES: Record<string, DateFnsLocale> = {
  'pt-BR': ptBR,
  'pt': pt,
  'en': enUS,
  'es': es,
  'fr': fr,
  'it': it,
};

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  getTypeLabel: (type: string) => string;
}

const CHANNEL_NAMES: Record<string, string> = {
  'Channel::Whatsapp': 'WhatsApp',
  'Channel::Telegram': 'Telegram',
  'Channel::Api': 'API',
  'Channel::WebWidget': 'Web Chat',
  'Channel::Email': 'E-mail',
  'Channel::Sms': 'SMS',
  'Channel::Line': 'LINE',
  'Channel::FacebookPage': 'Facebook',
  'Channel::Instagram': 'Instagram',
  'Channel::TwitterProfile': 'Twitter',
  'Channel::Slack': 'Slack',
  'Channel::TwilioSms': 'SMS',
  'Channel::Voice': 'Voice',
};

const NEW_MESSAGE_TYPES = new Set([
  'assigned_conversation_new_message',
  'participating_conversation_new_message',
]);

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function NotificationItem({
  notification,
  onOpen,
  getTypeLabel,
}: NotificationItemProps) {
  const { t, currentLanguage } = useLanguage('layout');
  const dateFnsLocale = DATE_FNS_LOCALES[currentLanguage] ?? enUS;
  const isUnread = !notification.read_at;

  const contact = notification.primary_actor?.contact ?? null;
  const displayId = notification.primary_actor?.display_id;
  const channelType = notification.primary_actor?.channel ?? null;

  const contactName = contact?.name ?? (displayId ? `#${displayId}` : t('notifications.item.noAssignee'));
  const contactAvatarUrl = contact?.avatar_url ?? undefined;

  const channelName = channelType ? CHANNEL_NAMES[channelType] ?? null : null;
  const badgeLabel = NEW_MESSAGE_TYPES.has(notification.notification_type) && channelName
    ? t('notifications.panel.types.channel_message', { channel: channelName })
    : getTypeLabel(notification.notification_type);

  const activityDate = useMemo(() => {
    if (!notification.last_activity_at) return null;
    const d = new Date(notification.last_activity_at);
    return isNaN(d.getTime()) ? null : d;
  }, [notification.last_activity_at]);

  useRelativeTime(activityDate);
  const timeLabel = activityDate
    ? formatDistanceToNow(activityDate, { addSuffix: true, locale: dateFnsLocale })
    : t('notifications.item.someTimeAgo');

  const preview = notification.push_message_body || notification.push_message_title || t('notifications.item.noContent');

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        onClick={() => onOpen(notification)}
        className="w-full h-auto p-0 justify-start hover:bg-muted/50"
      >
        <div className="flex items-start p-4 w-full border-b border-border hover:bg-muted/30 hover:rounded-md transition-colors">
          {/* Unread indicator */}
          <div className="flex-shrink-0 mt-1">
            {isUnread ? (
              <div className="w-2 h-2 rounded-full bg-primary" />
            ) : (
              <div className="w-2" />
            )}
          </div>

          {/* Contact avatar */}
          <div className="flex-shrink-0 ml-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={contactAvatarUrl} alt={contactName} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {getInitials(contact?.name ?? '')}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="flex-1 ml-3 overflow-hidden">
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-foreground truncate text-sm">
                {contactName}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {timeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded flex-shrink-0">
                {badgeLabel}
              </span>
            </div>

            <p className="text-sm text-muted-foreground truncate mt-1 font-normal text-left">
              {preview}
            </p>
          </div>
        </div>
      </Button>
    </div>
  );
}
