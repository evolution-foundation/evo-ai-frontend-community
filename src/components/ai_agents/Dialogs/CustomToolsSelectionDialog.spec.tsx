import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import CustomToolsSelectionDialog from './CustomToolsSelectionDialog';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mockListCustomTools = vi.fn();
vi.mock('@/services/agents/customToolsService', () => ({
  listCustomTools: (...args: unknown[]) => mockListCustomTools(...args),
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
    mockListCustomTools.mockResolvedValue([]);
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
});
