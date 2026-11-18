import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CountrySelectCombobox } from './CountrySelectCombobox';

// react-phone-number-input's default country picker is a bare native <select>,
// which browsers render as a plain unstyled OS popup (no flags, low contrast,
// can't be themed). This combobox replaces it via the library's
// `countrySelectComponent` extension point — same props contract: value
// (2-letter code), options ({value,label,divider}[]), onChange(code).

const options = [
  { value: 'BR', label: 'Brazil' },
  { value: 'US', label: 'United States' },
  { value: 'FR', label: 'France' },
];

describe('CountrySelectCombobox', () => {
  it('shows the flag for the currently selected country on the trigger', () => {
    render(<CountrySelectCombobox value="BR" options={options} onChange={vi.fn()} />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('🇧🇷');
  });

  it('opens a searchable list of every non-divider option', async () => {
    const user = userEvent.setup();
    render(<CountrySelectCombobox value="BR" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));

    const optionLabels = screen.getAllByRole('option').map(o => o.textContent);
    expect(optionLabels.some(label => label?.includes('Brazil'))).toBe(true);
    expect(optionLabels.some(label => label?.includes('United States'))).toBe(true);
    expect(optionLabels.some(label => label?.includes('France'))).toBe(true);
  });

  it('filters the list as the user types', async () => {
    const user = userEvent.setup();
    render(<CountrySelectCombobox value="BR" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText(/search/i), 'fra');

    const optionLabels = screen.getAllByRole('option').map(o => o.textContent);
    expect(optionLabels.some(label => label?.includes('France'))).toBe(true);
    expect(optionLabels.some(label => label?.includes('Brazil'))).toBe(false);
  });

  it('calls onChange with the selected country code and closes the list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CountrySelectCombobox value="BR" options={options} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('United States'));

    expect(onChange).toHaveBeenCalledWith('US');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<CountrySelectCombobox value="BR" options={options} onChange={vi.fn()} disabled />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
