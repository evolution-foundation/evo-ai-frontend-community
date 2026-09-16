// RULING (see ledger): this project uses Vitest, not Jest — `vi`, `describe`,
// `it`, `expect` come from 'vitest' (vitest.config.ts has `globals: true`, but
// explicit imports match this repo's own convention, e.g. useLiveChannelStatus.spec.ts).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AdvancedSettingsSection from './AdvancedSettingsSection';

vi.mock('@/services/core/api', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { data: [] } })) },
}));

// Matches this directory's own convention (see CustomMCPServersSection.spec.tsx)
// for keeping component specs independent of a real i18next instance.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// useKnowledgeBases() resolves its fetch on the next microtask; flush it
// under `act` after each render so React doesn't warn about state updates
// happening outside of act.
const flushMicrotasks = () => act(() => Promise.resolve());

const baseData = {
  load_memory: false,
  preload_memory: false,
  planner: false,
  load_knowledge: false,
  knowledge_tags: [],
};

describe('AdvancedSettingsSection - Load Knowledge', () => {
  it('renders the Load Knowledge toggle when open', async () => {
    render(
      <AdvancedSettingsSection
        data={baseData}
        isOpen
        onToggle={() => {}}
        onAdvancedSettingsChange={() => {}}
      />
    );
    await flushMicrotasks();

    expect(screen.getByLabelText(/load.?knowledge/i)).toBeInTheDocument();
  });

  it('calls onAdvancedSettingsChange with load_knowledge: true when toggled on', async () => {
    const onChange = vi.fn();
    render(
      <AdvancedSettingsSection
        data={baseData}
        isOpen
        onToggle={() => {}}
        onAdvancedSettingsChange={onChange}
      />
    );
    await flushMicrotasks();

    fireEvent.click(screen.getByLabelText(/load.?knowledge/i));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ load_knowledge: true }));
  });

  it('shows the tag input only when load_knowledge is enabled', async () => {
    render(
      <AdvancedSettingsSection
        data={{ ...baseData, load_knowledge: true }}
        isOpen
        onToggle={() => {}}
        onAdvancedSettingsChange={() => {}}
      />
    );
    await flushMicrotasks();

    expect(screen.getByPlaceholderText(/tag/i)).toBeInTheDocument();
  });
});
