import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssignBotPanel } from './AssignBotPanel';
import { AssignBotNodeData } from './AssignBotNode';
import '@/i18n/config';

function makeData(overrides: Partial<AssignBotNodeData> = {}): AssignBotNodeData {
  return {
    label: 'Assign Bot',
    formDataOptions: {
      bots: [{ id: 'bot-1', name: 'Support Bot', bot_type: 'webhook' }],
      inboxes: [{ id: 'inbox-1', name: 'Main Inbox', channel_type: 'Channel::Api' }],
    },
    ...overrides,
  };
}

// AssignBotPanelProps used to type onUpdate as `(nodeId: string, data: any) => void`
// (and `data` as an untyped inline shape) — the one panel contract left out of the
// AssignBotNodeData typing every sibling panel already uses.
describe('AssignBotPanel — onUpdate receives a properly-shaped AssignBotNodeData', () => {
  it('saves the selected bot and inbox', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(<AssignBotPanel nodeId="n1" data={makeData()} onUpdate={onUpdate} onClose={vi.fn()} />);

    // NodeConfigModal portals its content to document.body (Radix Dialog).
    const [botSelect, inboxSelect] = document.querySelectorAll('select');
    await user.selectOptions(botSelect, 'bot-1');
    await user.selectOptions(inboxSelect, 'inbox-1');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({
        bot_id: 'bot-1',
        bot_name: 'Support Bot',
        inbox_id: 'inbox-1',
        inbox_name: 'Main Inbox',
      }),
    );
  });
});
