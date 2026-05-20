import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JourneyEditorHeader } from './JourneyEditorHeader';

const baseProps = {
  onBack: vi.fn(),
  title: 'Journey Editor: onboarding',
  onViewSessions: vi.fn(),
  onSave: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('JourneyEditorHeader — layout', () => {
  it('renders 3 distinct zones (navigation / identity / actions)', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    expect(container.querySelector('[data-zone="navigation"]')).not.toBeNull();
    expect(container.querySelector('[data-zone="identity"]')).not.toBeNull();
    expect(container.querySelector('[data-zone="actions"]')).not.toBeNull();
  });

  it('renders the title in the identity zone', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    const identity = container.querySelector('[data-zone="identity"]')!;
    expect(identity.textContent).toContain('Journey Editor: onboarding');
  });

  it('renders the subtitle paragraph only when a subtitle prop is provided', () => {
    const { container, rerender } = render(<JourneyEditorHeader {...baseProps} />);
    const identity = container.querySelector('[data-zone="identity"]')!;
    expect(identity.querySelector('p')).toBeNull();

    rerender(
      <JourneyEditorHeader
        {...baseProps}
        subtitle="A short description of the flow"
      />,
    );
    expect(identity.querySelector('p')?.textContent).toBe('A short description of the flow');
  });

  it('paints the panel chrome with --color-flow-panel-* utilities', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    const header = container.querySelector('header')!;
    expect(header.className).toContain('bg-flow-panel-header-bg');
    expect(header.className).toContain('border-flow-panel-divider');
  });

  it('renders environmentSlot when provided', () => {
    render(
      <JourneyEditorHeader
        {...baseProps}
        environmentSlot={<div data-testid="env-trigger">Env</div>}
      />,
    );
    expect(screen.getByTestId('env-trigger')).toBeTruthy();
  });

  it('groups the lastSaved indicator together with the Save button inside a persist cluster', () => {
    const lastSaved = new Date('2026-05-20T14:30:00Z');
    const { container } = render(
      <JourneyEditorHeader
        {...baseProps}
        lastSaved={lastSaved}
        lastSavedFormatter={(d) => `last-saved-${d.toISOString()}`}
      />,
    );
    const cluster = container.querySelector('[data-cluster="persist"]')!;
    expect(cluster).not.toBeNull();
    expect(cluster.textContent).toContain('last-saved-');
    expect(cluster.querySelector('button')).not.toBeNull();
  });
});

describe('JourneyEditorHeader — actions', () => {
  it('calls onBack when the Back button is clicked', async () => {
    const onBack = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('exposes the keyboard shortcut as a tooltip on the Back button', () => {
    render(<JourneyEditorHeader {...baseProps} backLabel="Voltar" backShortcutHint="Esc" />);
    const back = screen.getByRole('button', { name: /voltar/i });
    expect(back.getAttribute('title')).toBe('Voltar (Esc)');
    expect(back.getAttribute('aria-keyshortcuts')).toBe('Escape');
  });

  it('calls onViewSessions when View sessions button is clicked', async () => {
    const onViewSessions = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onViewSessions={onViewSessions} />);
    await userEvent.click(screen.getAllByRole('button', { name: /view sessions/i })[0]);
    expect(onViewSessions).toHaveBeenCalledTimes(1);
  });

  it('keeps Save disabled when hasUnsavedChanges is false and shows the Saved label', () => {
    render(<JourneyEditorHeader {...baseProps} />);
    const save = screen.getByRole('button', { name: /^saved$/i });
    expect(save).toBeDisabled();
  });

  it('enables Save when hasUnsavedChanges and shows the Save label', () => {
    render(<JourneyEditorHeader {...baseProps} hasUnsavedChanges />);
    const save = screen.getByRole('button', { name: /^save$/i });
    expect(save).not.toBeDisabled();
  });

  it('disables Save during isSaving and announces the saving label to assistive tech', () => {
    render(
      <JourneyEditorHeader {...baseProps} hasUnsavedChanges isSaving />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByText('Saving…')).toBeTruthy();
  });

  it('renders the last saved timestamp formatted via consumer formatter when provided', () => {
    const lastSaved = new Date('2026-05-20T14:30:00Z');
    render(
      <JourneyEditorHeader
        {...baseProps}
        lastSaved={lastSaved}
        lastSavedFormatter={(d) => `last-saved-${d.toISOString()}`}
      />,
    );
    expect(screen.getByText(/last-saved-/)).toBeTruthy();
  });

  it('hides the last saved indicator when lastSaved is null/undefined', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    const actions = container.querySelector('[data-zone="actions"]')!;
    expect(actions.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('appends the unsavedChangesHint suffix to lastSaved when dirty', () => {
    const lastSaved = new Date('2026-05-20T14:30:00Z');
    render(
      <JourneyEditorHeader
        {...baseProps}
        hasUnsavedChanges
        lastSaved={lastSaved}
        lastSavedFormatter={() => 'Last save: 14:30'}
        unsavedChangesHint="Auto-save in 10s"
      />,
    );
    expect(screen.getByText(/Last save: 14:30 • Auto-save in 10s/)).toBeTruthy();
  });

  it('does NOT append the unsavedChangesHint when there are no unsaved changes', () => {
    const lastSaved = new Date('2026-05-20T14:30:00Z');
    render(
      <JourneyEditorHeader
        {...baseProps}
        lastSaved={lastSaved}
        lastSavedFormatter={() => 'Last save: 14:30'}
        unsavedChangesHint="Auto-save in 10s"
      />,
    );
    expect(screen.queryByText(/Auto-save in 10s/)).toBeNull();
  });
});

describe('JourneyEditorHeader — keyboard shortcuts', () => {
  it('calls onBack when the user presses Escape outside an input', async () => {
    const onBack = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);
    await userEvent.keyboard('{Escape}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when the user presses Cmd+B (Meta) outside an input', async () => {
    const onBack = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);
    await userEvent.keyboard('{Meta>}b{/Meta}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when the user presses Ctrl+B outside an input', async () => {
    const onBack = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);
    await userEvent.keyboard('{Control>}b{/Control}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onBack when Escape is pressed while focus is in an INPUT', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <input data-testid="external-input" />
      </>,
    );
    const input = screen.getByTestId('external-input');
    input.focus();
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does NOT call onBack when Cmd+B is pressed while focus is in an INPUT', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <input data-testid="external-input" />
      </>,
    );
    const input = screen.getByTestId('external-input');
    input.focus();
    await userEvent.keyboard('{Meta>}b{/Meta}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does NOT call onBack when Escape is pressed while focus is in a TEXTAREA', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <textarea data-testid="external-textarea" />
      </>,
    );
    const textarea = screen.getByTestId('external-textarea');
    textarea.focus();
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does NOT call onBack when Escape is pressed while focus is in a contentEditable element', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <div data-testid="rich-text" contentEditable suppressContentEditableWarning />
      </>,
    );
    const editor = screen.getByTestId('rich-text');
    editor.focus();
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does NOT call onBack when an open Radix overlay (role=dialog, data-state=open) is present', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <div role="dialog" data-state="open" data-testid="open-dialog" />
      </>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('does NOT call onBack when an open role=menu overlay is present (kebab open)', async () => {
    const onBack = vi.fn();
    render(
      <>
        <JourneyEditorHeader {...baseProps} onBack={onBack} />
        <div role="menu" data-state="open" data-testid="open-menu" />
      </>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('cleans up the keydown listener on unmount', async () => {
    const onBack = vi.fn();
    const { unmount } = render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);
    unmount();
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('JourneyEditorHeader — responsive kebab', () => {
  it('renders a kebab DropdownMenu trigger labeled by moreActionsLabel', () => {
    render(
      <JourneyEditorHeader
        {...baseProps}
        moreActionsLabel="Mais ações"
      />,
    );
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeTruthy();
  });

  it('exposes onViewSessions through the kebab menu item', async () => {
    const onViewSessions = vi.fn();
    render(
      <JourneyEditorHeader
        {...baseProps}
        onViewSessions={onViewSessions}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }));
    const items = await screen.findAllByRole('menuitem');
    const viewSessionsItem = items.find((el) => /view sessions/i.test(el.textContent ?? ''));
    expect(viewSessionsItem).toBeDefined();
    await userEvent.click(viewSessionsItem!);
    expect(onViewSessions).toHaveBeenCalledTimes(1);
  });
});
