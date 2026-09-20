import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { SendMessageNode } from './SendMessageNode';
import { DnDProvider } from '@/contexts/DnDContext';

const mockT = vi.fn((key: string) => key);
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: mockT, currentLanguage: 'en' }),
}));

function renderNode() {
  return render(
    <DnDProvider>
      <ReactFlowProvider>
        <SendMessageNode selected={false} data={{ label: 'Send Message' }} id="n1" />
      </ReactFlowProvider>
    </DnDProvider>,
  );
}

// Same bug as AddLabelNode — the title was a hardcoded PT literal
// ("Enviar Mensagem") instead of going through t() like the rest of the node.
describe('SendMessageNode — title is i18n, not hardcoded PT', () => {
  it('renders the title via the same key the palette uses for this node', () => {
    renderNode();

    expect(mockT).toHaveBeenCalledWith('flowEditor.nodes.sendMessage.name');
    expect(screen.getByText('flowEditor.nodes.sendMessage.name')).toBeTruthy();
    expect(screen.queryByText('Enviar Mensagem')).toBeNull();
  });
});
