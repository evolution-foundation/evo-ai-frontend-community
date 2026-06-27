import BaseFilter from '@/components/base/BaseFilter';
import { AGENT_FILTER_TYPES, DEFAULT_AGENT_FILTER } from '@/types/agents';
import { BaseFilter as AgentFilter } from '@/types/core';

interface AgentsFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AgentFilter[];
  onFiltersChange: (filters: AgentFilter[]) => void;
  onApplyFilters: (filters: AgentFilter[]) => void;
  onClearFilters: () => void;
}

export default function AgentsFilter({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: AgentsFilterProps) {
  return (
    <BaseFilter
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      filterTypes={AGENT_FILTER_TYPES}
      defaultFilter={DEFAULT_AGENT_FILTER}
    />
  );
}
