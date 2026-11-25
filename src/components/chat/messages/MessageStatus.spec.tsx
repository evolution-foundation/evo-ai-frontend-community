import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageStatus from './MessageStatus';
import type { Message } from '@/types/chat/api';

vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const message = (status: string, extra: Record<string, unknown> = {}) =>
  ({ id: 'm1', status, created_at: 1788091200, private: false, ...extra }) as unknown as Message;

// A bolha própria é `bg-primary` (ou roxa, de bot): o ícone não pode usar a cor dela.
const iconClass = (status: string, variant: 'default' | 'tuck' = 'default', extra = {}) =>
  render(<MessageStatus message={message(status, extra)} isOwn variant={variant} />)
    .container.querySelector('svg')!
    .getAttribute('class')!;

describe('MessageStatus em bolha colorida', () => {
  it.each(['default', 'tuck'] as const)('lido tem cor própria, diferente da bolha e do entregue (%s)', variant => {
    const read = iconClass('read', variant);
    expect(read).toContain('text-sky-300');
    expect(read).not.toContain('text-primary');
    expect(read).not.toContain('orange');
  });

  it.each(['sent', 'delivered', 'progress', 'queued'])('%s fica claro sobre a bolha', status => {
    expect(iconClass(status)).toContain('text-white/70');
  });

  it('nota privada (fundo claro) continua com a cor neutra', () => {
    expect(iconClass('sent', 'default', { private: true })).toContain('text-muted-foreground');
  });
});
