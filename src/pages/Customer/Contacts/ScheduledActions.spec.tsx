import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduledActions from './ScheduledActions';

const listPage = vi.fn();

vi.mock('@/services/scheduledActions/scheduledActionsService', () => ({
  scheduledActionsService: {
    listPage: (...args: unknown[]) => listPage(...args),
    cancel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

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
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/tours', () => ({ ScheduledActionsTour: () => null }));
vi.mock('@/components/scheduledActions/ScheduleActionModal', () => ({
  ScheduleActionModal: () => null,
}));
vi.mock('@/components/scheduledActions/ScheduledActionsHeader', () => ({ default: () => null }));
vi.mock('@/components/scheduledActions/ScheduledActionsTable', () => ({
  default: ({ actions }: { actions: { id: string }[] }) => (
    <div>
      {actions.map(action => (
        <span key={action.id}>{action.id}</span>
      ))}
    </div>
  ),
}));
vi.mock('@/components/base/BasePagination', () => ({
  default: ({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    onItemsPerPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (perPage: number) => void;
  }) => (
    <div>
      <span data-testid="pagination">{`${currentPage}/${totalPages}/${totalItems}`}</span>
      <button data-testid="page-2" onClick={() => onPageChange(2)}>
        page-2
      </button>
      {/* Like BasePagination off page 1: the new size, then a jump back to page 1. */}
      <button
        data-testid="per-page-50"
        onClick={() => {
          onItemsPerPageChange(50);
          if (currentPage > 1) onPageChange(1);
        }}
      >
        per-page-50
      </button>
    </div>
  ),
}));

describe('ScheduledActions page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPage.mockResolvedValue({ actions: [{ id: 'sa-1' }], total: 45 });
  });

  it('counts pages by the backend total, not by the rows on screen', async () => {
    render(<ScheduledActions />);

    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));
    expect(listPage).toHaveBeenCalledWith({ page: 1, per_page: 20 });
  });

  it('keeps the new page size when the pager also jumps back to page 1', async () => {
    render(<ScheduledActions />);

    await userEvent.click(await screen.findByTestId('page-2'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45'));
    await userEvent.click(screen.getByTestId('per-page-50'));

    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));
    expect(listPage).toHaveBeenLastCalledWith({ page: 1, per_page: 50 });
  });

  it('ignores an older page answering after a newer one', async () => {
    let answerPage2: (page: unknown) => void = () => {};
    render(<ScheduledActions />);
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));

    listPage.mockImplementationOnce(() => new Promise(resolve => (answerPage2 = resolve)));
    await userEvent.click(screen.getByTestId('page-2'));
    await userEvent.click(screen.getByTestId('per-page-50'));
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45'));

    answerPage2({ actions: [{ id: 'sa-21' }], total: 45 });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.getByTestId('pagination')).toHaveTextContent('1/1/45');
    expect(screen.queryByText('sa-21')).not.toBeInTheDocument();
  });

  it('loads the chosen page', async () => {
    listPage
      .mockResolvedValueOnce({ actions: [{ id: 'sa-1' }], total: 45 })
      .mockResolvedValueOnce({ actions: [{ id: 'sa-21' }], total: 45 });
    render(<ScheduledActions />);

    await userEvent.click(await screen.findByTestId('page-2'));

    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('2/3/45'));
    expect(listPage).toHaveBeenLastCalledWith({ page: 2, per_page: 20 });
    expect(screen.getByText('sa-21')).toBeInTheDocument();
  });

  it('asks for the size on screen again after a size change fails', async () => {
    render(<ScheduledActions />);
    await waitFor(() => expect(screen.getByTestId('pagination')).toHaveTextContent('1/3/45'));

    listPage.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByTestId('per-page-50'));
    await waitFor(() => expect(listPage).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 50));

    await userEvent.click(screen.getByTestId('page-2'));
    await waitFor(() => expect(listPage).toHaveBeenCalledTimes(3));
    expect(listPage).toHaveBeenLastCalledWith({ page: 2, per_page: 20 });
  });
});
