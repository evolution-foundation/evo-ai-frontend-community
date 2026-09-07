import { useTranslation as useUiTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface TypingIndicatorProps {
  isVisible: boolean;
  avatarUrl?: string;
  agentName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  avatarUrl,
  agentName = i18n.t("widget:chat.agent"),
}) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('widget');
  if (!isVisible) return null;

  return (
    <div className="mb-2 flex justify-start animate-fade-in">
      <div className="mr-2">
        <img
          src={avatarUrl || '/default-avatar.png'}
          alt={tUi("interface:typingindicator.avatar")}
          className="w-6 h-6 rounded-full object-cover border border-white shadow"
        />
      </div>
      <div className="max-w-[82%]">
        <div className="bg-white text-slate-900 border border-slate-200 rounded-tl-[2px] rounded-[10px] shadow-sm px-3 py-2">
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-slate-600">{t('typing.typing', { name: agentName })}</span>
            <div className="flex gap-1 ml-2">
              <div
                className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-start">
          <span className="text-[10px] text-slate-400">{t('typing.now')}</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
