import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { DeferConversationNode } from './DeferConversationNode';
import { DnDProvider } from '@/contexts/DnDContext';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

function renderNode() {
  return render(
    <DnDProvider>
      <ReactFlowProvider>
        <DeferConversationNode
          selected={false}
          data={{
            label: 'Defer',
            snooze_type: 'until_date',
            snooze_until: '2026-09-01T10:00:00.000Z',
          }}
          id="n1"
        />
      </ReactFlowProvider>
    </DnDProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// The formatted date used to always render pt-BR (Date.prototype.toLocale*
// hardcoded that locale string), regardless of the app's selected language.
describe('DeferConversationNode — date formatting follows the app language', () => {
  it('formats the snooze date/time with the current language, not a hardcoded pt-BR', () => {
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString');
    const timeSpy = vi.spyOn(Date.prototype, 'toLocaleTimeString');

    renderNode();

    expect(dateSpy).toHaveBeenCalledWith('en');
    expect(dateSpy).not.toHaveBeenCalledWith('pt-BR');
    expect(timeSpy.mock.calls.some(call => call[0] === 'en')).toBe(true);
    expect(timeSpy.mock.calls.some(call => call[0] === 'pt-BR')).toBe(false);
  });
});
