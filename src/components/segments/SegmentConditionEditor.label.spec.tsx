import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n/config';
import type { LabelNode } from '@/types/analytics';
import SegmentConditionEditor from './SegmentConditionEditor';

// Radix Select jsdom polyfills (same as SegmentConditionEditor.performed.spec.tsx).
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// hoisted: vi.mock factories run before module-level consts are initialized.
const VIP = vi.hoisted(() => ({
  id: '3f1c9a20-0000-4000-8000-000000000001',
  title: 'VIP',
  color: '#ff0000',
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [VIP] }) },
}));
vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: { getCustomAttributes: vi.fn().mockResolvedValue({ data: [] }) },
}));

function renderLabel(condition: LabelNode) {
  const onUpdate = vi.fn();
  render(<SegmentConditionEditor condition={condition} index={0} onUpdate={onUpdate} onRemove={vi.fn()} />);
  return { onUpdate };
}

// The Label block has two comboboxes (label, has/not_has) plus the condition-type
// selector; the label one is the only one showing the placeholder. It only settles
// after loadLabels() resolves, so wait for it.
async function labelCombobox(): Promise<HTMLElement> {
  let el: HTMLElement | undefined;
  await waitFor(() => {
    el = screen.getAllByRole('combobox').find((c) => c.textContent?.includes('Select a label'));
    expect(el).toBeDefined();
  });
  return el as HTMLElement;
}

// CRM-215: the CRM emits the Label UUID in `contact.label.*` traits and evo-flow
// matches on it, so the editor must store the id — it used to store the title.
describe('SegmentConditionEditor — Label condition (CRM-215)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('stores the label id, not its title, when one is picked', async () => {
    const { onUpdate } = renderLabel({ id: 'n1', type: 'Label', labelId: '', condition: 'has' } as LabelNode);
    const user = userEvent.setup();

    await user.click(await labelCombobox());
    await user.click(within(await screen.findByRole('listbox')).getByText('VIP'));

    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ labelId: VIP.id }));
    expect(onUpdate).not.toHaveBeenCalledWith(0, expect.objectContaining({ labelId: 'VIP' }));
  });

  // A definition saved by the old editor carries the title; it migrates to the id
  // once the labels load, so it starts matching on the next save.
  it('migrates a legacy definition that holds the label title', async () => {
    const { onUpdate } = renderLabel({ id: 'n1', type: 'Label', labelId: 'VIP', condition: 'has' } as LabelNode);

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ labelId: VIP.id })),
    );
  });

  it('leaves a definition that already holds the id alone', async () => {
    const { onUpdate } = renderLabel({ id: 'n1', type: 'Label', labelId: VIP.id, condition: 'has' } as LabelNode);

    await screen.findByText('VIP');
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
