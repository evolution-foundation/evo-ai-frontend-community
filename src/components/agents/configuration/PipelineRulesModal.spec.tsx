import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n/config';
import { PipelineRulesModal } from './PipelineRulesModal';
import { PipelineRule } from '@/pages/Customer/Agents/Agent/sections/PipelineRules';

vi.mock('@/pages/Customer/Agents/Agent/sections/PipelineRules', () => ({
  default: () => <div data-testid="pipeline-rules" />,
}));

const makeRule = (id: string): PipelineRule => ({
  id,
  pipelineId: `pipe-${id}`,
  allowTasks: false,
  allowServices: false,
  generalInstructions: '',
  stages: [],
});

const renderModal = (props: Partial<Parameters<typeof PipelineRulesModal>[0]> = {}) => {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    rules: [] as PipelineRule[],
    onChange: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<PipelineRulesModal {...merged} />), props: merged };
};

describe('PipelineRulesModal', () => {
  // Guards the i18n keys: a missing key makes t() return the raw key path,
  // which is truthy and would render verbatim on the buttons.
  it('renders translated footer labels, not raw i18n keys', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByText(/modalFooter/)).toBeNull();
  });

  it('saves and closes when onSave succeeds', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { props } = renderModal({ onSave });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });

  it('stays open when onSave reports failure', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const { props } = renderModal({ onSave });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it('just closes on Save when no onSave is wired', async () => {
    const { props } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false));
  });

  it('disables the footer and shows the saving label while saving', () => {
    renderModal({ onSave: vi.fn(), isSaving: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('ignores Escape while saving', async () => {
    const { props } = renderModal({ onSave: vi.fn(), isSaving: true });
    await userEvent.keyboard('{Escape}');
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it('restores the rules captured at open when cancelled after edits', async () => {
    const initial = [makeRule('a')];
    const edited = [makeRule('a'), makeRule('b')];
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <PipelineRulesModal open rules={initial} onChange={onChange} onOpenChange={onOpenChange} />,
    );
    rerender(
      <PipelineRulesModal open rules={edited} onChange={onChange} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).toHaveBeenCalledWith(initial);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not touch the rules when cancelled without edits', async () => {
    const { props } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
