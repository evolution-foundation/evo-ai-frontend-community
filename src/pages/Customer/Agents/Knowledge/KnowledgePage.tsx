import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input } from '@evoapi/design-system';
import { useKnowledgeDocuments, KnowledgeDocument } from '@/hooks/useKnowledgeDocuments';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyState from '@/components/base/EmptyState';
import { AgentsTabsLayout } from '@/components/agents';
import AddContentModal from './AddContentModal';

const STATUS_BADGE_VARIANT: Record<KnowledgeDocument['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  processing: 'secondary',
  crawling: 'secondary',
  failed: 'destructive',
};

export default function KnowledgePage() {
  const { t } = useLanguage('agents');
  const { knowledgeBases } = useKnowledgeBases();
  const activeKnowledgeBaseId = knowledgeBases.find(kb => kb.default)?.id ?? knowledgeBases[0]?.id ?? '';
  const { documents, loading, refetch } = useKnowledgeDocuments(activeKnowledgeBaseId);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter(doc => doc.title.toLowerCase().includes(query));
  }, [documents, search]);

  return (
    <AgentsTabsLayout tab="knowledge">
    <div className="flex h-full flex-col px-[34px] pb-5">
      <div className="mt-6 flex items-center justify-end gap-4">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('knowledge.addContentButton')}
        </Button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('knowledge.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-5 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('knowledge.loading')}</div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('knowledge.empty.title')}
            description={t('knowledge.empty.description')}
            action={{
              label: t('knowledge.addContentButton'),
              onClick: () => setModalOpen(true),
            }}
            className="h-full"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map(doc => (
              <Card key={doc.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{doc.title}</h3>
                    <Badge variant={STATUS_BADGE_VARIANT[doc.status]}>{doc.status}</Badge>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  )}
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {doc.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddContentModal
          knowledgeBaseId={activeKnowledgeBaseId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
    </AgentsTabsLayout>
  );
}
