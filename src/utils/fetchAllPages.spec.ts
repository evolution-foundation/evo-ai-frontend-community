import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from './fetchAllPages';

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

describe('fetchAllPages', () => {
  it('keeps asking until it has the total', async () => {
    const fetchPage = vi.fn(async (page: number, size: number) => ({
      items: range((page - 1) * size + 1, Math.min(page * size, 101)),
      total: 101,
    }));

    const all = await fetchAllPages(100, fetchPage);

    expect(all).toHaveLength(101);
    expect(all[100]).toBe(101);
    expect(fetchPage.mock.calls).toEqual([
      [1, 100],
      [2, 100],
    ]);
  });

  it('stops after one request when the first page holds everything', async () => {
    const fetchPage = vi.fn(async () => ({ items: range(1, 3), total: 3 }));

    await fetchAllPages(100, fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('treats a short page as the last one when there is no total', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ items: page === 1 ? range(1, 2) : range(3, 3) }));

    const all = await fetchAllPages(2, fetchPage);

    expect(all).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page even if the total promised more', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ items: page === 1 ? range(1, 2) : [], total: 10 }));

    const all = await fetchAllPages(2, fetchPage);

    expect(all).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
