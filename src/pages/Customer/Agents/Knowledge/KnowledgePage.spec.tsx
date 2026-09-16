// RULING (see ledger): this project uses Vitest — `vi.mock`/`vi.fn`/`vi.mocked`,
// not `jest.mock`/`jest.fn`/`as jest.Mock`.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import KnowledgePage from './KnowledgePage';
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeDocuments';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';

vi.mock('@/hooks/useKnowledgeDocuments');
vi.mock('@/hooks/useKnowledgeBases');

// Matches this directory's own convention (see Agents.spec.tsx): AgentsTabsLayout
// owns RBAC redirects and the shared tab bar, which are exercised by its own
// spec — here it would just need a Router/PermissionsContext to mount.
vi.mock('@/components/agents', () => ({
  AgentsTabsLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const TRANSLATIONS: Record<string, string> = {
  'knowledge.title': 'Knowledge',
  'knowledge.subtitle': 'Manage your knowledge base',
  'knowledge.addContentButton': 'Add Content',
  'knowledge.addContent.title': 'Add Content',
  'knowledge.addContent.description':
    'Create a new entry in the knowledge base to train your agents',
};

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => TRANSLATIONS[key] ?? key }),
}));

const baseKnowledgeBases = () =>
  vi.mocked(useKnowledgeBases).mockReturnValue({
    knowledgeBases: [{ id: 'kb-1', name: 'Default', active: true, default: true }],
    loading: false,
  });

describe('KnowledgePage', () => {
  it('renders a card per document with title and status', async () => {
    baseKnowledgeBases();
    vi.mocked(useKnowledgeDocuments).mockReturnValue({
      documents: [
        {
          id: '1',
          title: 'Documentação da Evolution API',
          status: 'active',
          source_type: 'manual',
          tags: ['chunked'],
          created_at: '',
        },
      ],
      loading: false,
      refetch: vi.fn(),
    });

    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Documentação da Evolution API')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });

  it('opens the Add Content modal when the button is clicked', async () => {
    baseKnowledgeBases();
    vi.mocked(useKnowledgeDocuments).mockReturnValue({
      documents: [],
      loading: false,
      refetch: vi.fn(),
    });

    render(<KnowledgePage />);
    const user = (await import('@testing-library/user-event')).default.setup();
    await user.click(screen.getAllByRole('button', { name: /add content/i })[0]);

    expect(screen.getByText(/create a new entry/i)).toBeInTheDocument();
  });
});
