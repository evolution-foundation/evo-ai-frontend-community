import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConversationsFilterPopover from './ConversationsFilterPopover';
import type { BaseFilter } from '@/types/core';

vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/chat/useFilterOptions', () => ({
  useFilterOptions: () => ({ inboxes: [], labels: [], teams: [], pipelines: [], users: [
    { value: 'agent-a', label: 'Agent A' }, { value: 'agent-b', label: 'Agent B' },
  ] }),
}));

const status: BaseFilter = {
  attributeKey: 'status', filterOperator: 'equal_to', values: 'open', queryOperator: 'and', attributeModel: 'standard',
};
const users: BaseFilter = { ...status, attributeKey: 'assignee_id', values: ['agent-a', 'agent-b'] };

function setup(filters: BaseFilter[]) {
  const apply = vi.fn();
  render(<ConversationsFilterPopover open onOpenChange={vi.fn()} filters={filters}
    onFiltersChange={vi.fn()} onApplyFilters={apply} onClearFilters={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'conversationsFilter.attributes.assignee_id' }));
  return apply;
}
const toggle = (label: string) => fireEvent.click(within(screen.getByText(label).closest('label')!).getByRole('checkbox'));

describe('conversation Users filter UI', () => {
  it('applies two selected users while preserving another criterion', () => {
    const apply = setup([status]);
    toggle('Agent A');
    toggle('Agent B');
    fireEvent.click(screen.getByRole('button', { name: 'conversationsFilter.applyFilters' }));
    expect(apply).toHaveBeenCalledWith([status, users]);
  });

  it('removes only the user row after deselecting restored users', () => {
    const apply = setup([status, users]);
    toggle('Agent A');
    toggle('Agent B');
    fireEvent.click(screen.getByRole('button', { name: 'conversationsFilter.applyFilters' }));
    expect(apply).toHaveBeenCalledWith([status]);
  });
});
