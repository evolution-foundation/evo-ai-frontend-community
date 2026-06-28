import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomToolForm from './CustomToolForm';
import type { CustomTool } from '@/types/ai';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/agents/customToolsService', () => ({
  testCustomTool: vi.fn(),
}));

const baseTool: CustomTool = {
  id: 'tool-1',
  name: 'My Tool',
  description: 'desc',
  method: 'GET',
  endpoint: 'https://api.example.com/users',
  headers: { Authorization: 'Bearer x' },
  path_params: { user_id: '{user_id}' },
  query_params: { page: '1' },
  body_params: {},
  error_handling: { timeout: 30 },
  values: { default_key: 'v' },
  tags: ['api'],
  examples: ['ex1'],
  input_modes: ['text'],
  output_modes: ['text'],
  created_at: '2026-06-23T00:00:00Z',
  updated_at: '2026-06-23T00:00:00Z',
};

describe('CustomToolForm (refactored)', () => {
  it('renders no JSON textarea visible by default for headers/params (AC1)', () => {
    const { container } = render(
      <CustomToolForm mode="create" onSubmit={() => {}} />,
    );
    const monoTextareas = container.querySelectorAll('textarea.font-mono');
    expect(monoTextareas.length).toBe(0);
    expect(screen.getAllByText('keyValueEditor.addRow').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps advanced collapse closed by default (AC2)', () => {
    render(<CustomToolForm mode="create" onSubmit={() => {}} />);
    expect(screen.queryByLabelText('form.fields.values.label' as never)).toBeNull();
  });

  it('preserves nested header value byte-identical on save (AC6)', () => {
    const toolWithNested: CustomTool = {
      ...baseTool,
      headers: { auth: { bearer: 'abc' }, plain: 'v' },
    };
    const onSubmit = vi.fn();
    render(<CustomToolForm tool={toolWithNested} mode="edit" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByText('form.actions.save').closest('form')!);
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.headers).toEqual({ auth: { bearer: 'abc' }, plain: 'v' });
    expect(payload.path_params).toEqual({ user_id: '{user_id}' });
    expect(payload.query_params).toEqual({ page: '1' });
    expect(payload.values).toEqual({ default_key: 'v' });
    expect(payload.error_handling).toEqual({ timeout: 30 });
    expect(payload.input_modes).toEqual(['text']);
    expect(payload.output_modes).toEqual(['text']);
  });

  it('shows body_params editor only for POST/PUT/PATCH', () => {
    const { rerender } = render(
      <CustomToolForm mode="create" onSubmit={() => {}} />,
    );
    // GET default: 3 key-value editors (headers, query, path)
    expect(screen.getAllByText('keyValueEditor.addRow').length).toBe(3);

    const toolPost: CustomTool = { ...baseTool, method: 'POST' };
    rerender(<CustomToolForm tool={toolPost} mode="edit" onSubmit={() => {}} />);
    // 4 with body_params
    expect(screen.getAllByText('keyValueEditor.addRow').length).toBe(4);
  });

  it('opens advanced collapse and shows values/error_handling fields when expanded', () => {
    render(<CustomToolForm mode="create" onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('advancedConfig.title'));
    expect(screen.getByLabelText('form.fields.values.label')).toBeTruthy();
    expect(screen.getByLabelText('form.fields.errorHandling.label')).toBeTruthy();
  });
});
