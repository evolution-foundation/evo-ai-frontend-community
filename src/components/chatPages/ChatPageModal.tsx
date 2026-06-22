import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import type { ChatPage, ChatPagePayload, WebWidgetOption } from '@/types/chatPages';

interface ChatPageModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: ChatPagePayload) => void | Promise<void>;
  saving: boolean;
  initial: ChatPage | null;
  widgets: WebWidgetOption[];
}

const ChatPageModal = ({ open, onClose, onSave, saving, initial, widgets }: ChatPageModalProps) => {
  const { t } = useLanguage('chatPages');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [websiteToken, setWebsiteToken] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setPublished(initial?.published ?? false);
    setWebsiteToken(initial?.website_token ?? '');
    setPrimaryColor(initial?.appearance?.primary_color ?? '');
    setLogoUrl(initial?.appearance?.logo_url ?? '');
    setError(null);
  }, [open, initial]);

  // An edited page may reference a widget that is no longer listed (e.g. created
  // via console); keep its token selectable so editing never silently drops it.
  const widgetOptions: WebWidgetOption[] =
    websiteToken && !widgets.some(w => w.website_token === websiteToken)
      ? [...widgets, { inbox_id: websiteToken, name: t('modal.widget.unknown'), website_token: websiteToken }]
      : widgets;

  const handleSave = () => {
    setError(null);
    if (!websiteToken) return setError(t('modal.errors.widget'));

    const payload: ChatPagePayload = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      published,
      website_token: websiteToken,
      appearance: {
        primary_color: primaryColor || undefined,
        logo_url: logoUrl || undefined,
      },
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">{initial ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 py-4">
          <div className="space-y-6">
            {/* Básico */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.basic')}</h3>
              <div className="space-y-2">
                <Label>{t('modal.basic.title')}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('modal.basic.titlePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('modal.basic.description')}</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={published} onCheckedChange={setPublished} id="published" />
                <Label htmlFor="published">{t('modal.basic.published')}</Label>
              </div>
            </section>

            {/* Widget */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.widget')}</h3>
              <div className="space-y-2">
                <Label>{t('modal.widget.label')}</Label>
                <Select value={websiteToken || undefined} onValueChange={setWebsiteToken}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('modal.widget.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {widgetOptions.map(w => (
                      <SelectItem key={w.website_token} value={w.website_token}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {widgets.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('modal.widget.empty')}</p>
                )}
              </div>
            </section>

            {/* Aparência */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.appearance')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('modal.appearance.primaryColor')}</Label>
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#1f93ff" />
                </div>
                <div className="space-y-2">
                  <Label>{t('modal.appearance.logoUrl')}</Label>
                  <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
                {t('modal.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? t('modal.saving') : t('modal.save')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChatPageModal;
