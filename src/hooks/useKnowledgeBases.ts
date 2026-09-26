import { useEffect, useState } from 'react';
import api from '@/services/core/api';

export interface KnowledgeBase {
  id: string;
  name: string;
  active: boolean;
  default: boolean;
}

/**
 * Fetches the account's knowledge bases (Phase 1 CRUD resource) for the
 * "Load Knowledge" selector in AdvancedSettingsSection.
 *
 * NOTE: `api`'s baseURL already includes `/api/v1` (see
 * src/services/core/api.ts), so the request path here is relative to that —
 * NOT prefixed with `/api/v1` again, matching every other service in
 * src/services/**.
 */
export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get('/knowledge_bases')
      .then(res => {
        if (cancelled) return;
        setKnowledgeBases(res.data?.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setKnowledgeBases([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { knowledgeBases, loading };
}
