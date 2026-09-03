import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PreChatForm } from './PreChatForm';
import type { PreChatField, WidgetConfig } from '@/types/settings';

// The phone field on the widget's pre-chat form is supposed to render as a
// country-select + digits input (PhoneNumberField), not a plain text box —
// see the dedicated `case 'phone':` branches for both validation and
// rendering in PreChatForm.tsx. That branch only fires when field.type is
// literally 'phone'. getDefaultPreChatFields() (preChatHelpers.ts) sets the
// phoneNumber field's type to 'text', so it silently falls through to the
// generic text-input branch and never shows the country dropdown, even when
// an admin enables the field in channel settings.

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
  }),
}));

const phoneField = (overrides: Partial<PreChatField> = {}): PreChatField => ({
  name: 'phoneNumber',
  type: 'text',
  label: 'Phone number',
  placeholder: '',
  required: false,
  enabled: true,
  field_type: 'standard',
  ...overrides,
});

const baseConfig = (fields: PreChatField[]): WidgetConfig => ({
  preChatFormEnabled: true,
  preChatMessage: '',
  preChatFields: fields,
});

describe('PreChatForm phone field', () => {
  it('renders the country-select dropdown when the field type is "phone"', () => {
    render(
      <PreChatForm
        config={baseConfig([phoneField({ type: 'phone' })])}
        currentUser={{}}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('still renders the country-select dropdown for a field stored with the legacy "text" type (EVO pre-chat default bug)', () => {
    render(
      <PreChatForm
        config={baseConfig([phoneField({ type: 'text' })])}
        currentUser={{}}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
