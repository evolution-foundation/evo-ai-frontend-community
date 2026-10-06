import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomTools from './CustomTools';
import { CustomTool } from '@/types/ai';

const toolA = { id: 't-1', name: 'Weather', method: 'GET', tags: ['api', 'weather'] } as unknown as CustomTool;
const toolB = { id: 't-2', name: 'CRM sync', method: 'POST', tags: ['api', 'crm'] } as unknown as CustomTool;

const listCustomTools = vi.fn();
const deleteCustomTool = vi.fn();
const success = vi.fn();
const error = vi.fn();
const can = vi.fn();
const tagOptionsSeen = vi.fn();

vi.mock('@/services/agents/customToolsService', () => ({
  listCustomTools: (...args: unknown[]) => listCustomTools(...args),
  deleteCustomTool: (...args: unknown[]) => deleteCustomTool(...args),
  getCustomTool: vi.fn(),
  createCustomTool: vi.fn(),
  updateCustomTool: vi.fn(),
  testCustomTool: vi.fn(),
  initialCustomToolsState: {
    tools: [],
    selectedToolIds: [],
    searchQuery: '',
    meta: { pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } },
    loading: { list: false, create: false, update: false, delete: false, test: false },
  },
  getErrorMessage: (_error: Error, fallback: string) => fallback,
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

// Runs the load once, the way the real hook does when permissions resolve.
vi.mock('@/hooks/rbac/usePermissionGatedLoad', async () => {
  const { useEffect } = await import('react');
  return {
    usePermissionGatedLoad: ({ load }: { load: () => void }) => {
      useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Every interpolated value lands in the echoed string, so a swapped `failed`/`total`
    // fails the spec instead of still matching on the bare key.
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
  useLocation: () => ({ pathname: '/agents/custom-tools' }),
  useParams: () => ({}),
}));

vi.mock('@/tours', () => ({ AgentsCustomToolsTour: () => null }));
vi.mock('@/components/agents', () => ({
  AgentsTabsLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/customTools', () => ({
  CustomToolsTable: ({
    tools,
    onSelectionChange,
  }: {
    tools: CustomTool[];
    onSelectionChange: (tools: CustomTool[]) => void;
  }) => (
    <div data-testid="tools-table">
      {tools.map(tool => (
        <span key={tool.id}>{tool.name}</span>
      ))}
      <button data-testid="select-all" onClick={() => onSelectionChange(tools)}>
        select-all
      </button>
    </div>
  ),
  CustomToolsHeader: ({
    selectedCount,
    onBulkDelete,
    onClearSelection,
    onSearchChange,
  }: {
    selectedCount: number;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    onSearchChange: (value: string) => void;
  }) => (
    <div>
      <span data-testid="selected-count">{selectedCount}</span>
      <button data-testid="bulk-delete" onClick={onBulkDelete}>
        bulk-delete
      </button>
      <button data-testid="clear-selection" onClick={onClearSelection}>
        clear-selection
      </button>
      <button data-testid="search" onClick={() => onSearchChange('crm')}>
        search
      </button>
    </div>
  ),
  CustomToolsFilter: ({ tagOptions }: { tagOptions: string[] }) => {
    tagOptionsSeen(tagOptions);
    return null;
  },
  CustomToolsPagination: () => null,
  CustomToolWizardModal: () => null,
  CustomToolTestResultDialog: () => null,
  CustomToolDetails: () => null,
}));

async function selectAllAndOpenBulkDialog() {
  await userEvent.click(await screen.findByTestId('select-all'));
  await userEvent.click(screen.getByTestId('bulk-delete'));
}

describe('CustomTools page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockReturnValue(true);
    listCustomTools.mockResolvedValue([toolA, toolB]);
    deleteCustomTool.mockResolvedValue(undefined);
  });

  it('renders the table straight away, with no cards and no view toggle', async () => {
    render(<CustomTools />);

    expect(await screen.findByTestId('tools-table')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(document.querySelector('[data-tour="agents-custom-tools-view-toggle"]')).toBeNull();
  });

  it('feeds the Tags filter with the distinct tags of the loaded tools', async () => {
    render(<CustomTools />);

    await waitFor(() => expect(tagOptionsSeen).toHaveBeenLastCalledWith(['api', 'crm', 'weather']));
  });

  it('opens a confirmation dialog naming how many tools are selected', async () => {
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();

    expect(await screen.findByText('bulkDeleteDialog.title')).toBeInTheDocument();
    expect(screen.getByText('bulkDeleteDialog.description#count=2')).toBeInTheDocument();
    expect(deleteCustomTool).not.toHaveBeenCalled();
  });

  it('deletes every selected tool, clears the selection and refetches', async () => {
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(deleteCustomTool).toHaveBeenCalledTimes(2));
    expect(deleteCustomTool).toHaveBeenCalledWith('t-1');
    expect(deleteCustomTool).toHaveBeenCalledWith('t-2');

    await waitFor(() => expect(success).toHaveBeenCalledWith('bulkDeleteDialog.success#count=2'));
    await waitFor(() => expect(listCustomTools).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
  });

  it('deletes what the dialog named even if the live selection is cleared meanwhile', async () => {
    // A debounced search refetch clears the selection under an open dialog; confirming
    // used to read "Delete 0" and do nothing.
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();
    // The open modal makes the header inert; fireEvent stands in for the background refetch.
    fireEvent.click(screen.getByTestId('clear-selection'));

    expect(screen.getByText('bulkDeleteDialog.description#count=2')).toBeInTheDocument();
    await userEvent.click(screen.getByText('bulkDeleteDialog.confirm'));

    await waitFor(() => expect(deleteCustomTool).toHaveBeenCalledTimes(2));
  });

  it('ignores an older search answering after the post-delete refetch', async () => {
    let answerSearch: (tools: CustomTool[]) => void = () => {};
    listCustomTools
      .mockResolvedValueOnce([toolA, toolB])
      .mockImplementationOnce(() => new Promise(resolve => (answerSearch = resolve)))
      .mockResolvedValueOnce([]);
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();
    // The open modal makes the header inert; fireEvent stands in for typing before it opened.
    fireEvent.click(screen.getByTestId('search'));
    await waitFor(() => expect(listCustomTools).toHaveBeenCalledTimes(2), { timeout: 2000 });

    await userEvent.click(screen.getByText('bulkDeleteDialog.confirm'));
    await waitFor(() => expect(listCustomTools).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText('Weather')).not.toBeInTheDocument());

    answerSearch([toolA, toolB]);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.queryByText('Weather')).not.toBeInTheDocument();
  });

  it('drops the selection as soon as a refetch starts, even if it then fails', async () => {
    listCustomTools
      .mockResolvedValueOnce([toolA, toolB])
      .mockRejectedValueOnce(new Error('offline'));
    render(<CustomTools />);

    await userEvent.click(await screen.findByTestId('select-all'));
    expect(screen.getByTestId('selected-count')).toHaveTextContent('2');

    await userEvent.click(screen.getByTestId('search'));
    await waitFor(() => expect(error).toHaveBeenCalledWith('messages.loadError'), { timeout: 2000 });
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
  });

  it('reports a partial failure instead of claiming success', async () => {
    deleteCustomTool.mockImplementation((id: string) =>
      id === 't-2' ? Promise.reject(new Error('boom')) : Promise.resolve(),
    );
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();
    await userEvent.click(await screen.findByText('bulkDeleteDialog.confirm'));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('bulkDeleteDialog.partialError#failed=1,total=2'),
    );
    expect(success).not.toHaveBeenCalled();
    await waitFor(() => expect(listCustomTools).toHaveBeenCalledTimes(2));
  });

  it('denies the action without the delete permission', async () => {
    can.mockImplementation((_resource: string, action: string) => action !== 'delete');
    render(<CustomTools />);

    await selectAllAndOpenBulkDialog();

    expect(error).toHaveBeenCalledWith('permissions.deleteDenied');
    expect(screen.queryByText('bulkDeleteDialog.title')).not.toBeInTheDocument();
    expect(deleteCustomTool).not.toHaveBeenCalled();
  });
});

