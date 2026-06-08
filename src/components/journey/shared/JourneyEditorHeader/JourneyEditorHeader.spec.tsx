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

  it('exposes the full title via the title attribute on h1 (fallback when truncated)', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    const h1 = container.querySelector('[data-zone="identity"] h1')!;
    expect(h1.getAttribute('title')).toBe('Journey Editor: onboarding');
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

  it('does NOT install a global keydown listener for ESC or Cmd/Ctrl+B', async () => {
    const onBack = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onBack={onBack} />);

    document.body.focus();
    await userEvent.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();

    await userEvent.keyboard('{Meta>}b{/Meta}');
    expect(onBack).not.toHaveBeenCalled();

    await userEvent.keyboard('{Control>}b{/Control}');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('calls onViewSessions when the inline View sessions button is clicked', async () => {
    const onViewSessions = vi.fn();
    render(<JourneyEditorHeader {...baseProps} onViewSessions={onViewSessions} />);
    const buttons = screen.getAllByRole('button', { name: /view sessions/i });
    expect(buttons.length).toBeGreaterThan(0);
    await userEvent.click(buttons[0]);
    expect(onViewSessions).toHaveBeenCalledTimes(1);
  });

  it('exposes a compact icon-only View sessions button at narrow viewports with aria-label', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} />);
    const iconOnly = container.querySelector('[data-zone="actions"] button.md\\:hidden');
    expect(iconOnly).not.toBeNull();
    expect(iconOnly!.getAttribute('aria-label')).toBe('View sessions');
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
    render(<JourneyEditorHeader {...baseProps} hasUnsavedChanges isSaving />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByText('Saving…')).toBeTruthy();
  });

  it('wraps the Save button in an aria-live="polite" region so Save → Saving… → Saved transitions are announced', () => {
    const { container } = render(<JourneyEditorHeader {...baseProps} hasUnsavedChanges />);
    const persist = container.querySelector('[data-cluster="persist"]')!;
    const live = persist.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.querySelector('button')?.textContent?.toLowerCase()).toContain('save');
  });

  it('does NOT mark the lastSaved timestamp with aria-live (passive status, would re-announce on every tick)', () => {
    const lastSaved = new Date('2026-05-20T14:30:00Z');
    const { container } = render(
      <JourneyEditorHeader
        {...baseProps}
        lastSaved={lastSaved}
        lastSavedFormatter={(d) => `last-saved-${d.toISOString()}`}
      />,
    );
    const liveRegions = container.querySelectorAll('[aria-live="polite"]');
    for (const region of Array.from(liveRegions)) {
      expect(region.textContent).not.toMatch(/last-saved-/);
    }
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
    const persist = container.querySelector('[data-cluster="persist"]')!;
    expect(persist.querySelector('span')).toBeNull();
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

  it('renders Back as a prominent outline button (not the lowest-emphasis ghost variant)', () => {
    render(<JourneyEditorHeader {...baseProps} />);
    const back = screen.getByRole('button', { name: /back/i });
    // outline variant has a transparent background + border ring; ghost has no border.
    expect(back.className).not.toContain('bg-transparent');
    expect(back.className).toContain('border');
  });
});
