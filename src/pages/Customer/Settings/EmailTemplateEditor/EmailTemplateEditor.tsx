import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@evoapi/design-system';
import { ArrowLeft, Save } from 'lucide-react';
import EmailEditorComponent, { EditorRef } from 'react-email-editor';
import { useLanguage } from '@/hooks/useLanguage';
import BaseHeader from '@/components/base/BaseHeader';
import MessageTemplateService, {
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import { TemplateFormData } from '@/types/channels/inbox';

const EmailTemplateEditor: React.FC = () => {
  const { t: tUi } = useUiTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, currentLanguage } = useLanguage('channels');

  const inboxId = searchParams.get('inboxId') || '';
  const templateId = searchParams.get('templateId') || '';
  const channelType = searchParams.get('channelType') || 'Channel::Email';
  const mode = templateId ? 'edit' : 'create';

  const emailEditorRef = useRef<EditorRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLegacyHtml, setIsLegacyHtml] = useState(false);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    subject: '',
    language: 'en_US',
    category: 'MARKETING',
    template_type: 'text',
    active: true,
    headerFormat: 'TEXT',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
  });

  const channelConfig = getChannelTemplateConfig(channelType);

  // Helper to detect if content is HTML or JSON
  const isHtmlContent = useCallback((content: string): boolean => {
    if (!content || !content.trim()) return false;
    const trimmed = content.trim();
    return (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML')
    );
  }, []);

  // Load template if editing
  useEffect(() => {
    if (mode === 'edit' && templateId && inboxId) {
      setIsLoading(true);
      MessageTemplateService.getTemplates(inboxId)
        .then(response => {
          const template = response.data.find(t => t.id === templateId);
          if (template) {
            const converted = MessageTemplateService.transformToFrontendFormat(
              template,
              channelType,
            );

            // Check if we have design JSON in metadata (new format) or content is HTML (legacy)
            if (converted.metadata?.design_json) {
              // New format: design JSON is in metadata, use it for content
              setFormData({
                ...converted,
                content: JSON.stringify(converted.metadata.design_json),
              });
              setIsLegacyHtml(false);
            } else if (converted.content && isHtmlContent(converted.content)) {
              // Legacy format: HTML in content
              setFormData(converted);
              setIsLegacyHtml(true);
            } else {
              // Try to parse as JSON design (might be JSON string in content)
              try {
                JSON.parse(converted.content);
                setFormData(converted);
                setIsLegacyHtml(false);
              } catch {
                // Not JSON, treat as legacy HTML
                setFormData(converted);
                setIsLegacyHtml(true);
              }
            }
          }
        })
        .catch(error => {
          console.error('Error loading template:', error);
          toast.error(t('settings.messageTemplates.errors.loadError'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [mode, templateId, inboxId, channelType, t, isHtmlContent]);

  // Handle editor ready
  const onReady = useCallback(() => {
    if (!emailEditorRef.current?.editor) return;

    // Load design if content exists
    if (formData.content) {
      // Check if content is HTML (legacy) or JSON (new format)
      if (isHtmlContent(formData.content)) {
        // Legacy HTML content - cannot load into editor
        // Show warning and mark as legacy HTML
        setIsLegacyHtml(true);
        console.warn('Template contains HTML (legacy format). Cannot load into visual editor.');
        toast.warning(
          t('settings.messageTemplates.editor.legacyHtmlWarning'),
        );
        // Start with empty editor - user can recreate the template visually
      } else {
        setIsLegacyHtml(false);
        // Try to parse as JSON design (new format)
        try {
          const design = JSON.parse(formData.content);
          if (design && typeof design === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (emailEditorRef.current.editor as any).loadDesign(design);
          }
        } catch (error) {
          // Invalid JSON - start with empty editor
          console.warn('Content is not valid JSON design:', error);
          toast.warning(
            t('settings.messageTemplates.editor.invalidContentWarning'),
          );
        }
      }
    }

    // Mark editor as ready immediately - onReady callback means editor is ready
    setIsEditorReady(true);
  }, [formData.content, isHtmlContent, t]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error(t('settings.messageTemplates.errors.requiredFields'));
      return;
    }

    if (!isEditorReady || !emailEditorRef.current?.editor) {
      toast.error(t('settings.messageTemplates.editor.editorNotReady'));
      return;
    }

    setIsSaving(true);

    try {
      // Export both design JSON and HTML from editor
      // Design JSON is needed to load back into editor for editing
      // HTML is needed for sending emails
      emailEditorRef.current.editor.exportHtml((data: { design: unknown; html: string }) => {
        const { design, html } = data;

        // Save design JSON in content (for editing) and HTML in metadata (for sending)
        // This way we can load the JSON back into the editor AND use HTML for email sending
        const templateData: TemplateFormData = {
          ...formData,
          content: JSON.stringify(design), // Design JSON for editor
          metadata: {
            ...formData.metadata,
            html_content: html, // HTML for email sending
            design_json: design, // Also save design JSON in metadata as backup
          },
        };

        if (mode === 'create') {
          MessageTemplateService.createTemplate(inboxId, templateData, channelType)
            .then(() => {
              toast.success(t('settings.messageTemplates.success.createSuccess'));
              navigate(-1); // Go back
            })
            .catch(error => {
              console.error('Error creating template:', error);
              toast.error(t('settings.messageTemplates.errors.createError'));
            })
            .finally(() => {
              setIsSaving(false);
            });
        } else {
          if (!templateId) {
            toast.error(t('settings.messageTemplates.editor.incompleteData'));
            setIsSaving(false);
            return;
          }

          MessageTemplateService.updateTemplate(inboxId, templateId, templateData, channelType)
            .then(() => {
              toast.success(t('settings.messageTemplates.success.updateSuccess'));
              navigate(-1); // Go back
            })
            .catch(error => {
              console.error('Error updating template:', error);
              toast.error(t('settings.messageTemplates.errors.updateError'));
            })
            .finally(() => {
              setIsSaving(false);
            });
        }
      });
    } catch (error) {
      console.error('Error exporting HTML:', error);
      toast.error(t('settings.messageTemplates.editor.exportError'));
      setIsSaving(false);
    }
  }, [formData, isEditorReady, mode, inboxId, channelType, templateId, navigate, t]);

  // Editor options
  const editorOptions = {
    minHeight: '100%',
    locale: currentLanguage,
    appearance: {
      theme: 'dark' as const,
      panels: {
        tools: {
          dock: 'left' as const,
        },
      },
    },
    features: {
      preview: true,
      stockImages: true,
    },
    tools: {
      form: { enabled: true },
      button: { enabled: true },
      divider: { enabled: true },
      image: { enabled: true },
      social: { enabled: true },
      spacer: { enabled: true },
      text: { enabled: true },
    },
    customJS: [],
    customCSS: [],
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-4">
        <BaseHeader
          title={
            mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')
          }
          subtitle={t('settings.messageTemplates.editor.subtitle')}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sidebar-foreground/60">
              {t('settings.messageTemplates.editor.loadingTemplate')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <BaseHeader
            title={
              mode === 'create'
                ? t('settings.messageTemplates.form.createTitle')
                : t('settings.messageTemplates.form.editTitle')
            }
            subtitle={t('settings.messageTemplates.editor.subtitle')}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('settings.messageTemplates.editor.back')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isEditorReady}
              loading={isSaving}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create'
                ? t('settings.messageTemplates.form.create')
                : t('settings.messageTemplates.form.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
        {/* Left Sidebar - Form Fields */}
        <div className="w-80 flex-shrink-0 overflow-y-auto pr-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('settings.messageTemplates.editor.templateInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.namePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.category')}
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) =>
                      setFormData(prev => ({
                        ...prev,
                        category: value as TemplateFormData['category'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channelConfig.categories.map((cat: string) => (
                        <SelectItem key={cat} value={cat}>
                          {t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.language')}
                  </label>
                  <Select
                    value={formData.language}
                    onValueChange={value => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt_BR">Português (BR)</SelectItem>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="es_ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.subject')}
                </label>
                <Input
                  value={formData.subject || ''}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.subjectPlaceholder')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium">
                    {t('settings.messageTemplates.form.active')}
                  </label>
                  <p className="text-xs text-gray-500">
                    {t('settings.messageTemplates.form.activeHelp')}
                  </p>
                </div>
                <Switch
                  checked={formData.active !== false}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
                />
              </div>

              {channelConfig.usesLiquid && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {t('settings.messageTemplates.form.liquidHelp')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor Area */}
        <div
          className="flex-1 bg-background rounded-lg shadow-sm overflow-hidden border border-border flex flex-col"
          style={{ position: 'relative', minHeight: 0 }}
        >
          {!isEditorReady && !isLegacyHtml && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sidebar-foreground/60">
                  {t('settings.messageTemplates.editor.loadingEditor')}
                </p>
              </div>
            </div>
          )}
          {isLegacyHtml && isEditorReady ? (
            // Show HTML preview for legacy templates
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-sidebar-foreground">
                      {t('settings.messageTemplates.editor.htmlPreview')}
                    </h3>
                    <p className="text-xs text-sidebar-foreground/60 mt-1">
                      {t('settings.messageTemplates.editor.htmlPreviewDescription')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLegacyHtml(false);
                      // Clear content to start fresh
                      setFormData(prev => ({ ...prev, content: '' }));
                    }}
                  >
                    {t('settings.messageTemplates.editor.startVisualEdit')}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="email-preview-container border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-800 max-w-2xl mx-auto">
                  {/* Email header */}
                  <div className="email-header bg-gray-50 dark:bg-slate-700 p-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{tUi("journey:panels.sendTranscript.node.subjectLabel")}</span>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                        {formData.subject || i18n.t('interface:fallbacks.emailSubject')}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{tUi("interface:emailtemplateeditor.from")}</span>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {tUi("adminSettings:email.placeholders.senderEmail")}</div>
                    </div>
                  </div>

                  {/* Email body with HTML content */}
                  <div className="email-body p-4 bg-white dark:bg-slate-800">
                    <div
                      dangerouslySetInnerHTML={{ __html: formData.content }}
                      className="text-sm text-slate-900 dark:text-slate-100"
                      style={{
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 p-4 border-t border-border">
                <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
                  <EmailEditorComponent
                    ref={emailEditorRef}
                    onReady={onReady}
                    options={editorOptions}
                    style={{ height: '400px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
              <EmailEditorComponent
                ref={emailEditorRef}
                onReady={onReady}
                options={editorOptions}
                style={{ height: '100vh', width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
