// RULING (see ledger): this project uses Vitest — `vi.mock`/`vi.fn`/`vi.mocked`,
// not `jest.mock`/`jest.fn`/`as jest.Mock`.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchTestModal from './SearchTestModal';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: { post: vi.fn() },
}));

const TRANSLATIONS: Record<string, string> = {
  'knowledge.searchTest.title': 'Knowledge Search Test',
  'knowledge.searchTest.description': 'Test how your agents will match a query against this knowledge base',
  'knowledge.searchTest.queryPlaceholder': 'Search query',
  'knowledge.searchTest.actions.search': 'Search',
  'knowledge.searchTest.actions.close': 'Close',
  'knowledge.searchTest.empty': 'No results yet. Try a search query above.',
  'knowledge.searchTest.noResults': 'No results found.',
};

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => TRANSLATIONS[key] ?? key }),
}));

describe('SearchTestModal', () => {
  it('shows results after searching', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { results: [{ content: 'resultado', tags: [], document_title: 'Doc' }] },
    });

    render(<SearchTestModal knowledgeBaseId="kb-1" onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/search query/i), { target: { value: 'teste' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('resultado')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/knowledge_bases/kb-1/search', {
      query: 'teste',
      max_results: 10,
    });
  });

  it('falls back to an empty result list instead of throwing on a malformed response', async () => {
    // Regression guard: `res.data?.results ?? []` must not blow up on `results.length`
    // when the backend returns an unexpected shape (e.g. no `results` key at all).
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    render(<SearchTestModal knowledgeBaseId="kb-1" onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/search query/i), { target: { value: 'teste' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('No results found.')).toBeInTheDocument());
  });
});
