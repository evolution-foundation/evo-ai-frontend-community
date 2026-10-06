import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LabelsTable from './LabelsTable';
import type { Label } from '@/types/settings';

const language = vi.hoisted(() => ({ current: 'pt-BR' }));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: language.current }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => false }),
}));

// 2025-10-01 12:00 UTC, in seconds like the labels API sends it.
const label: Label = {
  id: 'l1',
  title: 'urgente',
  color: '#ff0000',
  show_on_sidebar: false,
  created_at: 1759320000,
  updated_at: 1759320000,
};

const renderTable = () =>
  render(
    <LabelsTable
      labels={[label]}
      selectedLabels={[]}
      loading={false}
      onSelectionChange={vi.fn()}
      onEditLabel={vi.fn()}
      onDeleteLabel={vi.fn()}
      onCreateLabel={vi.fn()}
      sortBy="title"
      sortOrder="asc"
      onSort={vi.fn()}
    />,
  );

describe('LabelsTable — created at column', () => {
  it.each([
    ['pt-BR', '01/10/2025'],
    ['en', '10/1/2025'],
    ['es', '1/10/2025'],
  ])('shows the creation day in %s', (lang, expected) => {
    language.current = lang;
    renderTable();

    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });
});
