import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n/config';
import { TransferRulesModal } from './TransferRulesModal';

vi.mock('@/pages/Customer/Agents/Agent/sections/TransferRules', () => ({
  default: () => <div data-testid="transfer-rules" />,
}));

describe('TransferRulesModal', () => {
  it('renders the shared save footer', () => {
    render(
      <TransferRulesModal open onOpenChange={vi.fn()} rules={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('saves and closes when onSave succeeds', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();
    render(
      <TransferRulesModal
        open
        onOpenChange={onOpenChange}
        rules={[]}
        onChange={vi.fn()}
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
