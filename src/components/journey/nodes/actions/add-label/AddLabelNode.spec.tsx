import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { AddLabelNode } from './AddLabelNode';
import { DnDProvider } from '@/contexts/DnDContext';

const mockT = vi.fn((key: string) => key);
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: mockT, currentLanguage: 'en' }),
}));

function renderNode() {
  return render(
    <DnDProvider>
      <ReactFlowProvider>
        <AddLabelNode selected={false} data={{ label: 'Add Label' }} id="n1" />
      </ReactFlowProvider>
    </DnDProvider>,
  );
}

// The node header used to be a hardcoded PT literal ("Adicionar Etiqueta"),
// stuck in Portuguese regardless of the selected language — every other
// title in this file already goes through t().
describe('AddLabelNode — title is i18n, not hardcoded PT', () => {
  it('renders the title via the same key the palette uses for this node', () => {
    renderNode();

    expect(mockT).toHaveBeenCalledWith('flowEditor.nodes.addLabel.name');
    expect(screen.getByText('flowEditor.nodes.addLabel.name')).toBeTruthy();
    expect(screen.queryByText('Adicionar Etiqueta')).toBeNull();
  });
});
