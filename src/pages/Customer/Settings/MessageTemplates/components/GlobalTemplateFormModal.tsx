import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { getChannelTemplateConfig } from '@/services/channels/messageTemplatesService';
import {
  providerToChannelType,
  type GlobalTemplateProvider,
} from '@/services/messageTemplates/globalMessageTemplatesService';
import { extractTemplateFormVariables } from '@/utils/templateVariables';
import type { MessageTemplate, MessageTemplateVariable, TemplateFormData } from '@/types';

interface GlobalTemplateFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  /** Existing template (edit mode) + its resolved provider. */
  template?: MessageTemplate;
  initialProvider?: GlobalTemplateProvider;
  onClose: () => void;
  onSave: (formData: TemplateFormData, provider: GlobalTemplateProvider) => void;
}

const emptyForm = (category: string, templateType: string): TemplateFormData => ({
  name: '',
  content: '',
  language: 'pt_BR',
  category: category as TemplateFormData['category'],
  template_type: templateType as TemplateFormData['template_type'],
  active: true,
  variables: [],
});

const GlobalTemplateFormModal: React.FC<GlobalTemplateFormModalProps> = ({
  isOpen,
  mode,
  template,
  initialProvider = 'generic',
  onClose,
  onSave,
}) => {
  const { t } = useLanguage('messageTemplates');
  const [provider, setProvider] = useState<GlobalTemplateProvider>(initialProvider);

  // Synthetic channel drives the (non-structured) field config for the chosen
  // provider. generic -> Channel::Api (TRANSACTIONAL only); email -> Channel::Email.
  const channelConfig = useMemo(
    () => getChannelTemplateConfig(providerToChannelType(provider)),
    [provider],
  );

  const [formData, setFormData] = useState<TemplateFormData>(() =>
    emptyForm(channelConfig.categories[0], channelConfig.templateTypes[0]),
  );

  // Detect {{variables}} from the content and keep the editable variable rows in
  // sync (preserving any label/example/source the user already typed). Depend
  // only on the scanned content field — depending on the whole formData would
  // create a setState feedback edge that only avoids looping via referential
  // bail-out.
  const detectedVariables = useMemo(
    () => extractTemplateFormVariables(formData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.content],
  );

  useEffect(() => {
    setFormData(prev => {
      const byName = new Map((prev.variables ?? []).map(v => [v.name, v]));
      const next = detectedVariables.map(v => ({ ...v, ...byName.get(v.name) }));
      const changed =
        next.length !== (prev.variables ?? []).length ||
        next.some((v, i) => v.name !== prev.variables?.[i]?.name);
      return changed ? { ...prev, variables: next } : prev;
    });
  }, [detectedVariables]);

  // (Re)initialise the form when the modal opens or the target template changes.
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && template) {
      setProvider(initialProvider);
      setFormData({
        name: template.name,
        content: template.content ?? '',
        language: template.language,
        category: template.category,
        template_type: template.template_type,
        active: template.active !== false,
        subject: (template.settings?.subject as string | undefined) ?? undefined,
        variables: (template.variables as MessageTemplateVariable[] | undefined) ?? [],
        settings: template.settings,
        metadata: template.metadata,
      });
    } else {
      setProvider(initialProvider);
      setFormData(emptyForm(channelConfig.categories[0], channelConfig.templateTypes[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, template, initialProvider]);

  // When the provider changes in create mode, keep the category valid for the
  // new provider (its allowed list can shrink, e.g. email -> generic).
  const handleProviderChange = (value: string) => {
    const next = value as GlobalTemplateProvider;
    setProvider(next);
    const cfg = getChannelTemplateConfig(providerToChannelType(next));
    setFormData(prev => {
      const stillValid = cfg.categories.includes(prev.category ?? '');
      if (!stillValid) {
        // The category list shrinks across providers; let the user know their
        // selection was reset rather than silently rewriting it.
        toast.info(t('form.categoryReset'));
      }
      return {
        ...prev,
        category: stillValid
          ? prev.category
          : (cfg.categories[0] as TemplateFormData['category']),
      };
    });
  };

  const updateVariable = (name: string, patch: Partial<MessageTemplateVariable>) => {
    setFormData(prev => ({
      ...prev,
      variables: (prev.variables ?? []).map(v => (v.name === name ? { ...v, ...patch } : v)),
    }));
  };

  const isValid = formData.name.trim().length > 0 && formData.content.trim().length > 0;

  const handleSave = () => {
    if (!isValid) {
      toast.error(t('form.errors.requiredFields'));
      return;
    }
    onSave(formData, provider);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('form.createTitle') : t('form.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.provider')}</label>
              <Select
                value={provider}
                onValueChange={handleProviderChange}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">{t('form.providers.generic')}</SelectItem>
                  <SelectItem value="email">{t('form.providers.email')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.name')}</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('form.namePlaceholder')}
              />
            </div>
          </div>

          {/* Category + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.category')}</label>
              <Select
                value={formData.category}
                onValueChange={value =>
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
                      {t(`form.categories.${cat.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.language')}</label>
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

          {/* Email subject */}
          {provider === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.subject')}</label>
              <Input
                value={formData.subject || ''}
                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={t('form.subjectPlaceholder')}
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('form.content')}</label>
            <Textarea
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder={t('form.contentPlaceholder')}
              rows={6}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('form.variablesHelp')}</p>
          </div>

          {/* Detected variables */}
          {(formData.variables?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">{t('form.variables')}</label>
              {formData.variables?.map(variable => (
                <div key={variable.name} className="grid grid-cols-4 gap-2">
                  <Input value={variable.name} disabled />
                  <Input
                    value={variable.label ?? ''}
                    onChange={e => updateVariable(variable.name, { label: e.target.value })}
                    placeholder={t('form.variableLabel')}
                  />
                  <Input
                    value={variable.example ?? ''}
                    onChange={e => updateVariable(variable.name, { example: e.target.value })}
                    placeholder={t('form.variableExample')}
                  />
                  <Input
                    value={variable.source ?? ''}
                    onChange={e => updateVariable(variable.name, { source: e.target.value })}
                    placeholder={t('form.variableSource')}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Active */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <label className="block text-sm font-medium">{t('form.active')}</label>
              <p className="text-xs text-muted-foreground">{t('form.activeHelp')}</p>
            </div>
            <Switch
              checked={formData.active !== false}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {mode === 'create' ? t('form.create') : t('form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalTemplateFormModal;
