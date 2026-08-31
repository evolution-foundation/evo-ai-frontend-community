import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n/config';
import ContactEditModal from './ContactEditModal';
import { ContactEditConfig } from '@/pages/Customer/Agents/Agent/sections/ContactEditRules';

vi.mock('@/pages/Customer/Agents/Agent/sections/ContactEditRules', () => ({
  default: () => <div data-testid="contact-edit-rules" />,
}));

const makeConfig = (instructions: string): ContactEditConfig => ({
  enabled: true,
  editableFields: [],
  instructions,
});

describe('ContactEditModal', () => {
  it('renders the shared save footer', () => {
    render(
      <ContactEditModal
        open
        onOpenChange={vi.fn()}
        config={makeConfig('')}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('restores the config captured at open when cancelled after edits', async () => {
    const initial = makeConfig('before');
    const edited = makeConfig('after');
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ContactEditModal open config={initial} onChange={onChange} onOpenChange={onOpenChange} />,
    );
    rerender(
      <ContactEditModal open config={edited} onChange={onChange} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).toHaveBeenCalledWith(initial);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
