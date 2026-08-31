import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TransferRules, { TransferRule } from './TransferRules';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const rule = (id: string): TransferRule => ({
  id,
  transferTo: 'human',
  returnOnFinish: false,
  instructions: '',
});

const renderRules = (rules: TransferRule[], onChange = vi.fn()) => {
  render(<TransferRules rules={rules} onChange={onChange} />);
  return onChange;
};

describe('TransferRules', () => {
  // Gating remove by `rules.length > 1` made the first rule permanent.
  it('lets the user remove the only rule there is', async () => {
    const onChange = renderRules([rule('rule_1')]);

    await userEvent.click(screen.getByRole('button', { name: 'actions.remove' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('removes just the rule whose button was clicked', async () => {
    const onChange = renderRules([rule('rule_1'), rule('rule_2')]);

    const removeButtons = screen.getAllByRole('button', { name: 'actions.remove' });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(removeButtons[1]);

    expect(onChange).toHaveBeenCalledWith([rule('rule_1')]);
  });
});
