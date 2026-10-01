import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WebWidgetAdvancedForm from './WebWidgetAdvancedForm';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
}));

describe('WebWidgetAdvancedForm locale selector', () => {
  it("sends null when the visitor's browser language is selected", () => {
    const onFormChange = vi.fn();

    render(
      <WebWidgetAdvancedForm
        formData={{
          reply_time: 'in_a_few_minutes',
          locale: 'pt_BR',
          enable_email_collect: false,
          allow_messages_after_resolved: true,
          continuity_via_email: true,
          selected_feature_flags: [],
        }}
        onFormChange={onFormChange}
        onFeatureFlagChange={vi.fn()}
      />,
    );

    const selectors = screen.getAllByRole('combobox');
    fireEvent.change(selectors[1], { target: { value: '' } });

    expect(onFormChange).toHaveBeenCalledWith({ locale: null });
  });

  it('sends locale value when an explicit locale is selected', () => {
    const onFormChange = vi.fn();

    render(
      <WebWidgetAdvancedForm
        formData={{
          reply_time: 'in_a_few_minutes',
          locale: null,
          enable_email_collect: false,
          allow_messages_after_resolved: true,
          continuity_via_email: true,
          selected_feature_flags: [],
        }}
        onFormChange={onFormChange}
        onFeatureFlagChange={vi.fn()}
      />,
    );

    const selectors = screen.getAllByRole('combobox');
    fireEvent.change(selectors[1], { target: { value: 'en' } });

    expect(onFormChange).toHaveBeenCalledWith({ locale: 'en' });
  });
});
