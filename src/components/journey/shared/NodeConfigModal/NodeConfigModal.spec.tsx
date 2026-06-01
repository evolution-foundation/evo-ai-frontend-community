import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodeConfigModal, type NodeConfigModalTab } from './NodeConfigModal';

const baseProps = {
  open: true,
  onCancel: vi.fn(),
  onSave: vi.fn(),
  title: 'Configure node',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('NodeConfigModal — common chrome', () => {
  it('renders title and optional description in the header', () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="simple"
        description="Body text here."
      >
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Configure node')).toBeTruthy();
    expect(screen.getByText('Body text here.')).toBeTruthy();
  });

  it('paints the panel chrome with --color-flow-panel-* utilities', () => {
    render(
      <NodeConfigModal {...baseProps} variant="simple">
        body
      </NodeConfigModal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('bg-flow-panel-bg');
    expect(dialog.querySelector('.bg-flow-panel-header-bg')).not.toBeNull();
    expect(dialog.querySelector('.border-flow-panel-divider')).not.toBeNull();
  });

  it('keeps Save disabled when dirty is unset and enables it when dirty=true', () => {
    const { rerender } = render(
      <NodeConfigModal {...baseProps} variant="simple">
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    rerender(
      <NodeConfigModal {...baseProps} variant="simple" dirty>
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('keeps Save disabled when saveDisabled is true even if dirty (EVO-1275)', () => {
    const { rerender } = render(
      <NodeConfigModal {...baseProps} variant="simple" dirty saveDisabled>
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Clearing saveDisabled (while still dirty) re-enables Save.
    rerender(
      <NodeConfigModal {...baseProps} variant="simple" dirty saveDisabled={false}>
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('disables both Save and Cancel while loading', () => {
    render(
      <NodeConfigModal {...baseProps} variant="simple" dirty loading>
        body
      </NodeConfigModal>,
    );
    // accessible name during loading is "Saving… Save" because of the sr-only label
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <NodeConfigModal {...baseProps} onCancel={onCancel} variant="simple">
        body
      </NodeConfigModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when the Save button is clicked (dirty=true)', async () => {
    const onSave = vi.fn();
    render(
      <NodeConfigModal {...baseProps} onSave={onSave} variant="simple" dirty>
        body
      </NodeConfigModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the user presses Escape (Radix dialog close)', async () => {
    const onCancel = vi.fn();
    render(
      <NodeConfigModal {...baseProps} onCancel={onCancel} variant="simple">
        body
      </NodeConfigModal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('honors consumer-provided saveLabel and cancelLabel', () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="simple"
        saveLabel="Aplicar"
        cancelLabel="Voltar"
        dirty
      >
        body
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeTruthy();
  });

  it('renders the icon when provided and omits the slot when undefined', () => {
    const { rerender } = render(
      <NodeConfigModal
        {...baseProps}
        variant="simple"
        icon={<svg data-testid="cat-icon" />}
      >
        body
      </NodeConfigModal>,
    );
    expect(screen.getByTestId('cat-icon')).toBeTruthy();
    rerender(
      <NodeConfigModal {...baseProps} variant="simple">
        body
      </NodeConfigModal>,
    );
    expect(screen.queryByTestId('cat-icon')).toBeNull();
  });

  it('calls onCancel when the built-in close button (X) is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <NodeConfigModal {...baseProps} onCancel={onCancel} variant="simple">
        body
      </NodeConfigModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('announces the saving label to assistive tech while loading', () => {
    render(
      <NodeConfigModal {...baseProps} variant="simple" dirty loading>
        body
      </NodeConfigModal>,
    );
    expect(screen.getByText('Saving...')).toBeTruthy();
  });
});

describe('NodeConfigModal — variant="tabs"', () => {
  const TABS: NodeConfigModalTab[] = [
    { value: 'basic', label: 'Basic', content: <div>basic body</div> },
    { value: 'advanced', label: 'Advanced', content: <div>advanced body</div> },
  ];

  it('renders the first tab by default and shows its content', () => {
    render(
      <NodeConfigModal {...baseProps} variant="tabs" tabs={TABS}>
        body
      </NodeConfigModal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('basic body')).toBeTruthy();
  });

  it('honors defaultTab when provided', () => {
    render(
      <NodeConfigModal {...baseProps} variant="tabs" tabs={TABS} defaultTab="advanced">
        body
      </NodeConfigModal>,
    );
    expect(screen.getByText('advanced body')).toBeTruthy();
  });

  it('fires onTabChange when the user switches tabs', async () => {
    const onTabChange = vi.fn();
    render(
      <NodeConfigModal
        {...baseProps}
        variant="tabs"
        tabs={TABS}
        onTabChange={onTabChange}
      >
        body
      </NodeConfigModal>,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(onTabChange).toHaveBeenCalledWith('advanced');
  });

  it('preserves lifted form state across tab switches (AC-4)', async () => {
    function Host() {
      const [text, setText] = useState('initial');
      return (
        <NodeConfigModal
          {...baseProps}
          variant="tabs"
          tabs={[
            {
              value: 'basic',
              label: 'Basic',
              content: (
                <input
                  aria-label="basic-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              ),
            },
            {
              value: 'advanced',
              label: 'Advanced',
              content: <div>advanced-pane</div>,
            },
          ]}
        >
          body
        </NodeConfigModal>
      );
    }
    render(<Host />);
    const input = screen.getByLabelText('basic-input') as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'changed');
    await userEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(screen.getByText('advanced-pane')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Basic' }));
    expect((screen.getByLabelText('basic-input') as HTMLInputElement).value).toBe('changed');
  });
});

describe('NodeConfigModal — variant="disclosure"', () => {
  it('renders the base body and a collapsed "Advanced settings" toggle by default', () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="disclosure"
        advanced={<div>advanced body</div>}
      >
        <div>basic body</div>
      </NodeConfigModal>,
    );
    expect(screen.getByText('basic body')).toBeTruthy();
    expect(screen.getByRole('button', { name: /advanced settings/i })).toBeTruthy();
    expect(screen.queryByText('advanced body')).toBeNull();
  });

  it('reveals advanced content when the disclosure trigger is clicked', async () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="disclosure"
        advanced={<div>advanced body</div>}
      >
        <div>basic body</div>
      </NodeConfigModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: /advanced settings/i }));
    expect(screen.getByText('advanced body')).toBeTruthy();
  });

  it('honors defaultAdvancedOpen when provided', () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="disclosure"
        advanced={<div>advanced body</div>}
        defaultAdvancedOpen
      >
        <div>basic body</div>
      </NodeConfigModal>,
    );
    expect(screen.getByText('advanced body')).toBeTruthy();
  });

  it('uses a consumer-provided advancedLabel when set', () => {
    render(
      <NodeConfigModal
        {...baseProps}
        variant="disclosure"
        advanced={<div>advanced body</div>}
        advancedLabel="Mais opções"
      >
        <div>basic body</div>
      </NodeConfigModal>,
    );
    expect(screen.getByRole('button', { name: /mais opções/i })).toBeTruthy();
  });
});
