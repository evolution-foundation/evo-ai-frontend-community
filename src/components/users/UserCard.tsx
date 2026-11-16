import UserInvitation from './UserInvitation';
import { Button, Card, CardContent, Avatar, AvatarFallback } from '@evoapi/design-system';
import { Edit, MessageSquare, Trash2 } from 'lucide-react';
import { User } from '@/types/users';
import UserStatusBadge from './UserStatusBadge';
import { useLanguage } from '@/hooks/useLanguage';

type UserCardProps = {
  onResendInvite?: (user: User) => void;
  user: User;
  onStartConversation?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  canDelete?: boolean;
};

export default function UserCard({
  onResendInvite,
  user,
  onStartConversation,
  onEdit,
  onDelete,
  canDelete = true,
}: UserCardProps) {
  const { t } = useLanguage('users');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (user: User) => {
    // Priorizar role_data se disponível
    if (user.role && user.role.name) {
      return user.role.name
    }
    
    return t('card.customRole');
  };

  return (
    <Card className="group relative bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <Avatar className="h-10 w-10">
            {(user.avatar_url || user.thumbnail) ? (
              <img
                src={user.avatar_url || user.thumbnail}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-sidebar-foreground">
              {user.name}
            </h3>
            {user.email && (
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            )}
          </div>
          <UserStatusBadge
            status={user.availability}
            confirmed={user.confirmed}
          />
        </div>

        <div className="px-4"><UserInvitation user={user} onResend={onResendInvite} /></div>
        <div className="px-4 py-3 text-xs text-sidebar-foreground/70">
          <div className="flex items-center justify-between">
            <span>{t('card.id')}</span>
            <span className="font-mono min-w-0 break-all text-right ml-2">{user.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('card.role')}</span>
            <span className="font-mono">{getRoleLabel(user)}</span>
          </div>
        </div>

        <div className="flex border-t border-sidebar-border opacity-100 transition-opacity duration-200">
          {onStartConversation && (
            <>
              <Button
                variant="ghost"
                className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={() => onStartConversation(user)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('card.actions.chat')}
              </Button>
              <div className="w-px bg-sidebar-border" />
            </>
          )}
          {onEdit && (
            <>
              <Button
                variant="ghost"
                className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={() => onEdit(user)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('card.actions.edit')}
              </Button>
              {canDelete && onDelete && <div className="w-px bg-sidebar-border" />}
            </>
          )}
          {onDelete && canDelete && (
            <Button
              variant="ghost"
              className="rounded-none h-12 px-4 text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onDelete(user)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
