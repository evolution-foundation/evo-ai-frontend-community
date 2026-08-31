import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AgentSummaryPanel from './AgentSummaryPanel';
import { Agent } from '@/types/agents';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt' }),
}));

const listAgentProducts = vi.fn(async () => [{ id: 'p1' }, { id: 'p2' }]);

vi.mock('@/services/products/productsService', () => ({
  productsService: {
    listAgentProducts: (...args: unknown[]) => listAgentProducts(...(args as [])),
  },
}));

const renderPanel = (type: string) =>
  render(
    <AgentSummaryPanel
      agent={{ id: 'agent-1', type, created_at: '2026-07-01T00:00:00Z' } as Agent}
      model="gpt-4o"
      subAgentsCount={2}
    />
  );

describe('AgentSummaryPanel', () => {
  // `Agent` carries no status field.
  it('does not claim a status the agent does not carry', async () => {
    renderPanel('llm');
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());

    expect(screen.queryByText('edit.profile.summary.status')).toBeNull();
  });

  it('counts products for types that can sell', async () => {
    renderPanel('llm');
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
    expect(screen.getByText('edit.profile.summary.products')).toBeTruthy();
  });

  // Same gate as the Products tab, which orchestrators do not expose.
  it('drops the products counter for orchestrators', () => {
    listAgentProducts.mockClear();
    renderPanel('sequential');

    expect(screen.queryByText('edit.profile.summary.products')).toBeNull();
    expect(listAgentProducts).not.toHaveBeenCalled();
  });

  it('shows a dash instead of zero when the products fetch fails', async () => {
    listAgentProducts.mockRejectedValueOnce(new Error('boom'));
    renderPanel('llm');

    await waitFor(() => expect(screen.getByText('—')).toBeTruthy());
  });
});
