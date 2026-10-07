import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomToolsTable from './CustomToolsTable';
import { mergeTagOptions, buildCustomToolFilterTypes } from './customToolFilterTypes';
import { CustomTool } from '@/types/ai';

const can = vi.fn();

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: (...args: unknown[]) => can(...args), isReady: true }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const tool = {
  id: 't-1',
  name: 'Weather',
  method: 'GET',
  endpoint: 'https://api.example.com',
  tags: ['api'],
  created_at: '2026-10-01T00:00:00Z',
} as unknown as CustomTool;

const renderTable = (overrides: Partial<React.ComponentProps<typeof CustomToolsTable>> = {}) => {
  const props = {
    tools: [tool],
    selectedTools: [],
    onSelectionChange: vi.fn(),
    onToolClick: vi.fn(),
    onEditTool: vi.fn(),
    onDeleteTool: vi.fn(),
    onTestTool: vi.fn(),
    ...overrides,
  };
  render(<CustomToolsTable {...props} />);
  return props;
};

describe('CustomToolsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockReturnValue(true);
  });

  it('offers Edit and Delete in the row menu', async () => {
    const props = renderTable();

    await userEvent.click(screen.getByRole('button', { name: 'table.columns.actions' }));
    expect(await screen.findByText('table.actions.edit')).toBeInTheDocument();
    await userEvent.click(screen.getByText('table.actions.delete'));

    expect(props.onDeleteTool).toHaveBeenCalledWith(tool);
  });

  it('hides each menu entry the user has no permission for', async () => {
    can.mockImplementation((_resource: string, action: string) => action !== 'delete');
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: 'table.columns.actions' }));
    expect(await screen.findByText('table.actions.edit')).toBeInTheDocument();
    expect(screen.queryByText('table.actions.delete')).not.toBeInTheDocument();
  });

  it('drops the row menu when neither edit nor delete is allowed', () => {
    can.mockReturnValue(false);
    renderTable();

    expect(screen.queryByRole('button', { name: 'table.columns.actions' })).not.toBeInTheDocument();
  });

  it('selects every row from the header checkbox', async () => {
    const props = renderTable();

    await userEvent.click(screen.getByRole('checkbox', { name: 'table.selectAll' }));

    expect(props.onSelectionChange).toHaveBeenCalledWith([tool]);
  });

  it('shows a no-results row instead of rows when the list is empty', () => {
    renderTable({ tools: [] });

    expect(screen.getByText('table.empty.noResults')).toBeInTheDocument();
  });
});

describe('custom tool filter types', () => {
  it('accumulates sorted tags, deduped case-insensitively like the backend matches them', () => {
    const known = mergeTagOptions(['zeta'], [tool]);
    expect(mergeTagOptions(known, [{ ...tool, tags: ['API', 'beta', '  '] }])).toEqual([
      'api',
      'beta',
      'zeta',
    ]);
  });

  it('trims tags, since the backend trims the value it receives', () => {
    expect(mergeTagOptions(['api'], [{ ...tool, tags: [' padded ', ' api'] }])).toEqual([
      'api',
      'padded',
    ]);
  });

  it('suggests the known tags on a free-text Tags filter with every backend operator', () => {
    const types = buildCustomToolFilterTypes(['api']);
    const tags = types.find(type => type.attributeKey === 'tags');

    expect(tags?.inputType).toBe('plain_text');
    expect(tags?.suggestions).toEqual(['api']);
    expect(tags?.options).toBeUndefined();
    expect(tags?.filterOperators.map(operator => operator.key)).toEqual([
      'equal_to',
      'not_equal_to',
      'contains',
      'does_not_contain',
      'is_present',
      'is_not_present',
    ]);
    expect(types.find(type => type.attributeKey === 'method')?.options?.length).toBeGreaterThan(0);
  });
});
