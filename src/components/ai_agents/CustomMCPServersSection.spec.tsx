import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomMCPServersSection from './CustomMCPServersSection';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('./Dialogs/CustomMCPDialog', () => ({
  default: () => null,
}));

describe('CustomMCPServersSection', () => {
  // `showAddButton={false}` must not take away the only path to remove a server.
  it('keeps the remove button when the caller hides the add button', async () => {
    const onCustomMCPServersChange = vi.fn();
    render(
      <CustomMCPServersSection
        customMCPServerIds={['mcp-a', 'mcp-b']}
        onCustomMCPServersChange={onCustomMCPServersChange}
        showAddButton={false}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: 'actions.remove' });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(removeButtons[0]);
    expect(onCustomMCPServersChange).toHaveBeenCalledWith(['mcp-b']);
  });

  it('drops every action when read only', () => {
    render(
      <CustomMCPServersSection
        customMCPServerIds={['mcp-a']}
        onCustomMCPServersChange={vi.fn()}
        isReadOnly
      />
    );

    expect(screen.queryByRole('button', { name: 'actions.remove' })).toBeNull();
  });

  it('offers a way out of the empty state even with the add button hidden', () => {
    const onAdd = vi.fn();
    render(
      <CustomMCPServersSection
        customMCPServerIds={[]}
        onCustomMCPServersChange={vi.fn()}
        showAddButton={false}
        onAdd={onAdd}
      />
    );

    expect(screen.getByText('customMCPServers.add')).toBeTruthy();
  });
});
