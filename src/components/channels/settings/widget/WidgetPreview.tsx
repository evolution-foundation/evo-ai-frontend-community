import { useTranslation as useUiTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef } from 'react';
import { WidgetConfig } from '../helpers/widgetHelpers';
import { useLanguage } from '@/hooks/useLanguage';

interface WidgetPreviewProps {
  config: WidgetConfig & {
    isOnline?: boolean;
  };
  websiteToken?: string;
}

export default function WidgetPreview({ config, websiteToken }: WidgetPreviewProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('channels');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const src = useMemo(() => {
    if (!websiteToken || typeof window === 'undefined') return '';
    const base = window.location.origin;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const query = apiBase
      ? `website_token=${encodeURIComponent(websiteToken)}&api_base=${encodeURIComponent(apiBase)}`
      : `website_token=${encodeURIComponent(websiteToken)}`;
    return `${base}/widget?${query}`;
  }, [websiteToken]);

  const postConfigToIframe = () => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    iframeWindow.postMessage(
      `evo-widget:${JSON.stringify({
        event: 'config-set',
        settings: {
          welcomeHeading: config.welcomeHeading,
          welcomeTagline: config.welcomeTagline,
          widgetColor: config.widgetColor,
          avatarUrl: config.avatarUrl,
          avatar_url: config.avatarUrl,
        },
      })}`,
      '*',
    );
  };

  useEffect(() => {
    postConfigToIframe();
  }, [config.welcomeHeading, config.welcomeTagline, config.widgetColor]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {src ? (
          <div className="w-[360px] max-w-full space-y-3">
            <iframe
              ref={iframeRef}
              title={tUi("interface:widgetpreview.widgetPreview")}
              src={src}
              className="h-[560px] w-full rounded-lg border border-slate-200 bg-white shadow-sm"
              allow="camera; microphone; clipboard-write"
              onLoad={postConfigToIframe}
            />

            <div
              className={`flex w-full ${config.widgetBubblePosition === 'left' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`flex items-center justify-center rounded-full text-white shadow-md ${
                  config.widgetBubbleType === 'expanded_bubble'
                    ? 'h-12 px-4 gap-2 text-sm font-medium'
                    : 'h-14 w-14'
                }`}
                style={{ backgroundColor: config.widgetColor }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h6" />
                  <path d="M17 3h4v4" />
                  <path d="M21 3l-7 7" />
                </svg>
                {config.widgetBubbleType === 'expanded_bubble' && (
                  <span>{config.widgetBubbleLauncherTitle || 'Chat'}</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs text-muted-foreground">
                {t('settings.widget.preview.sentMessageExample')}
              </div>
              <div className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-sm text-white"
                  style={{ backgroundColor: config.widgetColor }}
                >
                  {t('settings.widget.preview.sampleSentMessage')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[560px] w-[360px] max-w-full rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-muted-foreground">
            {t('settings.widgetBuilder.widgetCode.noScriptError')}
          </div>
        )}
      </div>
    </div>
  );
}
