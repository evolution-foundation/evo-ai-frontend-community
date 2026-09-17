import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import api from '@/services/core/api';
import { useLanguage } from '@/hooks/useLanguage';
import { TagInput } from '@/components/ai_agents/shared';

type Tab = 'manual' | 'upload' | 'url';

interface AddContentModalProps {
  knowledgeBaseId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddContentModal({
  knowledgeBaseId,
  onClose,
  onCreated,
}: AddContentModalProps) {
  const { t } = useLanguage('agents');
  const [tab, setTab] = useState<Tab>('manual');
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const [file, setFile] = useState<File | null>(null);

  const [url, setUrl] = useState('');
  const [includeSubpages, setIncludeSubpages] = useState(false);
  const [maxPages, setMaxPages] = useState(1);

  const [tags, setTags] = useState<string[]>([]);

  const tagsInput = (id: string) => (
    <TagInput
      id={id}
      label={t('knowledge.addContent.fields.tags')}
      hint={t('knowledge.addContent.fields.tagsHint')}
      value={tags}
      onChange={setTags}
      disabled={submitting}
    />
  );

  const withSubmitGuard = async (action: () => Promise<void>) => {
    setSubmitting(true);
    try {
      await action();
      onCreated();
    } catch (error) {
      console.error('Error adding knowledge content:', error);
      toast.error(t('knowledge.addContent.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitManual = () =>
    withSubmitGuard(async () => {
      await api.post(`/knowledge_bases/${knowledgeBaseId}/documents`, {
        knowledge_document: { title, description, content, tags },
      });
    });

  const submitUpload = () =>
    withSubmitGuard(async () => {
      if (!file) return;
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name);
      tags.forEach(tag => form.append('tags[]', tag));
      await api.post(`/knowledge_bases/${knowledgeBaseId}/documents/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

  const submitUrl = () =>
    withSubmitGuard(async () => {
      await api.post(`/knowledge_bases/${knowledgeBaseId}/documents/from_url`, {
        url,
        include_subpages: includeSubpages,
        max_pages: maxPages,
        tags,
      });
    });

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('knowledge.addContent.title')}</DialogTitle>
          <DialogDescription>{t('knowledge.addContent.description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={value => setTab(value as Tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">{t('knowledge.addContent.tabs.manual')}</TabsTrigger>
            <TabsTrigger value="upload">{t('knowledge.addContent.tabs.upload')}</TabsTrigger>
            <TabsTrigger value="url">{t('knowledge.addContent.tabs.url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-title">{t('knowledge.addContent.fields.title')}</Label>
              <Input
                id="knowledge-title"
                placeholder={t('knowledge.addContent.fields.title')}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-description">
                {t('knowledge.addContent.fields.description')}
              </Label>
              <Textarea
                id="knowledge-description"
                placeholder={t('knowledge.addContent.fields.description')}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-content">{t('knowledge.addContent.fields.content')}</Label>
              <Textarea
                id="knowledge-content"
                placeholder={t('knowledge.addContent.fields.content')}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
              />
            </div>
            {tagsInput('knowledge-manual-tags')}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t('knowledge.addContent.actions.cancel')}
              </Button>
              <Button onClick={submitManual} disabled={submitting || !title || !content}>
                {t('knowledge.addContent.actions.create')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-file">{t('knowledge.addContent.fields.file')}</Label>
              <Input
                id="knowledge-file"
                type="file"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {tagsInput('knowledge-upload-tags')}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t('knowledge.addContent.actions.cancel')}
              </Button>
              <Button onClick={submitUpload} disabled={submitting || !file}>
                {t('knowledge.addContent.actions.upload')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="url" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-url">{t('knowledge.addContent.fields.url')}</Label>
              <Input
                id="knowledge-url"
                placeholder="https://example.com/document"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="knowledge-include-subpages"
                type="checkbox"
                checked={includeSubpages}
                onChange={e => setIncludeSubpages(e.target.checked)}
              />
              <Label htmlFor="knowledge-include-subpages" className="font-normal">
                {t('knowledge.addContent.fields.includeSubpages')}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-max-pages">
                {t('knowledge.addContent.fields.maxPages')}
              </Label>
              <Input
                id="knowledge-max-pages"
                type="number"
                min={1}
                max={50}
                value={maxPages}
                onChange={e => setMaxPages(Number(e.target.value))}
              />
            </div>
            {tagsInput('knowledge-url-tags')}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t('knowledge.addContent.actions.cancel')}
              </Button>
              <Button onClick={submitUrl} disabled={submitting || !url}>
                {t('knowledge.addContent.actions.processUrl')}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
