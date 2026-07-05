import React from 'react';
import EndConversationButton from './EndConversationButton';
import { useLanguage } from '@/hooks/useLanguage';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  color?: string;
  online?: boolean;
  avatarUrl?: string;
  replyTime?: string;
  websiteToken?: string;
  canEndConversation?: boolean;
  hasEndConversationEnabled?: boolean;
  onConversationEnded?: () => void;
  onError?: (error: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title = 'EAP CRM',
  subtitle = 'Como podemos ajudar?',
  color = '#1f93ff',
  online = false,
  avatarUrl,
  replyTime,
  websiteToken = '',
  canEndConversation = false,
  hasEndConversationEnabled = false,
  onConversationEnded,
  onError,
}) => {
  const { t } = useLanguage('widget');
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 text-white"
      style={{ backgroundColor: color }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={title}
          className="w-7 h-7 rounded-full object-cover border border-white/30"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold">
          E
        </div>
      )}
      <div className="leading-tight flex-1">
        <div className="text-sm font-semibold flex items-center gap-2">
          {title}
          <span
            className={`inline-flex items-center gap-1 text-[10px] ${
              online ? 'text-emerald-200' : 'text-white/70'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-300' : 'bg-white/60'}`}
            ></span>
            {online ? t('header.onlineNow') : replyTime ? t('header.replyTime', { time: replyTime }) : t('header.weAreResponding')}
          </span>
        </div>
        <div className="text-[11px] opacity-90">{subtitle}</div>
      </div>

      {/* End Conversation Button */}
      <EndConversationButton
        websiteToken={websiteToken}
        canEndConversation={canEndConversation}
        hasEndConversationEnabled={hasEndConversationEnabled}
        onSuccess={onConversationEnded}
        onError={onError}
      />
    </div>
  );
};

export default Header;
