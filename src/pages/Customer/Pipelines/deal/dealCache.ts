import { pipelinesService } from '@/services/pipelines';
import type { Deal } from '@/types/analytics';

/**
 * Cache em memória dos negócios abertos no modal. Serve duas coisas:
 *  - prefetch ao passar o mouse/foco no cartão (o clique já encontra o dado);
 *  - stale-while-revalidate: o modal abre com o que existe e revalida em seguida.
 */
const FRESH_MS = 20_000;
const MAX_ENTRIES = 40;

type Entry = { deal?: Deal; at: number; promise?: Promise<Deal> };
const cache = new Map<string, Entry>();

function trim() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function peekDeal(id: string): Deal | undefined {
  return cache.get(id)?.deal;
}

export function setCachedDeal(deal: Deal) {
  cache.delete(deal.id);
  cache.set(deal.id, { deal, at: Date.now() });
  trim();
}

export function invalidateDeal(id: string) {
  cache.delete(id);
}

/** Carrega (ou reaproveita) o negócio. `force` ignora a janela de frescor. */
export function loadDeal(id: string, force = false): Promise<Deal> {
  const entry = cache.get(id);
  if (entry?.promise) return entry.promise;
  if (!force && entry?.deal && Date.now() - entry.at < FRESH_MS) return Promise.resolve(entry.deal);
  const promise = pipelinesService
    .getDeal(id)
    .then(deal => {
      setCachedDeal(deal);
      return deal;
    })
    .catch(error => {
      const current = cache.get(id);
      if (current) {
        delete current.promise;
        if (!current.deal) cache.delete(id);
      }
      throw error;
    });
  cache.set(id, { deal: entry?.deal, at: entry?.at ?? 0, promise });
  return promise;
}

export function prefetchDeal(id: string) {
  void loadDeal(id).catch(() => undefined);
}

export function clearDealCache() {
  cache.clear();
}
