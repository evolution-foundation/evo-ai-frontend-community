import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDealCache, loadDeal, peekDeal, prefetchDeal } from './dealCache';

const getDeal = vi.hoisted(() => vi.fn());
vi.mock('@/services/pipelines', () => ({ pipelinesService: { getDeal } }));

describe('dealCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDealCache();
  });
  it('deduplica prefetch e abertura concorrentes e serve do cache depois', async () => {
    getDeal.mockResolvedValue({ id: 'd1', title: 'A' });
    prefetchDeal('d1');
    const [a, b] = await Promise.all([loadDeal('d1'), loadDeal('d1')]);
    expect(a).toBe(b);
    expect(getDeal).toHaveBeenCalledTimes(1);
    expect(peekDeal('d1')?.title).toBe('A');
    await loadDeal('d1');
    expect(getDeal).toHaveBeenCalledTimes(1);
  });
  it('revalida quando forçado e preserva o valor antigo se a revalidação falhar', async () => {
    getDeal.mockResolvedValueOnce({ id: 'd1', title: 'A' });
    await loadDeal('d1');
    getDeal.mockRejectedValueOnce(new Error('off'));
    await expect(loadDeal('d1', true)).rejects.toThrow('off');
    expect(peekDeal('d1')?.title).toBe('A');
  });
  it('não guarda falha de primeira carga', async () => {
    getDeal.mockRejectedValueOnce(new Error('404'));
    prefetchDeal('x');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(peekDeal('x')).toBeUndefined();
    getDeal.mockResolvedValueOnce({ id: 'x', title: 'ok' });
    expect((await loadDeal('x')).title).toBe('ok');
  });
});
