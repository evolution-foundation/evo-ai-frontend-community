import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Switch,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import { Plus, Trash2, Smile, Braces } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import MessageTemplateService, {
  usesStructuredComponents,
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import EmojiPicker from '@/components/chat/message-input/EmojiPicker';
import { TemplatePreview } from './TemplatePreview';
import { MessageTemplate, TemplateFormData } from '@/types';
import { detectTemplateFormVariables } from '@/utils/templateVariables';
import type { MessageTemplateVariable } from '@/types/channels/inbox';

/**
 * Message textarea with an emoji picker and a `{{ }}` variable inserter,
 * mirroring the chat composer affordances. Both insert at the caret; the typed
 * `{{name}}` tokens are then auto-detected into the variable rows below.
 */
const MessageTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  emojiLabel?: string;
  variableLabel?: string;
  variableHelpText?: string;
  variableSampleName?: string;
}> = ({
  value,
  onChange,
  placeholder,
  rows = 6,
  emojiLabel,
  variableLabel,
  variableHelpText,
  variableSampleName,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Insert `snippet` at the caret. If `selFrom`/`selTo` are given, select that
  // sub-range of the inserted text (used to preselect a variable name so the user
  // can overtype it); otherwise place the caret right after the insertion.
  const insertAtCursor = (snippet: string, selFrom?: number, selTo?: number) => {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      if (selFrom != null && selTo != null) {
        ta.setSelectionRange(start + selFrom, start + selTo);
      } else {
        const pos = start + snippet.length;
        ta.setSelectionRange(pos, pos);
      }
    });
  };

  // Variables are optional: insert a NAMED placeholder (never an empty `{{}}`) and
  // preselect the name so the user can type over it — keeps the auto-detection happy.
  const insertVariable = () => {
    const name = variableSampleName || 'variable';
    insertAtCursor(`{{${name}}}`, 2, 2 + name.length);
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="pr-20"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={emojiLabel}
            title={emojiLabel}
            onClick={() => setEmojiOpen(open => !open)}
          >
            <Smile className="h-4 w-4" />
          </Button>
          <EmojiPicker
            isOpen={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onEmojiSelect={emoji => insertAtCursor(emoji)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label={variableLabel}
              title={variableLabel}
            >
              <Braces className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            {variableHelpText && (
              <p className="text-xs text-muted-foreground">{variableHelpText}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={insertVariable}
            >
              <Braces className="h-4 w-4 mr-2" />
              {variableLabel}
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

interface TemplateFormModalProps {
  isOpen: boolean;
  template?: MessageTemplate;
  onClose: () => void;
  onSave: (template: TemplateFormData) => void;
  mode: 'create' | 'edit';
  /**
   * Drives the field config: structured channels (WhatsApp/FB/IG) render the
   * header/body/footer/buttons editor; everything else renders the simple
   * content editor (+ email subject). For the global screen this is the
   * synthetic channel for the chosen provider (`Channel::Api` / `Channel::Email`).
   */
  channelType: string;
  /** Default language for a new template. Defaults to `en_US`; the global screen passes `pt_BR`. */
  defaultLanguage?: string;
  /**
   * Optional in-modal channel/provider selector (global screen only). Each option's
   * `value` is a `channelType`; selecting one calls `onChannelTypeChange`, which the
   * parent uses to update the controlled `channelType`. Disabled in edit mode (the
   * provider of an existing template cannot change). When omitted, no selector renders
   * and `channelType` is fixed (per-inbox scope).
   */
  channelOptions?: Array<{ value: string; label: string }>;
  /** Field label for the channel/provider selector (parent-supplied to keep this modal namespace-agnostic). */
  channelSelectLabel?: string;
  onChannelTypeChange?: (channelType: string) => void;
  /** Message shown when a channel/provider switch resets an unsupported category (parent-supplied). */
  categoryResetMessage?: string;
  /** Label for the "no header" option in the header-type selector (parent-supplied). */
  headerNoneLabel?: string;
  /** Helper text rendered under the Category selector (parent-supplied). */
  categoryHelp?: string;
  /** Accessible label/tooltip for the emoji button in the message editor. */
  insertEmojiLabel?: string;
  /** Accessible label/tooltip + insert-button label for the variable helper in the message editor. */
  insertVariableLabel?: string;
  /** Informative text shown in the variable helper popover ("variables are optional…"). */
  variableHelpText?: string;
  /** Placeholder name inserted by the variable helper (preselected for overtype). */
  variableSampleName?: string;
}

/**
 * Shared message-template form modal — the single editor reused by both the
 * per-inbox channel flow and the global Settings → Message Templates screen
 * (EVO-1907). Extracted verbatim from the former `MessageTemplateForm` inner
 * modal so there is exactly one rich form (structured WhatsApp components, live
 * preview, variable detection). Owns its own i18n on the `channels` namespace so
 * it carries the already-translated `settings.messageTemplates.*` keys without
 * duplication.
 */
const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  mode,
  channelType,
  defaultLanguage = 'en_US',
  channelOptions,
  channelSelectLabel,
  onChannelTypeChange,
  categoryResetMessage,
  headerNoneLabel,
  categoryHelp,
  insertEmojiLabel,
  insertVariableLabel,
  variableHelpText,
  variableSampleName,
}) => {
  const { t } = useLanguage('channels');
  // Memoise on channelType so the category-revalidation effect below fires only
  // on an actual channel/provider change, not on every render.
  const channelConfig = useMemo(() => getChannelTemplateConfig(channelType), [channelType]);
  const isStructured = useMemo(() => usesStructuredComponents(channelType), [channelType]);

  const buildEmptyForm = useCallback(
    (): TemplateFormData => ({
      name: '',
      content: '',
      language: defaultLanguage,
      category: (channelConfig.categories[0] as TemplateFormData['category']) || 'MARKETING',
      template_type:
        (channelConfig.templateTypes[0] as TemplateFormData['template_type']) || 'text',
      active: true,
      // Structured fields — header defaults to "none" (matches the template editor mockup).
      headerFormat: 'NONE',
      headerText: '',
      bodyText: '',
      footerText: '',
      buttons: [],
    }),
    [channelConfig, defaultLanguage],
  );

  const [formData, setFormData] = useState<TemplateFormData>(buildEmptyForm);

  const detectedVariables = useMemo(() => detectTemplateFormVariables(formData), [formData]);

  useEffect(() => {
    setFormData(prev => {
      const currentByName = new Map((prev.variables ?? []).map(variable => [variable.name, variable]));
      const nextVariables = detectedVariables.map(variable => ({
        ...variable,
        ...currentByName.get(variable.name),
      }));

      const changed =
        nextVariables.length !== (prev.variables ?? []).length ||
        nextVariables.some((variable, index) => variable.name !== prev.variables?.[index]?.name);

      return changed ? { ...prev, variables: nextVariables } : prev;
    });
  }, [detectedVariables]);

  // (Re)initialise when the modal opens or the target template changes.
  // Deliberately NOT keyed on channelType: switching the provider mid-edit in the
  // global screen must preserve the user's input (EVO-1907 F3). Category coherence
  // is handled by the effect below.
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && template) {
      setFormData(MessageTemplateService.transformToFrontendFormat(template, channelType));
    } else {
      setFormData(buildEmptyForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, template]);

  // Keep the category valid when channelType changes (provider switch): the
  // allowed list can shrink (e.g. email -> generic). The functional update reads
  // the latest form, so name/content/variables survive the switch.
  useEffect(() => {
    setFormData(prev => {
      if (channelConfig.categories.includes(prev.category ?? '')) return prev;
      toast.info(categoryResetMessage ?? t('settings.messageTemplates.form.categoryReset'));
      return { ...prev, category: channelConfig.categories[0] as TemplateFormData['category'] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelType]);

  const handleSave = () => {
    // Validate based on channel type
    if (isStructured) {
      if (!formData.name.trim() || !formData.bodyText?.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    } else {
      if (!formData.name.trim() || !formData.content.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { type: 'QUICK_REPLY', text: '' }],
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons:
        prev.buttons?.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)) || [],
    }));
  };

  const updateVariable = (name: string, patch: Partial<MessageTemplateVariable>) => {
    setFormData(prev => ({
      ...prev,
      variables: (prev.variables ?? []).map(variable =>
        variable.name === name ? { ...variable, ...patch } : variable,
      ),
    }));
  };

  const isFormValid = isStructured
    ? formData.name.trim() && formData.bodyText?.trim()
    : formData.name.trim() && formData.content.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-hidden"
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Form */}
          <div className="space-y-4">
            {/* Optional channel/provider selector (global screen only) */}
            {channelOptions && channelOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{channelSelectLabel}</label>
                <Select
                  value={channelType}
                  onValueChange={value => onChannelTypeChange?.(value)}
                  disabled={mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
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
                {categoryHelp && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{categoryHelp}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.templateType')}
                </label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      template_type: value as TemplateFormData['template_type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelConfig.templateTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {t(`settings.messageTemplates.form.templateTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Structured Components (WhatsApp, Facebook, Instagram) */}
            {isStructured && channelConfig.supportsStructured && (
              <>
                {/* Header */}
                {channelConfig.supportsMedia && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium mb-2">
                        {t('settings.messageTemplates.form.headerFormat')}
                      </label>
                      <Select
                        value={formData.headerFormat}
                        onValueChange={(value: string) =>
                          setFormData(prev => ({
                            ...prev,
                            headerFormat: value as TemplateFormData['headerFormat'],
                            // No header → drop any previously typed header text so it
                            // is not folded into the stored content.
                            ...(value === 'NONE' ? { headerText: '' } : {}),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">
                            {headerNoneLabel ?? t('settings.messageTemplates.form.headerFormats.none')}
                          </SelectItem>
                          <SelectItem value="TEXT">
                            {t('settings.messageTemplates.form.headerFormats.text')}
                          </SelectItem>
                          <SelectItem value="IMAGE">
                            {t('settings.messageTemplates.form.headerFormats.image')}
                          </SelectItem>
                          <SelectItem value="VIDEO">
                            {t('settings.messageTemplates.form.headerFormats.video')}
                          </SelectItem>
                          <SelectItem value="DOCUMENT">
                            {t('settings.messageTemplates.form.headerFormats.document')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.headerFormat === 'TEXT' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          {t('settings.messageTemplates.form.headerText')}
                        </label>
                        <Input
                          value={formData.headerText}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, headerText: e.target.value }))
                          }
                          placeholder={t('settings.messageTemplates.form.headerTextPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.bodyText')}
                  </label>
                  <MessageTextarea
                    value={formData.bodyText ?? ''}
                    onChange={value => setFormData(prev => ({ ...prev, bodyText: value }))}
                    placeholder={t('settings.messageTemplates.form.bodyTextPlaceholder')}
                    rows={4}
                    emojiLabel={insertEmojiLabel}
                    variableLabel={insertVariableLabel}
                    variableHelpText={variableHelpText}
                    variableSampleName={variableSampleName}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.variablesHelp')}
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.footerText')}
                  </label>
                  <Input
                    value={formData.footerText}
                    onChange={e => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.footerTextPlaceholder')}
                  />
                </div>

                {/* Buttons */}
                {channelConfig.supportsButtons && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        {t('settings.messageTemplates.form.buttons')}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addButton}
                        disabled={(formData.buttons?.length || 0) >= 3}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('settings.messageTemplates.form.addButton')}
                      </Button>
                    </div>

                    {formData.buttons?.map((button, index) => (
                      <Card key={index} className="p-3 mb-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Select
                            value={button.type}
                            onValueChange={(value: string) => updateButton(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">
                                {t('settings.messageTemplates.form.buttonTypes.quickReply')}
                              </SelectItem>
                              <SelectItem value="URL">
                                {t('settings.messageTemplates.form.buttonTypes.url')}
                              </SelectItem>
                              <SelectItem value="PHONE_NUMBER">
                                {t('settings.messageTemplates.form.buttonTypes.phone')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeButton(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <Input
                          value={button.text}
                          onChange={e => updateButton(index, 'text', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.buttonTextPlaceholder')}
                          className="mb-2"
                        />

                        {button.type === 'URL' && (
                          <Input
                            value={button.url || ''}
                            onChange={e => updateButton(index, 'url', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.urlPlaceholder')}
                          />
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <Input
                            value={button.phone_number || ''}
                            onChange={e => updateButton(index, 'phoneNumber', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.phonePlaceholder')}
                          />
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Email-specific fields */}
            {channelType === 'Channel::Email' && (
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
            )}

            {/* Simple Text Content (SMS, API, Telegram, Line) */}
            {/* Note: Email templates are edited in a dedicated page, not in this modal */}
            {!isStructured && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.content')}
                </label>
                <MessageTextarea
                  value={formData.content}
                  onChange={value => setFormData(prev => ({ ...prev, content: value }))}
                  placeholder={t('settings.messageTemplates.form.contentPlaceholder')}
                  rows={6}
                  emojiLabel={insertEmojiLabel}
                  variableLabel={insertVariableLabel}
                  variableHelpText={variableHelpText}
                  variableSampleName={variableSampleName}
                />
                {channelConfig.usesLiquid && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.liquidHelp')}
                  </p>
                )}
              </div>
            )}

            {(formData.variables?.length ?? 0) > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.variables')}
                </label>
                {formData.variables?.map(variable => (
                  <div key={variable.name} className="grid grid-cols-4 gap-2">
                    <Input value={variable.name} disabled />
                    <Input
                      value={variable.label ?? ''}
                      onChange={e => updateVariable(variable.name, { label: e.target.value })}
                      placeholder={t('settings.messageTemplates.form.variableLabel')}
                    />
                    <Input
                      value={variable.example ?? ''}
                      onChange={e => updateVariable(variable.name, { example: e.target.value })}
                      placeholder={t('settings.messageTemplates.form.variableExample')}
                    />
                    <Input
                      value={variable.source ?? ''}
                      onChange={e => updateVariable(variable.name, { source: e.target.value })}
                      placeholder={t('settings.messageTemplates.form.variableSource')}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.active')}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('settings.messageTemplates.form.activeHelp')}
                </p>
              </div>
              <Switch
                checked={formData.active !== false}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          {/* Preview - Sticky on larger screens */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <TemplatePreview template={formData} channelType={channelType} t={t} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('settings.messageTemplates.form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {mode === 'create'
              ? t('settings.messageTemplates.form.create')
              : t('settings.messageTemplates.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateFormModal;
