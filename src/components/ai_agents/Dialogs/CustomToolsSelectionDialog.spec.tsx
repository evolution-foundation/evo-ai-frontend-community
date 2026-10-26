import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import CustomToolsSelectionDialog from './CustomToolsSelectionDialog';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockListCustomToolsPage = vi.fn();
vi.mock('@/services/agents/customToolsService', () => ({
  listCustomToolsPage: (...args: unknown[]) => mockListCustomToolsPage(...args),
  createCustomTool: vi.fn(),
}));

// EVO-1738: the agent-builder create path now renders the guided wizard.
vi.mock('@/components/customTools/CustomToolWizardModal', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) =>
    open ? (
      <div data-testid="custom-tool-wizard">
        <button onClick={() => onOpenChange(false)}>close-wizard</button>
      </div>
    ) : null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const tool = (n: number) => ({
  id: `tool-${n}`,
  name: `Tool ${n}`,
  description: '',
  method: 'GET',
  endpoint: `https://api.example.com/${n}`,
  tags: [] as string[],
});

// Answers `skip`/`limit` like the core does, out of a base of `count` tools.
const serveTools = (count: number) =>
  mockListCustomToolsPage.mockImplementation(async ({ skip, limit }: { skip: number; limit: number }) => ({
    tools: Array.from({ length: Math.max(0, Math.min(limit, count - skip)) }, (_, i) => tool(skip + i + 1)),
    total: count,
  }));

const makeProps = (overrides = {}) => ({
  open: true,
  onOpenChange: vi.fn(),
  onSave: vi.fn(),
  initialSelectedTools: [],
  ...overrides,
});

describe('CustomToolsSelectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCustomToolsPage.mockResolvedValue({ tools: [], total: 0 });
  });

  it('renders "Create new tool" button in the header alongside search', async () => {
    render(<CustomToolsSelectionDialog {...makeProps()} />);

    // Wait for tools to load and empty state to render
    await waitFor(() => {
      const buttons = screen.getAllByText('tools.customTools.create');
      // Header button is always present regardless of tool count
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens the create wizard without closing the selection dialog when header button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(<CustomToolsSelectionDialog {...makeProps({ onOpenChange })} />);

    await waitFor(() => {
      expect(screen.getAllByText('tools.customTools.create').length).toBeGreaterThanOrEqual(1);
    });

    // Click the first occurrence (header button)
    const createButtons = screen.getAllByText('tools.customTools.create');
    fireEvent.click(createButtons[0].closest('button')!);

    // The wizard should appear without closing the parent selection dialog
    expect(screen.getByTestId('custom-tool-wizard')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes the create wizard when dismissed, keeping the selection dialog open', async () => {
    render(<CustomToolsSelectionDialog {...makeProps()} />);

    await waitFor(() => {
      expect(screen.getAllByText('tools.customTools.create').length).toBeGreaterThanOrEqual(1);
    });

    const createButtons = screen.getAllByText('tools.customTools.create');
    fireEvent.click(createButtons[0].closest('button')!);
    expect(screen.getByTestId('custom-tool-wizard')).toBeTruthy();

    // Close the wizard
    fireEvent.click(screen.getByText('close-wizard'));

    // Wizard should be gone
    await waitFor(() => {
      expect(screen.queryByTestId('custom-tool-wizard')).toBeNull();
    });
  });

  it('reaches the tool past the first page through the search and adds it', async () => {
    serveTools(101);
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<CustomToolsSelectionDialog {...makeProps({ onSave })} />);

    await waitFor(() => expect(screen.getByText('Tool 1')).toBeTruthy());
    await user.type(screen.getByPlaceholderText('dialogs.customTools.searchPlaceholder'), 'Tool 101');
    await user.click(screen.getByText('Tool 101'));
    await user.click(screen.getByText('dialogs.customTools.addSelected'));

    expect(mockListCustomToolsPage).toHaveBeenCalledWith({ skip: 100, limit: 100 });
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ id: 'tool-101' })]);
  });
});
