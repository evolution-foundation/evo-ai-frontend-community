import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomToolWizardModal from './CustomToolWizardModal';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/agents/customToolsService', () => ({
  testCustomTool: vi.fn(),
}));

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  open: true,
  onOpenChange: vi.fn(),
  onSubmit: vi.fn(),
  loading: false,
  ...overrides,
});

describe('CustomToolWizardModal', () => {
  it('starts on step 1 (identity) showing name field and continue disabled', () => {
    render(<CustomToolWizardModal {...makeProps()} />);
    expect(screen.getByText('wizard.step1.title')).toBeTruthy();
    const continueBtn = screen.getByRole('button', { name: 'wizard.actions.continue' });
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('advances from step 1 to step 2 after filling name', () => {
    render(<CustomToolWizardModal {...makeProps()} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'My Tool' } });
    const continueBtn = screen.getByRole('button', { name: 'wizard.actions.continue' });
    expect((continueBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(continueBtn);
    expect(screen.getByText('wizard.step2.title')).toBeTruthy();
  });

  it('blocks step 2 → step 3 when endpoint is empty or invalid', () => {
    render(<CustomToolWizardModal {...makeProps()} />);
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    const endpointInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.change(endpointInput, { target: { value: 'not a url' } });
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));
    expect(screen.getByText('form.validation.endpointInvalid')).toBeTruthy();
    expect(screen.getByText('wizard.step2.title')).toBeTruthy();
  });

  it('back button returns to previous step', () => {
    render(<CustomToolWizardModal {...makeProps()} />);
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));
    expect(screen.getByText('wizard.step2.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.back' }));
    expect(screen.getByText('wizard.step1.title')).toBeTruthy();
  });

  it('prefills wizard from tool prop in edit mode and shows save label on submit', () => {
    const editTool = {
      id: 'tool-edit-1',
      name: 'My Existing Tool',
      description: 'desc',
      method: 'POST',
      endpoint: 'https://api.example.com/v1',
      headers: { Authorization: 'Bearer abc' },
      path_params: {},
      query_params: {},
      body_params: { name: 'value' },
      error_handling: { timeout: 45 },
      values: { __modes_meta__: { input: 'doc image', output: 'json data' } },
      tags: ['api'],
      examples: ['ex1'],
      input_modes: ['image'],
      output_modes: ['json'],
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    // Name prefilled
    expect(screen.getByDisplayValue('My Existing Tool')).toBeTruthy();
    // Tag prefilled as chip
    expect(screen.getByText('api')).toBeTruthy();
    // Walk to step 6 to verify save button label
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 3 -> 4
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 5 -> 6
    // In edit mode, submit button reads "save" instead of "create"
    expect(screen.getByRole('button', { name: 'wizard.actions.save' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    // input_modes stays as ['image'] (single-element wrap), modes_meta round-trips through values
    expect(payload.input_modes).toEqual(['image']);
    expect(payload.output_modes).toEqual(['json']);
    // Legacy unnamespaced __modes_meta__ is migrated to the namespaced key
    // on save; the old key must not be re-emitted (or the user could end up
    // with two divergent copies).
    expect((payload.values as Record<string, unknown>).__evo_modes_meta__).toEqual({
      input: 'doc image',
      output: 'json data',
    });
    expect((payload.values as Record<string, unknown>).__modes_meta__).toBeUndefined();
    // Other fields preserved
    expect(payload.name).toBe('My Existing Tool');
    expect(payload.headers).toEqual({ Authorization: 'Bearer abc' });
    expect(payload.body_params).toEqual({ name: 'value' });
  });

  it('renders without a Dialog wrapper when embedded=true', () => {
    const { container } = render(
      <CustomToolWizardModal {...makeProps({ embedded: true })} />,
    );
    // Embedded mode skips Radix Dialog: no [role="dialog"] portal, content rendered inline
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    // But the wizard content (step 1 header) is still visible
    expect(screen.getByText('wizard.step1.title')).toBeTruthy();
  });

  it('submits payload at the end of the flow with collected data', () => {
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ onSubmit })} />);

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'My Tool' } });
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    const endpointInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com/x' } });
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    // step 3
    expect(screen.getByText('wizard.step3.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    // step 4
    expect(screen.getByText('wizard.step4.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    // step 5 - modes
    expect(screen.getByText('wizard.step5.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' }));

    // step 6 - create
    expect(screen.getByText('wizard.step6.title')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.create' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.name).toBe('My Tool');
    expect(payload.endpoint).toBe('https://api.example.com/x');
    expect(payload.method).toBe('GET');
    expect(payload.headers).toEqual({});
    expect(payload.examples).toEqual([]);
  });

  // ----- AC6 regression coverage: PUT must NOT erase fields outside what
  // the wizard UI exposes. The wizard reads them into hidden state on edit
  // and re-emits them on save.

  const walkToFinishAndSave = () => {
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 3 -> 4
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.continue' })); // 5 -> 6
    fireEvent.click(screen.getByRole('button', { name: 'wizard.actions.save' }));
  };

  it('preserves error_handling extras across an unmodified edit cycle (AC6)', () => {
    const editTool = {
      id: 'tool-eh',
      name: 'EH Tool',
      description: '',
      method: 'POST',
      endpoint: 'https://api.example.com/y',
      headers: {},
      path_params: {},
      query_params: {},
      body_params: {},
      // 3 promoted + 2 extras. Extras MUST survive the round trip.
      error_handling: {
        timeout: 30,
        retry_count: 2,
        fallback_response: 'static',
        custom_field: 'kept',
        on_429: { strategy: 'backoff', wait_seconds: 60 },
      },
      values: {},
      tags: [],
      examples: [],
      input_modes: [],
      output_modes: [],
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    walkToFinishAndSave();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const eh = onSubmit.mock.calls[0][0].error_handling as Record<string, unknown>;
    expect(eh.timeout).toBe(30);
    expect(eh.retry_count).toBe(2);
    expect(eh.fallback_response).toBe('static');
    expect(eh.custom_field).toBe('kept');
    expect(eh.on_429).toEqual({ strategy: 'backoff', wait_seconds: 60 });
  });

  it('preserves trailing input_modes/output_modes beyond the primary (AC6)', () => {
    const editTool = {
      id: 'tool-modes',
      name: 'Modes Tool',
      description: '',
      method: 'GET',
      endpoint: 'https://api.example.com/z',
      headers: {},
      path_params: {},
      query_params: {},
      body_params: {},
      error_handling: {},
      values: {},
      tags: [],
      examples: [],
      input_modes: ['stream', 'batch', 'realtime'],
      output_modes: ['json', 'csv'],
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    walkToFinishAndSave();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.input_modes).toEqual(['stream', 'batch', 'realtime']);
    expect(payload.output_modes).toEqual(['json', 'csv']);
  });

  it('reads tools written with the namespaced __evo_modes_meta__ key', () => {
    const editTool = {
      id: 'tool-ns',
      name: 'NS Tool',
      description: '',
      method: 'GET',
      endpoint: 'https://api.example.com/n',
      headers: {},
      path_params: {},
      query_params: {},
      body_params: {},
      error_handling: {},
      values: { __evo_modes_meta__: { input: 'foo', output: 'bar' }, real_key: 'kept' },
      tags: [],
      examples: [],
      input_modes: [],
      output_modes: [],
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    walkToFinishAndSave();
    const payload = onSubmit.mock.calls[0][0];
    const values = payload.values as Record<string, unknown>;
    expect(values.__evo_modes_meta__).toEqual({ input: 'foo', output: 'bar' });
    expect(values.real_key).toBe('kept');
    // Legacy key must NOT leak in.
    expect(values.__modes_meta__).toBeUndefined();
  });

  it('dedupes input_modes/output_modes on save (R2 self-review fix)', () => {
    // Honest scenario: the tool already has a duplicate in input_modes
    // (could come from a prior bad save, an admin SQL edit, or — the
    // real motivating case — the user picking a primary mode that was
    // already in extras). With dedup off, save would re-emit duplicates;
    // with dedup on, the output collapses to unique entries.
    const editTool = {
      id: 'tool-dedup',
      name: 'Dedup Tool',
      description: '',
      method: 'GET',
      endpoint: 'https://api.example.com/d',
      headers: {},
      path_params: {},
      query_params: {},
      body_params: {},
      error_handling: {},
      values: {},
      tags: [],
      examples: [],
      input_modes: ['text', 'text', 'image'],
      output_modes: ['json', 'json'],
      created_at: '2026-06-25T00:00:00Z',
      updated_at: '2026-06-25T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    walkToFinishAndSave();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.input_modes).toEqual(['text', 'image']);
    expect(payload.output_modes).toEqual(['json']);
  });

  it('keeps unrelated values entries intact when no mode descriptions are set', () => {
    const editTool = {
      id: 'tool-values',
      name: 'Values Tool',
      description: '',
      method: 'GET',
      endpoint: 'https://api.example.com/v',
      headers: {},
      path_params: {},
      query_params: {},
      body_params: {},
      error_handling: {},
      values: { alpha: 'a', beta: 'b' },
      tags: [],
      examples: [],
      input_modes: [],
      output_modes: [],
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    };
    const onSubmit = vi.fn();
    render(<CustomToolWizardModal {...makeProps({ tool: editTool, onSubmit })} />);
    walkToFinishAndSave();
    const values = onSubmit.mock.calls[0][0].values as Record<string, unknown>;
    expect(values.alpha).toBe('a');
    expect(values.beta).toBe('b');
    expect(values.__evo_modes_meta__).toBeUndefined();
    expect(values.__modes_meta__).toBeUndefined();
  });
});
