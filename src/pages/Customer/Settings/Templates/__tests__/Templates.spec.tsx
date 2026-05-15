import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Templates from '../Templates';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
    changeLanguage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    can: (resource: string, action: string) => resource === 'templates' && ['read', 'export', 'import'].includes(action),
    canAny: () => true,
    canAll: () => true,
  }),
}));

vi.mock('@/services/templates/templatesService', () => ({
  templatesService: {
    getExportableInventory: vi.fn(),
    exportTemplates: vi.fn(),
    importTemplate: vi.fn(),
  },
}));

describe('Templates page', () => {
  it('renders header with title and action buttons when admin', () => {
    render(<Templates />);
    expect(screen.getAllByText('page.title').length).toBeGreaterThan(0);
    expect(screen.getByText('page.actions.export')).toBeInTheDocument();
    expect(screen.getByText('page.actions.import')).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<Templates />);
    expect(screen.getByText('page.empty')).toBeInTheDocument();
  });
});
