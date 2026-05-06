import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Label,
  Avatar,
  AvatarFallback,
  Badge,
} from '@evoapi/design-system';
import { MessageSquare, Phone, Mail, Send, Loader2 } from 'lucide-react';
import { Contact, ContactableInboxes } from '@/types/contacts';
import { contactsService } from '@/services/contacts';
import { conversationAPI } from '@/services/conversations';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import { MessageTemplate } from '@/types/channels/inbox';
import { ConversationCreateData } from '@/types/chat/api';
import {
  getStatusBadgeKey,
  hasUnsupportedFormat,
  isTemplateSendable,
} from '../chat/message-template/templateStatus';

interface StartConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onConversationCreated?: (conversationId: string) => void;
}

export default function StartConversationModal({
  open,
  onOpenChange,
  contact,
}: StartConversationModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [availableInboxes, setAvailableInboxes] = useState<ContactableInboxes[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInboxes, setLoadingInboxes] = useState(false);

  const [messageTemplates, setMessageTemplate] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [enableMessage, setEnableMessage] = useState(false);

  // Check if selected inbox
  const selectedInbox = useMemo(() => {
    return availableInboxes.find(inbox => inbox.id.toString() === selectedInboxId);
  }, [availableInboxes, selectedInboxId]);

  const isEmailInbox = useMemo(() => {
    return selectedInbox?.channel_type === 'Channel::Email';
  }, [selectedInbox]);

  const isWhatsAppInbox = useMemo(() => {
    return selectedInbox?.channel_type === 'Channel::Whatsapp';
  }, [selectedInbox]);

  // Check if it's WhatsApp Cloud (requires template)
  const isWhatsAppCloud = useMemo(() => {
    if (!isWhatsAppInbox) return false;
    const provider = (selectedInbox?.channel.provider as string)?.toLowerCase();
    // WhatsApp Cloud providers (not baileys, evolution, evolution_go)
    return !provider || !['baileys', 'evolution', 'evolution_go'].includes(provider);
  }, [isWhatsAppInbox, selectedInbox]);

  const loadAvailableInboxes = useCallback(async () => {
    setLoadingInboxes(true);
    try {
      const inboxes = await contactsService.getContactableInboxes(contact.id);

      setAvailableInboxes(inboxes);

      // Auto-select first available inbox
      const firstAvailable = inboxes.find(
        (inbox: ContactableInboxes) => inbox.available && inbox.can_create_conversation,
      );
      if (firstAvailable) {
        setSelectedInboxId(firstAvailable.id.toString());
      }
    } catch (error) {
      console.error('Error loading contactable inboxes:', error);
      setAvailableInboxes([]);
    } finally {
      setLoadingInboxes(false);
    }
  }, [contact.id]);

  const loadMessageTemplate = useCallback(
    async (inboxId: string, cloudInbox: boolean, isCancelled: () => boolean) => {
      setLoadingTemplates(true);
      try {
        const response = await MessageTemplateService.getTemplates(inboxId);

        if (isCancelled()) return;

        const templates = response?.data || [];

        if (!cloudInbox) {
          setMessageTemplate(templates);
          return;
        }

        // Keep pending/unknown templates visible so the user can see why the flow
        // is blocked. Submit-time guard still requires isTemplateSendable(t).
        const visible = templates.filter(template => !hasUnsupportedFormat(template));
        setMessageTemplate(visible);
      } catch (error) {
        if (isCancelled()) return;
        console.error('Error loading templates:', error);
        setMessageTemplate([]);
      } finally {
        if (!isCancelled()) {
          setLoadingTemplates(false);
        }
      }
    },
    [],
  );

  // Load available inboxes when modal opens
  useEffect(() => {
    if (open) {
      loadAvailableInboxes();
    }
  }, [open, contact.id, loadAvailableInboxes]);

  // Load templates when inbox is selected
  useEffect(() => {
    setMessageTemplate([]);
    setSelectedTemplate(null);

    if (!selectedInboxId) {
      setUseTemplate(false);
      return;
    }

    // Only auto-enable template if it's WhatsApp Cloud (requires template)
    setUseTemplate(isWhatsAppCloud);

    let cancelled = false;
    loadMessageTemplate(selectedInboxId, isWhatsAppCloud, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [selectedInboxId, loadMessageTemplate, isWhatsAppCloud]);

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'Channel::Whatsapp':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'Channel::Email':
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'Channel::Sms':
        return <Phone className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelLabel = (channelType: string) => {
    switch (channelType) {
      case 'Channel::Whatsapp':
        return t('startConversation.channels.whatsapp');
      case 'Channel::Email':
        return t('startConversation.channels.email');
      case 'Channel::Sms':
        return t('startConversation.channels.sms');
      case 'Channel::WebWidget':
        return t('startConversation.channels.webWidget');
      case 'Channel::Api':
        return t('startConversation.channels.api');
      default:
        return channelType.replace('Channel::', '');
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const someTemplateParams = (): boolean => {
    return (
      Object.keys(templateParams).length > 0 && Object.values(templateParams).some(v => !v.trim())
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on mode
    if (!selectedInboxId) return;

    // WhatsApp Cloud requires a Meta-approved template.
    if (isWhatsAppCloud && !(selectedTemplate && isTemplateSendable(selectedTemplate))) return;

    // WhatsApp with template mode requires template selected
    if (isWhatsAppInbox && useTemplate && !selectedTemplate) return;

    // WhatsApp with template and variables requires all params filled
    if (isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) return;

    // Regular message requires content (when not using template)
    if (!isWhatsAppInbox && !useTemplate && !message.trim()) return;

    // WhatsApp free text (baileys, evolution) without template requires message
    if (isWhatsAppInbox && !isWhatsAppCloud && !useTemplate && !message.trim()) return;

    // Non-WhatsApp with template mode requires template selected
    if (!isWhatsAppInbox && useTemplate && !selectedTemplate) return;

    // Non-WhatsApp with template and variables requires all params filled
    if (!isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) return;

    setLoading(true);
    try {
      // Build conversation data - match Vue implementation structure
      const conversationData: ConversationCreateData = {
        contact_id: contact.id,
        inbox_id: selectedInboxId,
        source_id: selectedInbox?.source_id || '',
      };

      // Add message or template params
      // Backend will process templates (both WhatsApp and Email) based on template_params
      if (useTemplate && selectedTemplate) {
        conversationData.message = {
          content: '', // Backend will populate this from template
          template_params: {
            name: selectedTemplate.name,
            category: selectedTemplate.category || 'UTILITY',
            language: selectedTemplate.language,
            namespace: selectedTemplate.namespace || '',
            processed_params: templateParams,
          },
        };
      } else {
        // Regular message
        conversationData.message = {
          content: message.trim(),
        };
      }

      const data = await conversationAPI.create(conversationData);

      // Close modal and redirect to conversation
      if (data && data.id) {
        onOpenChange(false);

        // Redirect to conversation like the Vue frontend does
        window.location.href = `/conversations/${data.id}`;

        // Reset form
        setMessage('');
        setSelectedInboxId('');
        setUseTemplate(false);
        setSelectedTemplate(null);
        setTemplateParams({});
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setSelectedInboxId('');
    onOpenChange(false);
  };

  // Auto-disable template mode if no templates available (except WhatsApp Cloud)
  useEffect(() => {
    if (!isWhatsAppCloud && messageTemplates.length === 0 && useTemplate) {
      setUseTemplate(false);
      setSelectedTemplate(null);
      setTemplateParams({});
    }
  }, [messageTemplates.length, isWhatsAppCloud, useTemplate]);

  useEffect(() => {
    // Message is enabled when:
    // - Not WhatsApp Cloud
    // - Not WhatsApp with template mode

    if (!isWhatsAppCloud && !isWhatsAppInbox && !useTemplate) {
      setEnableMessage(true);
      return;
    }

    if (!isWhatsAppCloud && isWhatsAppInbox && !useTemplate) {
      setEnableMessage(true);
      return;
    }

    setEnableMessage(false);
  }, [isWhatsAppCloud, isWhatsAppInbox, useTemplate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('startConversation.title')}
          </DialogTitle>
          <DialogDescription>
            {t('startConversation.description', { name: contact.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={contact.name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getUserInitials(contact.name || 'NA')}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.name}</p>
              {contact.email && (
                <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
              )}
            </div>
          </div>

          {/* Inbox Selection */}
          <div className="space-y-2">
            <Label htmlFor="inbox">{t('startConversation.fields.channel.label')} *</Label>
            {loadingInboxes ? (
              <div className="flex items-center gap-2 p-3 rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {t('startConversation.loading.channels')}
                </span>
              </div>
            ) : availableInboxes.length === 0 ? (
              <div className="p-3 rounded-md border border-orange-200 bg-orange-50">
                <p className="text-sm text-orange-700">{t('startConversation.empty.noChannels')}</p>
              </div>
            ) : (
              <Select value={selectedInboxId} onValueChange={setSelectedInboxId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('startConversation.fields.channel.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableInboxes.map(inbox =>
                    inbox && inbox.id ? (
                      <SelectItem
                        key={inbox.id}
                        value={inbox.id.toString()}
                        disabled={!inbox.available || !inbox.can_create_conversation}
                      >
                        <div className="flex items-center gap-2">
                          {getChannelIcon(inbox.channel_type)}
                          <span>{inbox.name}</span>
                          <Badge
                            variant={inbox.available ? 'default' : 'secondary'}
                            className="ml-auto"
                          >
                            {getChannelLabel(inbox.channel_type)}
                          </Badge>
                          {!inbox.can_create_conversation && (
                            <span className="text-xs text-muted-foreground">
                              ({t('startConversation.unavailable')})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ) : null,
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* WhatsApp Cloud requires a Meta-approved template. Two warning states. */}
          {isWhatsAppCloud && !loadingTemplates && messageTemplates.length === 0 && (
            <div className="p-3 rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-400">
                ⚠️ {t('startConversation.templates.noneForInbox')}
              </p>
            </div>
          )}
          {isWhatsAppCloud &&
            !loadingTemplates &&
            messageTemplates.length > 0 &&
            messageTemplates.every(tpl => !isTemplateSendable(tpl)) && (
              <div className="p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ {t('startConversation.templates.noApproved')}
                </p>
              </div>
            )}

          {/* Template Selection */}
          {/* Always show template toggle for non-WhatsApp Cloud, even if no templates */}
          {(!isWhatsAppCloud || messageTemplates.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>{t('startConversation.toggle.label')}</Label>
                  {isWhatsAppCloud && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('startConversation.toggle.cloudRequires')}
                    </p>
                  )}
                </div>
                {!isWhatsAppCloud && (
                  <Button
                    type="button"
                    variant={useTemplate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setUseTemplate(!useTemplate);
                      if (useTemplate) {
                        setSelectedTemplate(null);
                        setTemplateParams({});
                      }
                    }}
                    disabled={loadingTemplates}
                  >
                    {useTemplate
                      ? t('startConversation.toggle.using')
                      : t('startConversation.toggle.label')}
                  </Button>
                )}
              </div>

              {useTemplate && (
                <div className="space-y-3 p-3 border rounded-lg">
                  {messageTemplates.length === 0 ? (
                    <div className="p-3 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        ⚠️ {t('startConversation.templates.noneForInbox')}
                      </p>
                    </div>
                  ) : !selectedTemplate ? (
                    <>
                      <Label>Selecione um Template</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {messageTemplates.map(template => {
                          let previewText = '';

                          if (isEmailInbox) {
                            // For email templates, try to get HTML preview
                            const metadata = template.metadata as
                              | Record<string, unknown>
                              | undefined;
                            if (
                              metadata?.html_content &&
                              typeof metadata.html_content === 'string'
                            ) {
                              // Extract text from HTML for preview
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = metadata.html_content;
                              previewText =
                                tempDiv.textContent ||
                                tempDiv.innerText ||
                                'Template de email visual';
                            } else if (template.content) {
                              const content = template.content.trim();
                              if (
                                content.startsWith('<!DOCTYPE') ||
                                content.startsWith('<html') ||
                                content.startsWith('<!doctype')
                              ) {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = content;
                                previewText =
                                  tempDiv.textContent || tempDiv.innerText || 'Template de email';
                              } else {
                                previewText = 'Template de email visual';
                              }
                            }
                          } else {
                            // For WhatsApp/other channels, use body component or content
                            // Handle both object format (WhatsApp Cloud) and array format (legacy)
                            const bodyComponent = Array.isArray(template.components)
                              ? template.components.find(c => c.type === 'BODY')
                              : template.components?.body;
                            previewText = bodyComponent?.text || template.content || '';
                          }

                          const cloudBadgeKey = isWhatsAppCloud
                            ? getStatusBadgeKey(template)
                            : null;
                          const showCloudBadge =
                            cloudBadgeKey !== null && cloudBadgeKey !== 'approved';

                          return (
                            <div
                              key={template.id}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                setSelectedTemplate(template);
                                // Extract variables from preview text
                                const variables = previewText.match(/\{\{(\w+)\}\}/g) || [];
                                const params: Record<string, string> = {};
                                variables.forEach((v: string) => {
                                  const key = v.replace(/\{\{|\}\}/g, '');
                                  params[key] = '';
                                });
                                setTemplateParams(params);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm">{template.name}</div>
                                {showCloudBadge && (
                                  <Badge variant="outline" className="text-xs">
                                    {t(
                                      `startConversation.templates.statusBadge.${cloudBadgeKey}`,
                                    )}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {previewText}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Template: {selectedTemplate.name}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(null);
                            setTemplateParams({});
                          }}
                        >
                          Trocar Template
                        </Button>
                      </div>

                      {isWhatsAppCloud && !isTemplateSendable(selectedTemplate) && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          {t('startConversation.templates.pendingSelectedHint')}
                        </p>
                      )}

                      {/* Template Variables */}
                      {Object.keys(templateParams).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm">Preencha as Variáveis</Label>
                          {Object.entries(templateParams).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="bg-muted text-muted-foreground inline-block rounded-md text-xs py-2 px-3 min-w-[50px] text-center font-medium">
                                {key}
                              </span>
                              <input
                                type="text"
                                value={value}
                                onChange={e =>
                                  setTemplateParams(prev => ({ ...prev, [key]: e.target.value }))
                                }
                                className="flex-1 h-9 px-3 text-sm rounded-md border border-input bg-background"
                                placeholder={`Valor para {{${key}}}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Preview of processed message */}
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
                        {isEmailInbox ? (
                          <div className="text-sm">
                            {(() => {
                              // For email templates, get HTML from metadata or content
                              const metadata = selectedTemplate.metadata as
                                | Record<string, unknown>
                                | undefined;
                              let html = '';

                              if (
                                metadata?.html_content &&
                                typeof metadata.html_content === 'string'
                              ) {
                                html = metadata.html_content;
                              } else if (selectedTemplate.content) {
                                const content = selectedTemplate.content.trim();
                                if (
                                  content.startsWith('<!DOCTYPE') ||
                                  content.startsWith('<html') ||
                                  content.startsWith('<!doctype')
                                ) {
                                  html = content;
                                } else {
                                  // JSON format - show message that HTML will be generated
                                  html =
                                    '<p style="color: #666;">Template de email visual. O HTML será gerado automaticamente.</p>';
                                }
                              }

                              // Replace template variables with actual values
                              Object.entries(templateParams).forEach(([key, val]) => {
                                html = html.replace(
                                  new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                                  val || `{{${key}}}`,
                                );
                              });

                              return (
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">
                            {(() => {
                              // Handle both object format (WhatsApp Cloud) and array format (legacy)
                              const bodyComponent = Array.isArray(selectedTemplate.components)
                                ? selectedTemplate.components.find(c => c.type === 'BODY')
                                : selectedTemplate.components?.body;
                              let text = bodyComponent?.text || selectedTemplate.content || '';
                              Object.entries(templateParams).forEach(([key, val]) => {
                                text = text.replace(
                                  new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                                  val || `{{${key}}}`,
                                );
                              });
                              return text;
                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message (hidden when using WhatsApp template or WhatsApp Cloud) */}
          {enableMessage && (
            <div className="space-y-2">
              <Label htmlFor="message">{t('startConversation.fields.message.label')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('startConversation.fields.message.placeholder')}
                rows={4}
                required={!(isWhatsAppInbox && useTemplate)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('startConversation.fields.message.characters', { count: message.length })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              {t('startConversation.actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={Boolean(
                loading ||
                  !selectedInboxId ||
                  availableInboxes.length === 0 ||
                  // WhatsApp Cloud requires a Meta-approved template
                  (isWhatsAppCloud &&
                    !(selectedTemplate && isTemplateSendable(selectedTemplate))) ||
                  // WhatsApp with template mode requires template selected
                  (isWhatsAppInbox && useTemplate && !selectedTemplate) ||
                  // WhatsApp with template and variables requires all params filled
                  (isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) ||
                  // Regular message requires content
                  (!isWhatsAppInbox && !useTemplate && !message.trim()) ||
                  // WhatsApp free text (baileys, evolution) without template requires message
                  (isWhatsAppInbox && !isWhatsAppCloud && !useTemplate && !message.trim()) ||
                  // Non-WhatsApp with template mode requires template selected
                  (!isWhatsAppInbox && useTemplate && !selectedTemplate) ||
                  // Non-WhatsApp with template and variables requires all params filled
                  (!isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()),
              )}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('startConversation.actions.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('startConversation.actions.send')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
