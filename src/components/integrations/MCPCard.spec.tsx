import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MCPCard } from './MCPCard';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const mcp = { id: 'github', name: 'GitHub', description: 'Conecte o agente ao GitHub' };

const renderCard = (props: Partial<Parameters<typeof MCPCard>[0]> = {}) =>
  render(
    <MCPCard
      mcp={mcp}
      isEnabled={false}
      isConfigured={false}
      isConnected={false}
      {...props}
    />
  );

describe('MCPCard', () => {
  it('shows "Em breve" disabled when global credentials are missing', () => {
    renderCard({ isConfigured: false });
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('edit.integrations.notAvailable');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  // Fixed palette colours ignore the `.dark` class exactly like the hex literals the
  // token migration removed; a hex grep does not catch them.
  it('styles every button state with theme tokens instead of palette colours', () => {
    for (const props of [
      { isConfigured: false },
      { isConfigured: true, onConfigure: vi.fn() },
      { isConfigured: true, isConnected: true, onConfigure: vi.fn() },
      { isConfigured: true, isEnabled: true, onToggle: vi.fn() },
    ]) {
      const { unmount } = renderCard(props);
      expect(screen.getByRole('button').className).not.toMatch(
        /\b(?:border|text|bg)-(?:gray|green)-\d{2,3}\b/
      );
      unmount();
    }
  });

  it('shows "Ativar" when configured but not yet connected', () => {
    renderCard({ isConfigured: true, onConfigure: vi.fn() });
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('edit.integrations.activate');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('shows "Ativado" when connected', () => {
    renderCard({ isConfigured: true, isConnected: true, onConfigure: vi.fn() });
    expect(screen.getByRole('button').textContent).toContain('edit.integrations.active');
  });

  it('falls back to the plain toggle for MCPs without a config dialog', () => {
    renderCard({ isConfigured: true, isEnabled: true, onToggle: vi.fn() });
    expect(screen.getByRole('button').textContent).toContain('edit.integrations.active');
  });

  it('renders name and description alongside the action', () => {
    renderCard({ isConfigured: true, onConfigure: vi.fn() });
    // BrandIcon also exposes the name through the SVG title, hence getAllByText.
    expect(screen.getAllByText(mcp.name).length).toBeGreaterThan(0);
    expect(screen.getByText(mcp.description)).toBeTruthy();
  });
});
