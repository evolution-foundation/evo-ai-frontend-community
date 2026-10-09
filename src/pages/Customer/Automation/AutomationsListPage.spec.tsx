import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomationsListPage from './index';
import { SETTINGS_LIST_FETCH_SIZE } from '@/constants/pagination';

const rules = Array.from({ length: 45 }, (_, i) => ({
  id: `rule-${i + 1}`,
  name: `Rule ${String(i + 1).padStart(2, '0')}`,
}));
const getAutomations = vi.fn();

vi.mock('@/services/automation/automationService', () => ({
  automationService: {
    getAutomations: (...args: unknown[]) => getAutomations(...args),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

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

vi.mock('@/components/automation', () => ({
  AutomationsHeader: ({ onSearchChange }: { onSearchChange: (value: string) => void }) => (
    <button data-testid="search" onClick={() => onSearchChange('Rule 45')}>
      search
    </button>
  ),
  AutomationsTable: ({ automations }: { automations: { id: string; name: string }[] }) => (
    <div>
      {automations.map(rule => (
        <span key={rule.id}>{rule.name}</span>
      ))}
    </div>
  ),
  AutomationsPagination: () => null,
}));

describe('AutomationsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Like the CRM: without a page size, the first 20 rules.
    getAutomations.mockImplementation(async (perPage = 20) => ({
      success: true,
      data: rules.slice(0, perPage),
      meta: { pagination: { total: rules.length } },
    }));
  });

  it('finds a rule past the first 20, since search and paging run over what was loaded', async () => {
    render(<AutomationsListPage />);
    await screen.findByText('Rule 01');

    await userEvent.click(screen.getByTestId('search'));

    await waitFor(() => expect(screen.getByText('Rule 45')).toBeInTheDocument());
    expect(getAutomations).toHaveBeenCalledWith(SETTINGS_LIST_FETCH_SIZE);
  });
});
