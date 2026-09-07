import React, { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@evoapi/design-system/avatar';
import { User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface TypingUser {
  id: string;
  name: string;
  avatar_url?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

/**
 * TypingIndicator Component
 * Mostra indicação visual quando usuários estão digitando
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, className = '' }) => {
  const { t } = useLanguage('chat');

  const userDisplayText = useMemo(() => {
    if (typingUsers.length === 0) {
      return '';
    }

    if (typingUsers.length === 1) {
      return t("contactSidebar.typingIndicator.single", { name: typingUsers[0].name });
    } else if (typingUsers.length === 2) {
      return t("contactSidebar.typingIndicator.two", {
        name1: typingUsers[0].name,
        name2: typingUsers[1].name,
      });
    } else {
      return t("contactSidebar.typingIndicator.multiple", {
        name: typingUsers[0].name,
        count: typingUsers.length - 1,
      });
    }
  }, [typingUsers, t]);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 p-3 text-sm text-muted-foreground bg-muted/20 border-t ${className}`}
    >
      {/* Avatars dos usuários digitando */}
      <div className="flex -space-x-1">
        {typingUsers.slice(0, 3).map(user => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {user.name[0]?.toUpperCase() || <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Texto indicativo */}
      <div className="flex items-center gap-2">
        <span>{userDisplayText}</span>

        {/* Animação de "pontos" */}
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TypingIndicator);
