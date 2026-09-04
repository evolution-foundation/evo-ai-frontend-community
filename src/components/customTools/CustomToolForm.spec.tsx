import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomToolForm from './CustomToolForm';
import type { CustomTool } from '@/types/ai';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/agents/customToolsService', () => ({
  testCustomTool: vi.fn(),
}));

// The vault picker (EVO-2250 story 2.4) loads credentials on mount, and the
// retirement guard (story 2.7) decides whether inline auth headers still edit.
const getIntegrationVaultMigrationState = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: vi.fn().mockResolvedValue([]),
  getIntegrationVaultMigrationState: (...args: unknown[]) =>
    getIntegrationVaultMigrationState(...args),
}));

beforeEach(() => {
  // Default: the guard says NOT retired, so every pre-2.7 test keeps its
  // original behavior.
  getIntegrationVaultMigrationState.mockResolvedValue({ retired: {} });
});

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
    // GET default: 3 key-value editors (headers, query, path), no body editor
    expect(screen.getAllByText('keyValueEditor.addRow').length).toBe(3);
    expect(screen.queryByText('form.fields.bodyParams.addParam')).toBeNull();

    const toolPost: CustomTool = { ...baseTool, method: 'POST' };
    rerender(<CustomToolForm tool={toolPost} mode="edit" onSubmit={() => {}} />);
    // Body params now use a dedicated schema editor, not a key-value one
    expect(screen.getAllByText('keyValueEditor.addRow').length).toBe(3);
    expect(screen.getByText('form.fields.bodyParams.addParam')).toBeTruthy();
  });

  it('renders an existing body_params schema in the dedicated editor', () => {
    const toolWithBody: CustomTool = {
      ...baseTool,
      method: 'POST',
      body_params: {
        queryText: { type: 'string', required: true, description: 'the query' },
      },
    };
    const { rerender } = render(
      <CustomToolForm mode="create" onSubmit={() => {}} />,
    );
    rerender(<CustomToolForm tool={toolWithBody} mode="edit" onSubmit={() => {}} />);
    expect(screen.getByTestId('body_params-body-editor')).toBeTruthy();
    expect(screen.getByDisplayValue('queryText')).toBeTruthy();
    expect(screen.getByDisplayValue('the query')).toBeTruthy();
  });

  it('opens advanced collapse and shows values/error_handling fields when expanded', () => {
    render(<CustomToolForm mode="create" onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('advancedConfig.title'));
    expect(screen.getByLabelText('form.fields.values.label')).toBeTruthy();
    expect(screen.getByLabelText('form.fields.errorHandling.label')).toBeTruthy();
  });

  // EVO-2250 story 2.4: the vault reference is a MAP (header -> credential),
  // round-tripped untouched through the save payload. A scalar credential_id
  // column could not carry the two-entry case (negative proof).
  it('round-trips credential_refs as a map in the save payload (2.4)', () => {
    const toolWithRefs: CustomTool = {
      ...baseTool,
      credential_refs: { Authorization: 'cred-1', 'X-API-Key': 'cred-2' },
    };
    const onSubmit = vi.fn();
    render(<CustomToolForm tool={toolWithRefs} mode="edit" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByText('form.actions.save').closest('form')!);

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.credential_refs).toEqual({
      Authorization: 'cred-1',
      'X-API-Key': 'cred-2',
    });
    // The inline headers stay as the fallback until story 2.7.
    expect(payload.headers).toEqual({ Authorization: 'Bearer x' });
  });

  it('sends an empty credential_refs map when nothing references the vault', () => {
    const onSubmit = vi.fn();
    render(<CustomToolForm tool={baseTool} mode="edit" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByText('form.actions.save').closest('form')!);

    expect(onSubmit.mock.calls[0][0].credential_refs).toEqual({});
  });
});

// EVO-2250 story 2.7: with the consumer retired, inline auth headers become
// read-only pointers to the vault, but the payload NEVER stops carrying what
// the backend needs — the update replaces the stored object wholesale, so a
// form that drops the received auth header erases the migrated secret through
// the UI (the exact data-loss path the 1.6 retirement found in its modal).
describe('CustomToolForm — retirement gated by the migration guard (2.7)', () => {
  beforeEach(() => {
    getIntegrationVaultMigrationState.mockResolvedValue({ retired: { custom_tools: true } });
  });

  it('still sends the received auth headers byte-identical after retirement (negative proof)', async () => {
    const onSubmit = vi.fn();
    render(<CustomToolForm tool={baseTool} mode="edit" onSubmit={onSubmit} />);

    await screen.findByText('retirement.authHeadersLocked');
    fireEvent.submit(screen.getByText('form.actions.save').closest('form')!);

    const payload = onSubmit.mock.calls[0][0];
    // This assertion is what fails if the form ever stops sending the field
    // the backend needs on a wholesale update.
    expect(payload.headers.Authorization).toBe('Bearer x');
  });

  it('renders the auth header read-only and keeps other headers editable', async () => {
    const toolWithMixedHeaders: CustomTool = {
      ...baseTool,
      headers: { Authorization: 'Bearer x', 'Content-Type': 'application/json' },
    };
    render(<CustomToolForm tool={toolWithMixedHeaders} mode="edit" onSubmit={() => {}} />);

    await screen.findByText('retirement.managedByVault');
    // The masked row exists, and the secret value never renders.
    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bearer x')).not.toBeInTheDocument();
    // The non-auth header keeps its editable input.
    expect(screen.getByDisplayValue('application/json')).toBeInTheDocument();
  });

  it('keeps the inline editor untouched while the guard says not migrated (AC3)', async () => {
    getIntegrationVaultMigrationState.mockResolvedValue({ retired: {} });
    render(<CustomToolForm tool={baseTool} mode="edit" onSubmit={() => {}} />);

    await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
    expect(screen.queryByText('retirement.authHeadersLocked')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Bearer x')).toBeInTheDocument();
  });

  it('keeps the inline editor when the guard itself fails (fails closed)', async () => {
    getIntegrationVaultMigrationState.mockRejectedValue(new Error('503'));
    render(<CustomToolForm tool={baseTool} mode="edit" onSubmit={() => {}} />);

    await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
    expect(screen.queryByText('retirement.authHeadersLocked')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Bearer x')).toBeInTheDocument();
  });
});
