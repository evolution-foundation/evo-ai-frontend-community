import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateCustomAttributePanel } from './UpdateCustomAttributePanel';
import { UpdateCustomAttributeNodeData } from './UpdateCustomAttributeNode';
import '@/i18n/config';

vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: {
    getCustomAttributes: vi.fn(),
  },
}));

import { customAttributesService } from '@/services/customAttributes/customAttributesService';

const mockGetCustomAttributes =
  customAttributesService.getCustomAttributes as unknown as ReturnType<typeof vi.fn>;

// Display name and slug deliberately differ so the test proves the node-data
// persists the slug (attribute_key) while the UI shows the display name.
const PLAN_INTEREST_ATTR = {
  id: 'attr-1',
  attribute_key: 'plan_interest',
  attribute_display_name: 'Plan Interest',
  attribute_display_type: 'text',
  attribute_model: 'contact_attribute',
};

function emptyData(): UpdateCustomAttributeNodeData {
  return { label: 'Update Custom Attribute' } as UpdateCustomAttributeNodeData;
}

function getAttributeTrigger(): HTMLElement {
  // The attribute selector is the only combobox before a value field renders.
  return screen.getAllByRole('combobox')[0];
}

beforeEach(() => {
  mockGetCustomAttributes.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('UpdateCustomAttributePanel — persists attribute_key (EVO-1850)', () => {
  it('saves attributeName=attribute_key (slug) and attributeDisplayName=display name', async () => {
    mockGetCustomAttributes.mockResolvedValue({ data: [PLAN_INTEREST_ATTR] });
    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <UpdateCustomAttributePanel
        nodeId="n1"
        data={emptyData()}
        onUpdate={onUpdate}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() =>
      expect(mockGetCustomAttributes).toHaveBeenCalledWith('contact_attribute'),
    );

    // Pick the attribute by its human-readable display name.
    await user.click(getAttributeTrigger());
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Plan Interest'));

    // Set a value so the form is valid + dirty (Save is gated on both).
    const valueInput = await screen.findByRole('textbox');
    await user.type(valueInput, 'gold');

    const saveBtn = await screen.findByRole('button', {
      name: /save|salvar|guardar|enregistrer|salva/i,
    });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    expect(onUpdate).toHaveBeenCalled();
    const [, updatedData] = onUpdate.mock.calls[0];
    expect(updatedData).toMatchObject({
      attributeId: 'attr-1',
      attributeName: 'plan_interest', // slug — the CRM api key
      attributeDisplayName: 'Plan Interest', // human label, UI only
      newValue: 'gold',
    });
  });

  it('shows the display name (not the slug) in the preview', async () => {
    mockGetCustomAttributes.mockResolvedValue({ data: [PLAN_INTEREST_ATTR] });
    const user = userEvent.setup();

    render(
      <UpdateCustomAttributePanel
        nodeId="n1"
        data={emptyData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() => expect(mockGetCustomAttributes).toHaveBeenCalled());

    await user.click(getAttributeTrigger());
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Plan Interest'));

    const valueInput = await screen.findByRole('textbox');
    await user.type(valueInput, 'gold');

    // The display name is shown; the raw slug must never surface in the UI.
    await waitFor(() => expect(screen.getAllByText('Plan Interest').length).toBeGreaterThan(0));
    expect(screen.queryByText('plan_interest')).toBeNull();
  });
});
