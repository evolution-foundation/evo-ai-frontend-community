import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BaseFilter, FilterType } from '@/types/core';

// The server honors `q`, `filters[]` and `sort`/`order`, so every reload has to
// carry them — these cover the reloads that used to forget.

const getUsersMock = vi.fn();
const listRolesMock = vi.fn();

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt' }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ currentUser: { id: 1, name: 'Admin' } }),
}));

vi.mock('@/services/users', () => ({
  usersService: { getUsers: (...args: unknown[]) => getUsersMock(...args) },
}));

vi.mock('@/services/roles/rolesService', () => ({
  rolesService: { list: () => listRolesMock() },
}));

vi.mock('@/tours', () => ({ SettingsAgentsTour: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type HeaderStubProps = { onSearchChange: (value: string) => void; onFilter: () => void };
type PaginationStubProps = { onPageChange: (page: number) => void };
type FilterStubProps = { filterTypes: FilterType[]; onApplyFilters: (filters: BaseFilter[]) => void };
type TableStubProps = { onSort: (column: string) => void };

// Stubs expose only the callbacks under test; the real components drag in the
// whole design system and none of their markup matters here.
vi.mock('@/components/users', () => ({
  UsersHeader: ({ onSearchChange, onFilter }: HeaderStubProps) => (
    <div>
      <input aria-label="search" onChange={event => onSearchChange(event.target.value)} />
      <button onClick={onFilter}>open-filter</button>
    </div>
  ),
  UsersPagination: ({ onPageChange }: PaginationStubProps) => (
    <button onClick={() => onPageChange(2)}>next-page</button>
  ),
  UsersFilter: ({ filterTypes, onApplyFilters }: FilterStubProps) => (
    <div>
      <span data-testid="role-options">
        {(filterTypes.find(type => type.attributeKey === 'role')?.options ?? [])
          .map(option => option.value)
          .join(',')}
      </span>
      <button
        onClick={() =>
          onApplyFilters([
            {
              attributeKey: 'role',
              filterOperator: 'equal_to',
              values: 'agent',
              queryOperator: 'and',
              attributeModel: 'standard',
            },
          ])
        }
      >
        apply-filter
      </button>
    </div>
  ),
  UserCard: () => null,
  UsersTable: ({ onSort }: TableStubProps) => <button onClick={() => onSort('role')}>sort-role</button>,
  UserFormModal: () => null,
  BulkInviteModal: () => null,
  UserDetails: () => null,
  SetPasswordModal: () => null,
}));

import Users from './Users';

const usersPage = {
  data: [{ id: 1, name: 'Alice Silva', email: 'alice@example.com' }],
  meta: {
    pagination: { page: 1, page_size: 20, total: 3, total_pages: 2, has_next_page: true, has_previous_page: false },
  },
};

const lastCall = () => getUsersMock.mock.calls[getUsersMock.mock.calls.length - 1][0];

describe('Users list — search and filter wiring (EVO-1947)', () => {
  beforeEach(() => {
    getUsersMock.mockReset().mockResolvedValue(usersPage);
    listRolesMock.mockReset().mockResolvedValue([
      { key: 'administrator', name: 'Administrador' },
      { key: 'suporte-n1', name: 'Suporte N1' },
    ]);
  });

  it('keeps the search term when the user paginates', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await user.type(screen.getByLabelText('search'), 'silva');
    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'silva' }));

    await user.click(screen.getByText('next-page'));
    await waitFor(() => expect(lastCall()).toMatchObject({ page: 2, q: 'silva' }));
  });

  it('keeps the search term when a filter is applied', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await user.type(screen.getByLabelText('search'), 'silva');
    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'silva' }));

    await user.click(screen.getByText('apply-filter'));
    await waitFor(() =>
      expect(lastCall()).toMatchObject({
        page: 1,
        q: 'silva',
        'filters[0][attribute_key]': 'role',
        'filters[0][values]': 'agent',
      }),
    );
  });

  it('fires a single request for a burst of keystrokes', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('search'), 'silva');
    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'silva' }));

    // 1 initial load + 1 debounced search, not one request per character.
    expect(getUsersMock).toHaveBeenCalledTimes(2);
  });

  it('offers the account roles in the filter, not the hard-coded pair', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await user.click(screen.getByText('open-filter'));

    await waitFor(() =>
      expect(screen.getByTestId('role-options')).toHaveTextContent('administrator,suporte-n1'),
    );
  });

  it('keeps the built-in role options when listing roles is denied', async () => {
    listRolesMock.mockRejectedValue(new Error('forbidden'));
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await user.click(screen.getByText('open-filter'));

    await waitFor(() => expect(listRolesMock).toHaveBeenCalled());
    expect(screen.getByTestId('role-options')).toHaveTextContent('administrator,agent');
  });
});

// The view toggles carry icons only, so they are the page's only buttons with an
// empty accessible name.
const switchToTableView = async (user: ReturnType<typeof userEvent.setup>) => {
  const iconButtons = screen.getAllByRole('button').filter(button => button.textContent === '');
  await user.click(iconButtons[1]);
};

const sortByRole = async (user: ReturnType<typeof userEvent.setup>) => {
  await switchToTableView(user);
  await user.click(screen.getByText('sort-role'));
  await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'role', order: 'asc' }));
};

describe('Users list — the chosen sort survives every reload (EVO-1947)', () => {
  beforeEach(() => {
    getUsersMock.mockReset().mockResolvedValue(usersPage);
    listRolesMock.mockReset().mockResolvedValue([]);
  });

  it('sends the column and direction when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await sortByRole(user);
  });

  it('keeps the sort when the user paginates', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await sortByRole(user);
    await user.click(screen.getByText('next-page'));

    await waitFor(() => expect(lastCall()).toMatchObject({ page: 2 }));
    expect(lastCall()).toMatchObject({ page: 2, sort: 'role', order: 'asc' });
  });

  it('keeps the sort when a filter is applied', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await sortByRole(user);
    await user.click(screen.getByText('apply-filter'));

    await waitFor(() => expect(lastCall()).toMatchObject({ 'filters[0][attribute_key]': 'role' }));
    expect(lastCall()).toMatchObject({ sort: 'role', order: 'asc' });
  });

  it('keeps the sort when the user searches', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await sortByRole(user);
    await user.type(screen.getByLabelText('search'), 'silva');

    await waitFor(() => expect(lastCall()).toMatchObject({ q: 'silva' }));
    expect(lastCall()).toMatchObject({ q: 'silva', sort: 'role', order: 'asc' });
  });

  it('toggles to desc on a second click of the same column and keeps it', async () => {
    const user = userEvent.setup();
    render(<Users />);
    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    await sortByRole(user);
    await user.click(screen.getByText('sort-role'));
    await waitFor(() => expect(lastCall()).toMatchObject({ sort: 'role', order: 'desc' }));

    await user.click(screen.getByText('next-page'));
    await waitFor(() => expect(lastCall()).toMatchObject({ page: 2 }));
    expect(lastCall()).toMatchObject({ page: 2, sort: 'role', order: 'desc' });
  });
});
