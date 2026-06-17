import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// Stub the picker so the form test stays focused on mode-switching/wiring.
vi.mock('./GlobalTemplateSelect', () => ({
  default: ({ value }: { value?: string | null }) => (
    <div data-testid="global-template-select">{value || 'none'}</div>
  ),
}));

// Interactive Switch so the "use template" toggle can be exercised.
vi.mock('@evoapi/design-system', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} />
  ),
}));

import GreetingSettingsForm from './GreetingSettingsForm';

const base = {
  greeting_enabled: true,
  greeting_message: '',
  greeting_message_template_id: null as string | null,
};

beforeEach(() => vi.clearAllMocks());

describe('GreetingSettingsForm', () => {
  it('shows the free-text message by default (no template ref)', () => {
    render(<GreetingSettingsForm formData={base} onFormChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText('settings.greeting.message.placeholder'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('global-template-select')).not.toBeInTheDocument();
  });

  it('starts in template mode when a template id is already set', () => {
    render(
      <GreetingSettingsForm
        formData={{ ...base, greeting_message_template_id: 'tpl-1' }}
        onFormChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('global-template-select')).toHaveTextContent('tpl-1');
    expect(
      screen.queryByPlaceholderText('settings.greeting.message.placeholder'),
    ).not.toBeInTheDocument();
  });

  it('switches to the template picker when "use template" is toggled on', () => {
    render(<GreetingSettingsForm formData={base} onFormChange={vi.fn()} />);
    // switches: [0] greeting_enabled, [1] use-template
    fireEvent.click(screen.getAllByRole('switch')[1]);
    expect(screen.getByTestId('global-template-select')).toBeInTheDocument();
  });

  it('clears the template ref when "use template" is toggled off', () => {
    const onFormChange = vi.fn();
    render(
      <GreetingSettingsForm
        formData={{ ...base, greeting_message_template_id: 'tpl-1' }}
        onFormChange={onFormChange}
      />,
    );
    fireEvent.click(screen.getAllByRole('switch')[1]); // ON -> OFF
    expect(onFormChange).toHaveBeenCalledWith({ greeting_message_template_id: null });
  });
});
