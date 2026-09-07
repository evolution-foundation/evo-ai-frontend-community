import { useTranslation as useUiTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { widgetService } from '@/services/widget/widgetService';
import { useLanguage } from '@/hooks/useLanguage';

interface EmailTranscriptButtonProps {
  websiteToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  widgetColor?: string;
}

const EmailTranscriptButton: React.FC<EmailTranscriptButtonProps> = ({
  websiteToken,
  onSuccess,
  onError,
  disabled = false,
  widgetColor = '#00d4aa',
}) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('widget');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendTranscript = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      await widgetService.sendEmailTranscript(websiteToken);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : tUi("customMcpServers:test.unknownError");
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSendTranscript}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium
        rounded-md transition-all duration-200 border
        ${
          disabled || isLoading
            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-200'
            : 'hover:opacity-80 bg-white text-slate-700 border-slate-200 hover:border-slate-300'
        }
      `}
      style={
        !disabled && !isLoading
          ? {
              borderColor: `${widgetColor}20`,
              color: widgetColor,
            }
          : undefined
      }
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          {t('emailTranscript.sending')}
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {t('emailTranscript.button')}
        </>
      )}
    </button>
  );
};

export default EmailTranscriptButton;
