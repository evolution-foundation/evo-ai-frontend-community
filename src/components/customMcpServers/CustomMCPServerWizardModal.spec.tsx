import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomMCPServerWizardModal from './CustomMCPServerWizardModal';
import { parseWizardConfig } from './wizardConfig';
import type { CustomMcpServer } from '@/types/ai';

// EVO-1739: the advanced (raw JSON) mode must be lossless and must not bypass the
// validation the step form enforces.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
}));
vi.mock('@/services/agents/customMcpServerService', () => ({
  testCustomMcpServerConnection: vi.fn(),
}));

const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k);

const server: CustomMcpServer = {
  id: 'srv-1',
  client_id: 'c1',
  name: 'My MCP',
  description: 'original description',
  url: 'https://mcp.example/mcp',
  headers: { Authorization: 'Bearer sk' },
  timeout: 30,
  retry_count: 3,
  tags: ['search'],
  tools: [],
  created_at: '',
  updated_at: '',
};

const validConfig = {
  name: 'My MCP',
  description: 'original description',
  url: 'https://mcp.example/mcp',
  headers: { Authorization: 'Bearer sk' },
  timeout: 30,
  retry_count: 3,
  tags: ['search'],
};

const renderWizard = (onSubmit = vi.fn()) => {
  render(
    <CustomMCPServerWizardModal
      open
      embedded
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
      server={server}
    />,
  );
  return onSubmit;
};

const goJson = () => fireEvent.click(screen.getByText('wizard.mode.json'));
const goForm = () => fireEvent.click(screen.getByText('wizard.mode.form'));
const editor = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const saveButton = () => screen.getByText('wizard.actions.save').closest('button')!;
const writeJson = (config: unknown) =>
  fireEvent.change(editor(), { target: { value: JSON.stringify(config) } });

describe('parseWizardConfig', () => {
  it('accepts a well-formed config with no issues', () => {
    const { data, issues } = parseWizardConfig(validConfig, t);
    expect(issues).toEqual([]);
    expect(data).toEqual(validConfig);
  });

  it('treats an absent key as cleared instead of keeping the old value', () => {
    // Deleting a key must clear the field, not fall back to the previous value.
    const { data, issues } = parseWizardConfig({ ...validConfig, description: undefined }, t);
    expect(issues).toEqual([]);
    expect(data.description).toBe('');
  });

  it('reports a wrong-typed number instead of silently reverting it', () => {
    // A wrong-typed number must surface, not revert to the default.
    const { issues } = parseWizardConfig({ ...validConfig, timeout: '60' }, t);
    expect(issues).toContain(t('wizard.advanced.errors.timeoutRange', { min: 1, max: 300 }));
  });

  it.each([
    ['timeout below the range', { timeout: 0 }, 'timeoutRange'],
    ['timeout above the range', { timeout: 999999 }, 'timeoutRange'],
    ['fractional timeout', { timeout: 1.5 }, 'timeoutRange'],
    ['retry_count above the range', { retry_count: 500 }, 'retryRange'],
    ['negative retry_count', { retry_count: -1 }, 'retryRange'],
  ])('enforces the same bounds as the step form: %s', (_label, patch, key) => {
    const { issues } = parseWizardConfig({ ...validConfig, ...patch }, t);
    expect(issues.some(i => i.startsWith(`wizard.advanced.errors.${key}`))).toBe(true);
  });

  it('rejects an unparseable url that the step form would have caught', () => {
    const { issues } = parseWizardConfig({ ...validConfig, url: 'not-a-url' }, t);
    expect(issues).toContain(t('wizard.advanced.errors.urlInvalid'));
  });

  it.each([
    ['empty name', { name: '   ' }, 'nameRequired'],
    ['missing name', { name: undefined }, 'nameRequired'],
    ['empty url', { url: '' }, 'urlRequired'],
    ['missing url', { url: undefined }, 'urlRequired'],
  ])('requires the mandatory fields: %s', (_label, patch, key) => {
    const { issues } = parseWizardConfig({ ...validConfig, ...patch }, t);
    expect(issues).toContain(t(`wizard.advanced.errors.${key}`));
  });

  it('names the header keys whose values are not text', () => {
    // The API binds headers into a string map, so this is a 400 on submit.
    const { issues } = parseWizardConfig(
      { ...validConfig, headers: { 'X-Api-Key': 123, Ok: 'yes', 'X-Flag': true } },
      t,
    );
    expect(issues).toContain(
      t('wizard.advanced.errors.headerValueType', { keys: 'X-Api-Key, X-Flag' }),
    );
  });

  it('rejects non-string tags rather than stringifying them', () => {
    // Coercing would smuggle in [object Object].
    const { issues } = parseWizardConfig({ ...validConfig, tags: [1, {}] }, t);
    expect(issues).toContain(t('wizard.advanced.errors.tagsType'));
  });

  it('collects every problem in one pass', () => {
    const { issues } = parseWizardConfig({ name: '', url: 'nope', timeout: 0, tags: 'a,b' }, t);
    expect(issues).toHaveLength(4);
  });
});

describe('CustomMCPServerWizardModal — advanced JSON mode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('re-enables submit when a valid config is back on screen', () => {
    // Regression: submit used to latch disabled once malformed JSON had been typed.
    renderWizard();
    goJson();
    expect(saveButton()).not.toBeDisabled();

    fireEvent.change(editor(), { target: { value: '{ broken' } });
    expect(saveButton()).toBeDisabled();

    goForm();
    goJson();

    expect(() => JSON.parse(editor().value)).not.toThrow();
    expect(saveButton()).not.toBeDisabled();
  });

  it('blocks submit and lists the problem while the config is invalid', () => {
    const onSubmit = renderWizard();
    goJson();
    writeJson({ ...validConfig, timeout: '60' });

    expect(saveButton()).toBeDisabled();
    expect(
      screen.getByText(t('wizard.advanced.errors.timeoutRange', { min: 1, max: 300 })),
    ).toBeTruthy();

    fireEvent.click(saveButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not commit a partially valid edit', () => {
    // Nothing applies while issues stand, so `data` never mixes fresh and stale values.
    const onSubmit = renderWizard();
    goJson();
    writeJson({ ...validConfig, name: 'Renamed', timeout: 'nope' });
    writeJson(validConfig);
    fireEvent.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'My MCP' }));
  });

  it('saves a config edited entirely through JSON', () => {
    const onSubmit = renderWizard();
    goJson();
    writeJson({
      name: 'Renamed',
      description: '',
      url: 'https://other.example/mcp',
      headers: { 'X-Key': 'v' },
      timeout: 120,
      retry_count: 5,
      tags: ['a', 'b'],
    });
    fireEvent.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Renamed',
      description: '',
      url: 'https://other.example/mcp',
      headers: { 'X-Key': 'v' },
      timeout: 120,
      retry_count: 5,
      tags: ['a', 'b'],
    });
  });

  it('clears a field when its key is removed from the JSON', () => {
    const onSubmit = renderWizard();
    goJson();
    const withoutDescription: Record<string, unknown> = { ...validConfig };
    delete withoutDescription.description;
    writeJson(withoutDescription);
    fireEvent.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: '' }));
  });

  it('keeps JSON edits when switching back to the form', () => {
    const onSubmit = renderWizard();
    goJson();
    writeJson({ ...validConfig, name: 'Renamed in JSON', timeout: 90 });
    goForm();
    goJson();

    const roundTripped = JSON.parse(editor().value);
    expect(roundTripped.name).toBe('Renamed in JSON');
    expect(roundTripped.timeout).toBe(90);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
