import React, { useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';

import type { AttachmentFile } from '@/types/core';
import {
  SharedImageBubble,
  SharedAudioBubble,
  SharedVideoBubble,
  SharedFileBubble,
  getAttachmentType,
  type SharedAttachment,
} from '@/components/shared/attachments';
import { ReplyToMessage } from './ReplyToMessage';
import { EmailCollectInput } from './EmailCollectInput';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

export interface MessageItem {
  id: string;
  originalId?: string | number; // Keep original ID for backend queries
  type: 'in' | 'out' | 'system';
  text: string;
  ts?: number;
  status?: 'sending' | 'sent' | 'failed';
  avatarUrl?: string;
  isSystem?: boolean;
  echoId?: string;
  attachments?: AttachmentFile[];
  sender?: {
    name?: string;
    avatar_url?: string;
  };
  replyTo?: {
    id: string | number;
    text: string;
    sender?: string;
    type?: 'in' | 'out';
    unresolved?: boolean;
  };
  contentType?: string;
  submittedEmail?: string;
  contentAttributes?: {
    email?: {
      html_content?: {
        full?: string;
        reply?: string;
        quoted?: string;
      };
      text_content?: {
        full?: string;
        reply?: string;
        quoted?: string;
      };
    };
  };
}

interface MessageListProps {
  items: MessageItem[];
  inboundAvatarUrl?: string;
  onRetry?: (id: string, text: string) => void;
  onReply?: (message: MessageItem) => void;
  widgetColor?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onEmailSubmitted?: (email: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  items,
  inboundAvatarUrl,
  onRetry,
  onReply,
  widgetColor = '#00d4aa',
  onLoadMore,
  isLoadingMore = false,
  hasMore = true,
  onEmailSubmitted,
}) => {
  const { t } = useLanguage('widget');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);

  const sanitizeMessageHTML = (html: string): string => {
    if (!html) return '';

    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    return sanitized;
  };

  const hasHtmlTags = (text: string): boolean => /<\/?[a-z][\s\S]*>/i.test(text);

  // Handle scroll event for loading more messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore) return;

    const handleScroll = () => {
      // Check if user scrolled to the top
      if (container.scrollTop <= 50 && hasMore && !isLoadingMore) {
        onLoadMore();
      }

      // Track if user is near bottom to decide whether to auto-scroll on new messages
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldScrollToBottom.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onLoadMore, hasMore, isLoadingMore]);

  // Auto-scroll to bottom when messages are initially loaded or new messages arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && shouldScrollToBottom.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }, [items]);

  return (
    <div ref={scrollContainerRef} className="p-3 flex-1 overflow-y-auto bg-slate-50 min-h-0">
      {/* Load More Button / Loading Indicator */}
      {(hasMore || isLoadingMore) && (
        <div className="flex justify-center py-3 mb-2">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              {t('messageList.loadingOld')}
            </div>
          ) : hasMore ? (
            <button
              onClick={onLoadMore}
              className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              {t('messageList.loadOldMessages')}
            </button>
          ) : null}
        </div>
      )}

      {items.map(m => {
        const hasAvatar = !!(m.avatarUrl || inboundAvatarUrl);
        const isEmailCollect = m.contentType === 'input_email';

        // Render email collect input as a special interactive message
        if (isEmailCollect) {
          return (
            <div key={m.id} className="mb-2 flex justify-center animate-fadeIn">
              <div className="max-w-[90%] w-full mx-auto">
                <div className="text-[13px] leading-tight rounded-[10px] shadow-sm bg-white border border-slate-200 px-3 py-3">
                  {m.text && (
                    <div className="whitespace-pre-wrap break-words text-slate-700 mb-2">{m.text}</div>
                  )}
                  <EmailCollectInput
                    messageId={m.originalId || m.id}
                    widgetColor={widgetColor}
                    onSubmitted={onEmailSubmitted}
                    alreadySubmitted={!!m.submittedEmail}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={m.id}
            className={`mb-2 flex ${m.isSystem || m.type === 'system'
              ? 'justify-center animate-fadeIn'
              : m.type === 'out'
                ? 'justify-end animate-slideInFromRight'
                : 'justify-start animate-slideInFromLeft'
              }`}
          >
            {m.type === 'in' && !m.isSystem && hasAvatar && (
              <div className="mr-2">
                <img
                  src={m.avatarUrl || inboundAvatarUrl}
                  alt="avatar"
                  className="w-6 h-6 rounded-full object-cover border border-white shadow"
                />
              </div>
            )}
            <div className={`max-w-[82%] ${m.isSystem || m.type === 'system' ? 'mx-auto' : ''}`}>
              {/* Reply-to chip */}
              {m.replyTo && m.type !== 'system' && m.replyTo.type && (
                <ReplyToMessage
                  replyTo={m.replyTo as typeof m.replyTo & { type: 'in' | 'out' }}
                  messageType={m.type}
                />
              )}
              <div
                className={`text-[13px] leading-tight rounded-[10px] shadow-sm transition-all duration-200 ${m.status === 'sending' ? 'animate-pulse opacity-70' : ''
                  } ${m.type === 'out'
                    ? 'text-white rounded-tr-[2px]'
                    : m.isSystem || m.type === 'system'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-center italic'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-[2px]'
                  } ${m.attachments?.length ? 'p-2' : 'px-3 py-2'}`}
                style={m.type === 'out' ? { backgroundColor: widgetColor } : undefined}
              >
                {/* Attachments */}
                {m.attachments && m.attachments.length > 0 && (
                  <>
                    {/* Group attachments by type */}
                    {(() => {
                      const attachmentsByType = m.attachments.reduce((groups, attachment) => {
                        const fileType = attachment.file_type || '';
                        const attachmentType = getAttachmentType(fileType);

                        // Additional check for images based on URL extension
                        const isImageByUrl =
                          attachment.data_url &&
                          (attachment.data_url.includes('.png') ||
                            attachment.data_url.includes('.jpg') ||
                            attachment.data_url.includes('.jpeg') ||
                            attachment.data_url.includes('.gif') ||
                            attachment.data_url.includes('.webp'));

                        const finalType =
                          fileType === 'image' || isImageByUrl ? 'image' : attachmentType;

                        if (!groups[finalType]) groups[finalType] = [];

                        // Convert to SharedAttachment format
                        const sharedAttachment: SharedAttachment = {
                          id: attachment.id,
                          file_url: attachment.file_url,
                          data_url: attachment.data_url,
                          thumb_url: attachment.thumb_url,
                          file_type: attachment.file_type,
                          file_size: attachment.file_size,
                          fallback_title: attachment.fallback_title,
                        };

                        groups[finalType].push(sharedAttachment);
                        return groups;
                      }, {} as Record<string, SharedAttachment[]>);

                      return Object.entries(attachmentsByType).map(([type, attachments]) => {
                        return (
                          <div key={type} className="mb-2">
                            {type === 'image' && (
                              <SharedImageBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                                onOpenFullscreen={({ url, title }) => {
                                  openAttachmentInNewTab({
                                    url,
                                    filename: title,
                                  });
                                }}
                              />
                            )}
                            {type === 'video' && (
                              <SharedVideoBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                            {type === 'audio' && (
                              <SharedAudioBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                            {type === 'file' && (
                              <SharedFileBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </>
                )}

                {/* Text content */}
                {m.text && (
                  <div className={m.attachments?.length ? 'mt-2' : ''}>
                    {/* Render HTML for incoming email messages */}
                    {m.contentType === 'incoming_email' &&
                      m.contentAttributes?.email?.html_content?.full ? (
                      <div
                        className="email-html-content"
                        dangerouslySetInnerHTML={{
                          __html: m.contentAttributes.email.html_content.full,
                        }}
                        style={{
                          maxWidth: '100%',
                          overflow: 'auto',
                          wordBreak: 'break-word',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          color: m.type === 'out' ? '#ffffff' : '#1e293b',
                        }}
                      />
                    ) : (
                      hasHtmlTags(m.text) ? (
                        <div
                          className="whitespace-pre-wrap break-words rich-content"
                          dangerouslySetInnerHTML={{ __html: sanitizeMessageHTML(m.text) }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div
                className={`mt-0.5 flex items-center gap-2 ${m.type === 'out' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <span className="text-[10px] text-slate-400">
                  {m.ts
                    ? formatDistanceToNow(new Date(m.ts), { addSuffix: true, locale: ptBR })
                    : ''}
                </span>
                {m.type === 'out' && m.status === 'sending' && (
                  <span className="text-[10px] text-sky-500">{t('messageList.sending')}</span>
                )}
                {m.type === 'out' && m.status === 'failed' && (
                  <button
                    className="text-[10px] text-red-500 underline"
                    onClick={() => onRetry?.(m.id, m.text)}
                  >
                    {t('messageList.retry')}
                  </button>
                )}
                {m.type === 'in' && !m.isSystem && onReply && (
                  <button
                    className="text-[10px] text-slate-500 underline hover:text-slate-700"
                    onClick={() => onReply(m)}
                  >
                    {t('messageList.reply')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
