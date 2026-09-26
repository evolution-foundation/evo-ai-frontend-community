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
  Label,
} from '@evoapi/design-system';
import api from '@/services/core/api';
import { useLanguage } from '@/hooks/useLanguage';

interface SearchResult {
  content: string;
  tags: string[];
  document_title: string;
}

interface SearchTestModalProps {
  knowledgeBaseId: string;
  onClose: () => void;
}

export default function SearchTestModal({ knowledgeBaseId, onClose }: SearchTestModalProps) {
  const { t } = useLanguage('agents');
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async () => {
    setSearching(true);
    try {
      const res = await api.post(`/knowledge_bases/${knowledgeBaseId}/search`, {
        query,
        max_results: maxResults,
      });
      setResults(res.data?.results ?? []);
      setHasSearched(true);
    } catch (error) {
      console.error('Error running knowledge search test:', error);
      toast.error(t('knowledge.searchTest.error'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('knowledge.searchTest.title')}</DialogTitle>
          <DialogDescription>{t('knowledge.searchTest.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="knowledge-search-test-query">
              {t('knowledge.searchTest.queryPlaceholder')}
            </Label>
            <Input
              id="knowledge-search-test-query"
              placeholder={t('knowledge.searchTest.queryPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="knowledge-search-test-max-results">
              {t('knowledge.searchTest.maxResults')}
            </Label>
            <Input
              id="knowledge-search-test-max-results"
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={e => setMaxResults(Number(e.target.value))}
            />
          </div>

          <div className="max-h-72 space-y-2 overflow-auto">
            {hasSearched && results.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('knowledge.searchTest.noResults')}</p>
            ) : !hasSearched ? (
              <p className="text-sm text-muted-foreground">{t('knowledge.searchTest.empty')}</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="rounded-md border p-3">
                  <p className="text-sm font-semibold text-foreground">{result.document_title}</p>
                  <p className="text-sm text-muted-foreground">{result.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={searching}>
            {t('knowledge.searchTest.actions.close')}
          </Button>
          <Button onClick={search} disabled={searching || !query}>
            {t('knowledge.searchTest.actions.search')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
