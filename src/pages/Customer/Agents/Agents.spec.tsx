import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Agents from './Agents';
import { Agent } from '@/types/agents';

// The selection-bar "Delete AI Agent" used to be a stub: it fired an informative
// toast and deleted nothing. These specs pin the real behavior: confirm dialog,
// one DELETE per selected agent, honest partial-failure reporting and a refetch.
const agentA = { id: 'a-1', name: 'Support bot', description: '' } as unknown as Agent;
const agentB = { id: 'a-2', name: 'Sales bot', description: '' } as unknown as Agent;

const getAccessibleAgents = vi.fn();
const deleteAgent = vi.fn();
const success = vi.fn();
const error = vi.fn();
const can = vi.fn();

vi.mock('@/services/agents', () => ({
  getAccessibleAgents: (...args: unknown[]) => getAccessibleAgents(...args),
  deleteAgent: (...args: unknown[]) => deleteAgent(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => success(...args),
    error: (...args: unknown[]) => error(...args),
    info: vi.fn(),
  },
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (...args: unknown[]) => can(...args),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Options-aware echo. Every interpolated value lands in the echoed string, not just
    // `count`: a swapped `failed`/`total` has to fail the spec instead of still matching
    // on the bare key.
    t: (key: string, opts?: Record<string, unknown>) => {
      const named = Object.keys(opts ?? {}).sort();
      return named.length > 0
        ? `${key}#${named.map(name => `${name}=${String(opts![name])}`).join(',')}`
        : key;
    },
    currentLanguage: 'en',
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/agents/list' }),
}));

vi.mock('@/hooks/useDarkMode', () => ({ useDarkMode: () => undefined }));
vi.mock('@/tours', () => ({ AgentsTour: () => null }));
vi.mock('@/components/ApiKeysModal', () => ({ ApiKeysModal: () => null }));

// The page wires selection and bulk actions through these components; the specs
// only need the wiring, not their markup.
vi.mock('@/components/agents', () => ({
  AgentsTable: ({
    agents,
    onSelectionChange,
  }: {
    agents: Agent[];
    onSelectionChange: (agents: Agent[]) => void;
  }) => (
    <button data-testid="select-all" onClick={() => onSelectionChange(agents)}>
      select-all
    </button>
  ),
  AgentsHeader: ({
    selectedCount,
    onBulkDelete,
  }: {
    selectedCount: number;
    onBulkDelete: () => void;
  }) => (
    <div>
      <span data-testid="selected-count">{selectedCount}</span>
      <button data-testid="bulk-delete" onClick={onBulkDelete}>
        bulk-delete
      </button>
    </div>
  ),
  AgentsPagination: () => null,
  AgentWizardModal: () => null,
  AgentsFilterPanel: () => null,
  AgentsTabsLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

async function selectAllAndOpenBulkDialog() {
  await userEvent.click(await screen.findByTestId('select-all'));
  await userEvent.click(screen.getByTestId('bulk-delete'));
}

describe('Agents bulk delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockReturnValue(true);
    getAccessibleAgents.mockResolvedValue({
      data: [agentA, agentB],
      meta: { pagination: { page: 1, page_size: 48, total: 2, total_pages: 1 } },
    });
    deleteAgent.mockResolvedValue({});
  });

  it('opens a confirmation dialog naming how many agents are selected', async () => {
    render(<Agents />);

    await selectAllAndOpenBulkDialog();

    expect(await screen.findByText('bulkDeleteDialog.title')).toBeInTheDocument();
    expect(screen.getByText('bulkDeleteDialog.description#count=2')).toBeInTheDocument();
    expect(deleteAgent).not.toHaveBeenCalled();
  });

  it('deletes every selected agent, clears the selection and refetches', async () => {
    render(<Agents />);

    await selectAllAndOpenBulkDialog();
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(deleteAgent).toHaveBeenCalledTimes(2));
    expect(deleteAgent).toHaveBeenCalledWith('a-1');
    expect(deleteAgent).toHaveBeenCalledWith('a-2');

    await waitFor(() => expect(success).toHaveBeenCalledWith('bulkDeleteDialog.success#count=2'));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    // Initial load + post-delete refetch, preserving the user's page size (not the
    // 24-per-page default loadAgents falls back to).
    await waitFor(() => expect(getAccessibleAgents).toHaveBeenCalledTimes(2));
    expect(getAccessibleAgents).toHaveBeenLastCalledWith(1, 48, expect.anything());
  });

  it('reports a partial failure instead of claiming success', async () => {
    deleteAgent.mockImplementation((id: string) =>
      id === 'a-2' ? Promise.reject(new Error('boom')) : Promise.resolve({}),
    );
    render(<Agents />);

    await selectAllAndOpenBulkDialog();
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    // The counts are the whole point of the report: 1 of the 2 selected failed.
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('bulkDeleteDialog.partialError#failed=1,total=2'),
    );
    expect(success).not.toHaveBeenCalled();
    // The refetch reconciles the list with what actually got deleted.
    await waitFor(() => expect(getAccessibleAgents).toHaveBeenCalledTimes(2));
  });

  it('clamps the refetch to the last page that survives the deletion', async () => {
    // Page 2 holds the single leftover row of a 21-agent list. Deleting it leaves page 2
    // with nothing to show, so the refetch has to walk back to page 1.
    getAccessibleAgents.mockResolvedValue({
      data: [agentA],
      meta: { pagination: { page: 2, page_size: 20, total: 21, total_pages: 2 } },
    });
    render(<Agents />);

    await selectAllAndOpenBulkDialog();
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(getAccessibleAgents).toHaveBeenCalledTimes(2));
    expect(getAccessibleAgents).toHaveBeenLastCalledWith(1, 20, expect.anything());
  });

  it('denies the action without the delete permission', async () => {
    can.mockImplementation((_resource: string, action: string) => action !== 'delete');
    render(<Agents />);

    await selectAllAndOpenBulkDialog();

    expect(error).toHaveBeenCalledWith('permissions.deleteDenied');
    expect(screen.queryByText('bulkDeleteDialog.title')).not.toBeInTheDocument();
    expect(deleteAgent).not.toHaveBeenCalled();
  });
});
