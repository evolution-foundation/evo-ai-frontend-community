import i18n from '@/i18n/config';
import { getFormattingLocale } from '@/lib/formattingLocale';
import { useTranslation as useUiTranslation } from 'react-i18next';
import React from 'react';
import { MessageSquare, Mail, Send, ExternalLink, Phone } from 'lucide-react';
import { usesStructuredComponents } from '@/services/channels/messageTemplatesService';
import { TemplateFormData } from '@/types';

interface TemplatePreviewProps {
  template: Partial<TemplateFormData>;
  channelType: string;
  t: (key: string) => string;
}

// WhatsApp/Instagram/Facebook Preview (Bubble UI)
const BubblePreview: React.FC<{
  template: Partial<TemplateFormData>;
  t: (key: string) => string;
}> = ({ template, t }) => {
  const { t: tUi } = useUiTranslation();
  return (
    <div className="template-preview-container">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-green-600" />
        {t('settings.messageTemplates.preview.title')}
      </h4>

      {/* Mobile phone simulator */}
      <div className="whatsapp-preview-container border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 shadow-lg">
        {/* Preview header */}
        <div className="preview-header bg-gray-100 dark:bg-slate-700 p-3 flex items-center justify-between rounded-t-2xl">
          <span className="text-xs text-center w-full text-gray-700 dark:text-gray-300 font-medium">
            {t('settings.messageTemplates.preview.whatsappPreview')}
          </span>
        </div>

        {/* Preview content */}
        <div
          className="preview-content p-4 h-[500px] overflow-y-auto"
          style={{
            backgroundColor: '#e5ddd5',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23bdbdbd' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        >
          {/* Chat bubble */}
          <div className="chat-bubble bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm max-w-[280px] ml-auto mb-2 relative">
            {/* Template header (if exists) */}
            {template.headerFormat === 'TEXT' && template.headerText && (
              <div className="mb-2">
                <div className="preview-header-text text-sm font-medium text-slate-900 dark:text-slate-100">
                  {template.headerText}
                </div>
              </div>
            )}
            {template.headerFormat === 'IMAGE' && (
              <div className="mb-2">
                <div className="preview-header-image bg-gray-200 dark:bg-slate-600 rounded h-[120px] flex items-center justify-center">
                  <div className="text-3xl text-gray-400">📷</div>
                </div>
              </div>
            )}
            {template.headerFormat === 'VIDEO' && (
              <div className="mb-2">
                <div className="preview-header-image bg-gray-200 dark:bg-slate-600 rounded h-[120px] flex items-center justify-center">
                  <div className="text-3xl text-gray-400">🎥</div>
                </div>
              </div>
            )}
            {template.headerFormat === 'DOCUMENT' && (
              <div className="mb-2">
                <div className="preview-header-image bg-gray-200 dark:bg-slate-600 rounded h-[60px] flex items-center justify-center">
                  <div className="text-2xl text-gray-400">📄</div>
                </div>
              </div>
            )}

            {/* Template body */}
            <div className="preview-body-text text-sm mb-2 text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
              {template.bodyText || i18n.t('interface:fallbacks.templateBody')}
            </div>

            {/* Template footer (if exists) */}
            {template.footerText && (
              <div className="preview-footer-text text-xs text-gray-500 dark:text-slate-400 mb-2">
                {template.footerText}
              </div>
            )}

            {/* Buttons (if exist) */}
            {template.buttons && template.buttons.length > 0 && (
              <div className="preview-buttons mt-3 border-t border-gray-200 dark:border-slate-600 pt-2">
                {template.buttons.map((button: any, index: number) => (
                  <div
                    key={index}
                    className="button-preview text-center text-blue-600 dark:text-blue-400 text-sm py-1 hover:bg-gray-50 dark:hover:bg-slate-600 rounded transition-colors cursor-pointer"
                    style={{
                      borderBottom:
                        index < (template.buttons?.length || 0) - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {button.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                      {button.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                      {button.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3" />}
                      <span>{button.text || i18n.t('interface:fallbacks.buttonText')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delivery time */}
            <div className="text-right">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {new Date().toLocaleTimeString(getFormattingLocale(), { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center text-xs text-gray-500 dark:text-slate-400 mt-1">{tUi("channels:settings.messageTemplates.preview.today")}</div>
        </div>
      </div>

      {/* Additional preview information */}
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
        {t('settings.messageTemplates.preview.description')}
      </p>
    </div>
  );
};

// Email Preview
const EmailPreview: React.FC<{
  template: Partial<TemplateFormData>;
  t: (key: string) => string;
}> = ({ template, t }) => {
  const { t: tUi } = useUiTranslation();
  return (
    <div className="template-preview-container">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Mail className="w-4 h-4 text-blue-600" />
        {t('settings.messageTemplates.preview.title')}
      </h4>

      <div className="email-preview-container border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        {/* Email header */}
        <div className="email-header bg-gray-50 dark:bg-slate-700 p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{tUi("journey:panels.sendTranscript.node.subjectLabel")}</span>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
              {template.subject || i18n.t('interface:fallbacks.emailSubject')}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{tUi("interface:templatepreview.from")}</span>
            <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              {tUi("adminSettings:email.placeholders.senderEmail")}</div>
          </div>
        </div>

        {/* Email body */}
        <div className="email-body p-4 bg-white dark:bg-slate-800 max-h-[400px] overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {template.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: template.content }}
                className="text-sm text-slate-900 dark:text-slate-100"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100 font-sans">
                {i18n.t('interface:fallbacks.emailTemplateContent', { syntax: '{{variable}}' })}
              </pre>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
        {t('settings.messageTemplates.preview.liquidDescription')}
      </p>
    </div>
  );
};

// Simple Text Preview (SMS, API, Telegram, Line)
const TextPreview: React.FC<{
  template: Partial<TemplateFormData>;
  channelType: string;
  t: (key: string) => string;
}> = ({ template, channelType, t }) => {
  const { t: tUi } = useUiTranslation();
  const getIcon = () => {
    if (channelType.includes('Sms')) return <Send className="w-4 h-4 text-purple-600" />;
    if (channelType.includes('Telegram')) return <Send className="w-4 h-4 text-blue-600" />;
    if (channelType.includes('Line')) return <MessageSquare className="w-4 h-4 text-green-600" />;
    return <Send className="w-4 h-4 text-gray-600" />;
  };

  const getChannelName = () => {
    if (channelType.includes('Sms')) return 'SMS';
    if (channelType.includes('Telegram')) return 'Telegram';
    if (channelType.includes('Line')) return 'Line';
    if (channelType.includes('Api')) return 'API';
    return 'Message';
  };

  return (
    <div className="template-preview-container">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        {getIcon()}
        {t('settings.messageTemplates.preview.title')} - {getChannelName()}
      </h4>

      <div className="text-preview-container border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        {/* Preview header */}
        <div className="preview-header bg-gray-50 dark:bg-slate-700 p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {getChannelName()} {tUi("interface:templatepreview.messagePreview")}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleTimeString(getFormattingLocale(), { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Message content */}
        <div className="message-content p-4 bg-white dark:bg-slate-800 max-h-[400px] overflow-y-auto">
          <div className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap font-sans">
            {template.content ||
              i18n.t('interface:fallbacks.messageTemplateContent', { syntax: '{{variable}}' })}
          </div>
        </div>

        {/* Character count (useful for SMS) */}
        {channelType.includes('Sms') && (
          <div className="preview-footer bg-gray-50 dark:bg-slate-700 p-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {tUi("interface:templatepreview.characters")} {template.content?.length || 0} / 160
              {(template.content?.length || 0) > 160 &&
                ` (${Math.ceil((template.content?.length || 0) / 160)} SMS messages)`}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
        {channelType.includes('Api')
          ? t('settings.messageTemplates.preview.apiDescription')
          : t('settings.messageTemplates.preview.description')}
      </p>
    </div>
  );
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, channelType, t }) => {
  const isStructured = usesStructuredComponents(channelType);

  // Email has its own preview
  if (channelType === 'Channel::Email') {
    return <EmailPreview template={template} t={t} />;
  }

  // WhatsApp, Instagram, Facebook use bubble preview
  if (isStructured) {
    return <BubblePreview template={template} t={t} />;
  }

  // SMS, API, Telegram, Line use simple text preview
  return <TextPreview template={template} channelType={channelType} t={t} />;
};
