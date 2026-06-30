import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en', changeLanguage: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: {
    transformToFrontendFormat: vi.fn(),
  },
  usesStructuredComponents: (ct: string) => ct === 'Channel::Whatsapp',
  getChannelTemplateConfig: (ct: string) => ({
    supportsMedia: true,
    supportsButtons: true,
    supportsStructured: ct === 'Channel::Whatsapp',
    categories: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    templateTypes: ['text', 'interactive', 'media'],
  }),
}));

vi.mock('@evoapi/design-system', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: ReactNode;
      value?: string | null;
      onValueChange?: (value: string) => void;
      disabled?: boolean;
    }) => (
      <select
        data-testid="ds-select"
        disabled={disabled}
        value={value || ''}
        onChange={e => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  };
});

import TemplateFormModal from './TemplateFormModal';

beforeEach(() => vi.clearAllMocks());

describe('TemplateFormModal', () => {
  it('renders the structured body editor for a WhatsApp channel and saves form data', () => {
    const onSave = vi.fn();
    render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Whatsapp"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.namePlaceholder'), {
      target: { value: 'promo' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.bodyTextPlaceholder'), {
      target: { value: 'Body {{1}}' },
    });
    fireEvent.click(screen.getByText('settings.messageTemplates.form.create'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'promo', bodyText: 'Body {{1}}' }));
  });

  it('offers a "none" header option for structured channels (mockup default)', () => {
    render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Whatsapp"
        headerNoneLabel="no-header"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const headerSelect = screen
      .getAllByTestId('ds-select')
      .find(s => s.querySelector('option[value="NONE"]')) as HTMLSelectElement | undefined;
    expect(headerSelect).toBeTruthy();
    expect(headerSelect!.querySelector('option[value="NONE"]')?.textContent).toBe('no-header');
    // Default header is NONE → no header-text input is shown.
    expect(
      screen.queryByPlaceholderText('settings.messageTemplates.form.headerTextPlaceholder'),
    ).not.toBeInTheDocument();
  });

  it('inserts a NAMED {{variable}} placeholder via the optional helper (never an empty token)', async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Whatsapp"
        insertVariableLabel="insert-var"
        variableHelpText="variables are optional"
        variableSampleName="myvar"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const body = screen.getByPlaceholderText(
      'settings.messageTemplates.form.bodyTextPlaceholder',
    ) as HTMLTextAreaElement;
    expect(body.value).toBe('');
    // Open the helper popover (the trigger carries the aria-label)…
    await user.click(screen.getByRole('button', { name: 'insert-var' }));
    expect(await screen.findByText('variables are optional')).toBeInTheDocument();
    // …then click the insert action inside the popover (the later same-named button).
    const actions = await screen.findAllByRole('button', { name: 'insert-var' });
    await user.click(actions[actions.length - 1]);
    expect(
      (screen.getByPlaceholderText(
        'settings.messageTemplates.form.bodyTextPlaceholder',
      ) as HTMLTextAreaElement).value,
    ).toBe('{{myvar}}');
  });

  it('does not accumulate stale Variables rows while a {{token}} is edited', () => {
    render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Whatsapp"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const body = screen.getByPlaceholderText(
      'settings.messageTemplates.form.bodyTextPlaceholder',
    ) as HTMLTextAreaElement;
    // Simulate renaming a token: each value is a COMPLETE match, like overtyping
    // the inserted placeholder character by character.
    fireEvent.change(body, { target: { value: 'Hi {{a}}' } });
    fireEvent.change(body, { target: { value: 'Hi {{ab}}' } });
    fireEvent.change(body, { target: { value: 'Hi {{abc}}' } });
    // Only the current token remains; the intermediate names must be gone.
    expect(screen.getAllByDisplayValue('abc').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('a')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('ab')).not.toBeInTheDocument();
  });

  it('renders the simple content editor for a non-structured channel', () => {
    render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Api"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText('settings.messageTemplates.form.contentPlaceholder'),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('settings.messageTemplates.form.bodyTextPlaceholder'),
    ).not.toBeInTheDocument();
  });

  it('shows the channel/provider selector when channelOptions are given (disabled in edit mode)', () => {
    const { rerender } = render(
      <TemplateFormModal
        isOpen
        mode="create"
        channelType="Channel::Api"
        channelSelectLabel="provider"
        channelOptions={[
          { value: 'Channel::Api', label: 'generic' },
          { value: 'Channel::Email', label: 'email' },
        ]}
        onChannelTypeChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const providerSelect = screen
      .getAllByTestId('ds-select')
      .find(s => s.querySelector('option[value="Channel::Email"]'));
    expect(providerSelect).toBeTruthy();
    expect(providerSelect).not.toBeDisabled();

    rerender(
      <TemplateFormModal
        isOpen
        mode="edit"
        channelType="Channel::Email"
        channelSelectLabel="provider"
        channelOptions={[
          { value: 'Channel::Api', label: 'generic' },
          { value: 'Channel::Email', label: 'email' },
        ]}
        onChannelTypeChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const editProviderSelect = screen
      .getAllByTestId('ds-select')
      .find(s => s.querySelector('option[value="Channel::Email"]'));
    expect(editProviderSelect).toBeDisabled();
  });
});
