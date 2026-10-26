export interface FetchedPage<T> {
  items: T[];
  total?: number;
}

const idOrSelf = (item: unknown): unknown =>
  item !== null && typeof item === 'object' && 'id' in item ? (item as { id: unknown }).id : item;

/**
 * Walks a paged endpoint from page 1 until every record is in hand. Pickers that
 * stop at the first page hide whatever is past it, and their search only filters
 * what was loaded. Without a `total`, a short page is the last one.
 */
export async function fetchAllPages<T>(
  pageSize: number,
  fetchPage: (page: number, pageSize: number) => Promise<FetchedPage<T>>,
  keyOf: (item: T) => unknown = idOrSelf,
): Promise<T[]> {
  const all: T[] = [];
  // Offset pages shift when a record is created between two requests, repeating
  // the one on the boundary.
  const seen = new Set<unknown>();
  let received = 0;

  for (let page = 1; ; page += 1) {
    const { items, total } = await fetchPage(page, pageSize);
    received += items.length;
    for (const item of items) {
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }

    const done =
      items.length === 0 || (typeof total === 'number' ? received >= total : items.length < pageSize);
    if (done) return all;
  }
}
