import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ getTemplates: vi.fn() }));

vi.mock('@/services/messageTemplates/globalMessageTemplatesService', () => ({
  default: { getTemplates: h.getTemplates },
}));

// Render the design-system Select as a native <select> so options are assertable.
vi.mock('@evoapi/design-system', () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: ReactNode;
    value?: string | null;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="select"
      disabled={disabled}
      value={value || ''}
      onChange={e => onValueChange(e.target.value)}
    >
      <option value="" hidden />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import GlobalTemplateSelect from './GlobalTemplateSelect';

beforeEach(() => {
  vi.clearAllMocks();
  h.getTemplates.mockResolvedValue({
    success: true,
    data: [
      { id: 't1', name: 'welcome', language: 'en' },
      { id: 't2', name: 'goodbye', language: 'pt_BR' },
    ],
    meta: {},
    message: '',
  });
});

describe('GlobalTemplateSelect', () => {
  it('lists global templates from the flat endpoint and emits the selected id', async () => {
    const onChange = vi.fn();
    render(<GlobalTemplateSelect value={null} onChange={onChange} placeholder="ph" emptyText="empty" />);

    expect(h.getTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 200, sort_by: 'name' }),
    );

    // One option per template once the fetch resolves (the hidden empty option
    // is excluded from the accessibility tree).
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));

    fireEvent.change(screen.getByTestId('select'), { target: { value: 't2' } });
    expect(onChange).toHaveBeenCalledWith('t2');
  });

  it('is disabled when there are no global templates', async () => {
    h.getTemplates.mockResolvedValue({ success: true, data: [], meta: {}, message: '' });
    render(<GlobalTemplateSelect value={null} onChange={vi.fn()} placeholder="ph" emptyText="empty" />);
    await waitFor(() => expect(screen.getByTestId('select')).toBeDisabled());
  });
});
