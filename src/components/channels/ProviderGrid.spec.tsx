import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProviderGrid, { Provider } from './ProviderGrid';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// Icon rendering depends on brand assets; irrelevant to the gating under test.
vi.mock('@/components/channels', () => ({ ChannelIcon: () => null }));

const providers: Provider[] = [
  { id: 'evolution', name: 'Evolution', description: 'Evolution API' },
  { id: 'twilio', name: 'Twilio', description: 'Twilio WhatsApp' },
];

const renderGrid = (onSelect = vi.fn()) => {
  render(
    <ProviderGrid
      channelType="whatsapp"
      providers={providers}
      isDisabled={id => id === 'twilio'}
      disabledTooltip={id => (id === 'twilio' ? 'coming-soon' : undefined)}
      onSelect={onSelect}
    />,
  );
  return onSelect;
};

describe('ProviderGrid disabled gating (EVO-2093 Twilio "coming soon")', () => {
  it('selects an enabled provider on click', () => {
    const onSelect = renderGrid();
    fireEvent.click(screen.getByText('Evolution'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'evolution' }));
  });

  it('does not select a disabled provider and renders it as non-clickable', () => {
    const onSelect = renderGrid();
    const twilioCard = screen.getByText('Twilio').closest('.cursor-not-allowed');
    expect(twilioCard).not.toBeNull();
    fireEvent.click(screen.getByText('Twilio'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
