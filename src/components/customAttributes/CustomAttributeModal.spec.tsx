import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomAttributeModal from './CustomAttributeModal';
import { AttributeDisplayType, type CustomAttributeDefinition } from '@/types/settings';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const existing: CustomAttributeDefinition = {
  id: 'def-1',
  attribute_display_name: 'Plano',
  attribute_display_type: AttributeDisplayType.TEXT,
  attribute_description: 'Plano contratado',
  attribute_key: 'plano',
  attribute_model: 'contact_attribute',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Stored values are filed under the key, so a rename that sent a new key would
// orphan every value already saved on contacts and conversations.
describe('CustomAttributeModal — the key of an existing attribute', () => {
  it('keeps the key when the name is edited', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <CustomAttributeModal open onOpenChange={vi.fn()} attribute={existing} isNew={false} loading={false} onSubmit={onSubmit} />,
    );

    const name = screen.getByLabelText(/modal.fields.displayName.label/);
    await user.clear(name);
    await user.type(name, 'Plano contratado');
    await user.click(screen.getByRole('button', { name: 'actions.update' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ attribute_display_name: 'Plano contratado', attribute_key: 'plano' }),
    );
  });

  it('still derives the key from the name on create', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomAttributeModal open onOpenChange={vi.fn()} isNew loading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/modal.fields.displayName.label/), 'Plano contratado');

    expect(screen.getByLabelText(/modal.fields.attributeKey.label/)).not.toHaveValue('');
  });
});
