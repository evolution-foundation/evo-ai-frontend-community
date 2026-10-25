export interface FetchedPage<T> {
  items: T[];
  total?: number;
}

/**
 * Walks a paged endpoint from page 1 until every record is in hand. Pickers that
 * stop at the first page hide whatever is past it, and their search only filters
 * what was loaded. Without a `total`, a short page is the last one.
 */
export async function fetchAllPages<T>(
  pageSize: number,
  fetchPage: (page: number, pageSize: number) => Promise<FetchedPage<T>>,
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; ; page += 1) {
    const { items, total } = await fetchPage(page, pageSize);
    all.push(...items);

    const done =
      items.length === 0 || (typeof total === 'number' ? all.length >= total : items.length < pageSize);
    if (done) return all;
  }
}
