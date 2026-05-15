import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from 'lucide-react';
import MenuItem from './MenuItem';
import type { MenuItem as MenuItemType } from '../config/menuItems';

vi.mock('@evoapi/design-system', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => (asChild ? <>{children}</> : <div>{children}</div>),
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

const settingsItem: MenuItemType = {
  id: 'settings',
  name: 'Settings',
  href: '#',
  icon: Settings,
  subItems: [{ name: 'General', href: '/settings/general', icon: Settings }],
};

function renderMenuItem(props: Partial<Parameters<typeof MenuItem>[0]> = {}) {
  return render(
    <MemoryRouter>
      <MenuItem
        item={settingsItem}
        isCollapsed={true}
        isActive={false}
        activeMenu={null}
        onClick={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('MenuItem — collapsed tooltip (regression: EVO-1048 iter 1 HIGH fix)', () => {
  it('shows only item name in tooltip when collapsed', () => {
    renderMenuItem({ isCollapsed: true });
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.textContent).toBe('Settings');
  });

  it('tooltip content contains no interactive links in collapsed mode', () => {
    renderMenuItem({ isCollapsed: true });
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.querySelector('a')).toBeNull();
    expect(tooltip.querySelector('button')).toBeNull();
  });

  it('does not render tooltip content when sidebar is expanded', () => {
    renderMenuItem({ isCollapsed: false });
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
  });
});
