import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// CRM-236-style bug: usersService.getUsers() only returns the backend's
// default page (page_size 20), so an account with more users than that page
// silently loses the rest from this picker. This test uses 2 fake users
// split across 2 pages to prove the component fetches every page.

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ teamId: 'team-1' }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const user = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  availability: 'offline',
});

const getUsersMock = vi.fn();
vi.mock('@/services/users', () => ({
  usersService: { getUsers: (...args: unknown[]) => getUsersMock(...args) },
}));

vi.mock('@/services/teams/teamsService', () => ({
  default: {
    getTeam: vi.fn().mockResolvedValue({ id: 'team-1', name: 'Team 1' }),
    getTeamMembers: vi.fn().mockResolvedValue([]),
  },
}));

import AddUsers from './AddUsers';

beforeEach(() => {
  getUsersMock.mockReset();
  getUsersMock.mockImplementation((params?: { page?: number }) => {
    const page = params?.page ?? 1;
    if (page === 1) {
      return Promise.resolve({
        data: [user('u1', 'Ana')],
        meta: { pagination: { page: 1, page_size: 1, total: 2, total_pages: 2, has_next_page: true } },
      });
    }
    return Promise.resolve({
      data: [user('u2', 'Bruno')],
      meta: { pagination: { page: 2, page_size: 1, total: 2, total_pages: 2, has_next_page: false } },
    });
  });
});

describe('AddUsers', () => {
  it('loads every page of the assignable-user list, not just the first', async () => {
    render(<AddUsers />);

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(getUsersMock).toHaveBeenCalledTimes(2);
  });
});
