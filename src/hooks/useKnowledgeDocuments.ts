import { useCallback, useEffect, useState } from 'react';
import api from '@/services/core/api';

export interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  status: 'processing' | 'crawling' | 'active' | 'failed';
  source_type: 'manual' | 'upload' | 'url';
  tags: string[];
  created_at: string;
}

/**
 * Fetches the documents belonging to a single knowledge base (Phases 1-3 CRUD
 * resource) for the account-level Knowledge content management screen.
 *
 * NOTE: `api`'s baseURL already includes `/api/v1` (see
 * src/services/core/api.ts), so the request path here is relative to that —
 * NOT prefixed with `/api/v1` again, matching `useKnowledgeBases`.
 */
export function useKnowledgeDocuments(knowledgeBaseId: string) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!knowledgeBaseId) {
      setDocuments([]);
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);
    api
      .get(`/knowledge_bases/${knowledgeBaseId}/documents`)
      .then(res => {
        if (cancelled) return;
        setDocuments(res.data?.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [knowledgeBaseId]);

  useEffect(() => {
    return refetch();
  }, [refetch]);

  return { documents, loading, refetch };
}
