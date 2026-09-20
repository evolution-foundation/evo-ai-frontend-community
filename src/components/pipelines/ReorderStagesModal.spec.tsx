import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReorderStagesModal from './ReorderStagesModal';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const stages = Array.from({ length: 8 }, (_, i) => ({
  id: `stage-${i + 1}`,
  name: `Stage ${i + 1}`,
  color: '#3b82f6',
  position: i + 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}));

const renderModal = () =>
  render(
    <ReorderStagesModal
      open
      onOpenChange={vi.fn()}
      stages={stages}
      onSubmit={vi.fn()}
      loading={false}
    />,
  );

// Guards the CRM-382 containment contract: the dialog is a flex column whose
// only scroll area is the stage list, so the footer can never be clipped.
describe('ReorderStagesModal — viewport containment (CRM-382)', () => {
  it('drops the design-system grid display in favour of a flex column', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');

    // tailwind-merge must resolve the display conflict our way; if the base
    // `grid` survived, the list would stop absorbing the overflow.
    expect(dialog.className).toContain('flex');
    expect(dialog.className).toContain('flex-col');
    expect(dialog.className).not.toContain('grid');
  });

  it('makes the stage list the only elastic scroll area', () => {
    renderModal();
    const list = screen.getByText('Stage 1').closest('.overflow-y-auto');

    expect(list).not.toBeNull();
    expect(list!.className).toContain('flex-1');
    expect(list!.className).toContain('min-h-0');
    // A max-height of its own would re-introduce the fixed 60vh that overflowed.
    expect(list!.className).not.toMatch(/max-h-\[/);
  });

  it('keeps the footer buttons outside the scroll area', () => {
    renderModal();
    const scrollArea = screen.getByText('Stage 1').closest('.overflow-y-auto');
    const save = screen.getByText('reorderStages.save');

    expect(scrollArea!.contains(save)).toBe(false);
  });

  it('reveals the row controls on keyboard focus, not only on hover', () => {
    renderModal();
    const moveUp = screen.getAllByRole('button', { name: '' })[0];

    expect(moveUp.className).toContain('group-focus-within:opacity-100');
  });
});
