import { useRef, useState } from 'react';
import type { ChangeEventHandler } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { WebhookBodyConfig } from './WebhookBodyConfig';
import { SendWebhookNodeData } from '../SendWebhookNode';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// Stub the variable-aware inputs with plain controls so we avoid the journey
// variables fetch / radix popover and can drive them directly.
vi.mock('@/components/journey/environment-manager', () => ({
  VariableInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
  VariableTextarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} />,
}));

const KEY_PH = 'panels.sendWebhook.body.builder.keyPlaceholder';
const VALUE_PH = 'panels.sendWebhook.body.builder.valuePlaceholder';
const ADD_FIELD = 'panels.sendWebhook.body.builder.addField';
const MODE_RAW = 'panels.sendWebhook.body.modeRaw';
const MODE_STRUCTURED = 'panels.sendWebhook.body.modeStructured';
const NESTED_HINT = 'panels.sendWebhook.body.nestedRawOnlyHint';
const TYPE_LABEL = 'panels.sendWebhook.body.builder.typeLabel';

interface HarnessHandle {
  data: () => SendWebhookNodeData;
  changeCount: () => number;
}

function Harness({ initial, handle }: { initial: SendWebhookNodeData; handle: HarnessHandle }) {
  const [data, setData] = useState<SendWebhookNodeData>(initial);
  const changes = useRef(0);
  handle.data = () => data;
  handle.changeCount = () => changes.current;
  return (
    <WebhookBodyConfig
      data={data}
      journeyId="test-journey-id"
      onChange={updates => {
        changes.current += 1;
        setData(prev => ({ ...prev, ...updates }));
      }}
    />
  );
}

function setup(initial: Partial<SendWebhookNodeData>) {
  const handle = { data: () => ({}) as SendWebhookNodeData, changeCount: () => 0 } as HarnessHandle;
  const base: SendWebhookNodeData = { label: 'Webhook', method: 'POST', bodyType: 'json', ...initial };
  render(<Harness initial={base} handle={handle} />);
  return { handle, user: userEvent.setup() };
}

describe('WebhookBodyConfig — structured builder (EVO-1742)', () => {
  it('AC1: builds typed JSON field-by-field and serializes into body', async () => {
    const { handle, user } = setup({ bodyType: 'json' });
    // New json node defaults to structured mode.
    await user.click(screen.getByText(ADD_FIELD));
    await user.type(screen.getByPlaceholderText(KEY_PH), 'name');
    // paste (not type) — userEvent.type treats `{{` as an escape sequence.
    await user.click(screen.getByPlaceholderText(VALUE_PH));
    await user.paste('{{contact.name}}');

    const data = handle.data();
    expect(data.bodyStructured).toHaveLength(1);
    expect(data.bodyStructured![0]).toMatchObject({ key: 'name', value: '{{contact.name}}', type: 'string' });
    expect(JSON.parse(data.body!)).toEqual({ name: '{{contact.name}}' });
  });

  it('AC4: existing raw body opens in raw mode, verbatim, with no mount-time onChange', () => {
    const raw = '{\n  "hi": 1\n}';
    const { handle } = setup({ bodyType: 'json', body: raw });
    // Raw textarea shows the original body; structured builder is absent.
    expect((screen.getByPlaceholderText('panels.sendWebhook.body.jsonPlaceholder') as HTMLTextAreaElement).value).toBe(raw);
    expect(screen.queryByText(ADD_FIELD)).toBeNull();
    // F3: deriving the mode must not fire onChange on mount (no spurious dirty).
    expect(handle.changeCount()).toBe(0);
  });

  it('AC5: round-trips structured ⇄ raw', async () => {
    const { handle, user } = setup({
      bodyType: 'json',
      bodyMode: 'structured',
      bodyStructured: [{ id: 'a', key: 'a', value: '1', type: 'number' }],
      body: '{\n  "a": 1\n}',
    });
    await user.click(screen.getByText(MODE_RAW));
    expect(handle.data().bodyMode).toBe('raw');
    expect((screen.getByPlaceholderText('panels.sendWebhook.body.jsonPlaceholder') as HTMLTextAreaElement).value).toContain('"a": 1');

    await user.click(screen.getByText(MODE_STRUCTURED));
    expect(handle.data().bodyMode).toBe('structured');
    expect(handle.data().bodyStructured!.map(f => [f.key, f.value, f.type])).toEqual([['a', '1', 'number']]);
  });

  it('AC6: refuses raw→structured for nested bodies and shows the hint', async () => {
    const { handle, user } = setup({
      bodyType: 'json',
      bodyMode: 'raw',
      body: '{ "contact": { "id": "1" } }',
    });
    await user.click(screen.getByText(MODE_STRUCTURED));
    expect(screen.getByText(NESTED_HINT, { exact: false })).toBeTruthy();
    expect(handle.data().bodyMode).toBe('raw'); // unchanged — no lossy flatten
  });

  it('AC7: form bodyType serializes urlencoded with no type column', async () => {
    const { handle, user } = setup({ bodyType: 'form' });
    await user.click(screen.getByText(ADD_FIELD));
    await user.type(screen.getByPlaceholderText(KEY_PH), 'a');
    await user.type(screen.getByPlaceholderText(VALUE_PH), '1');

    expect(screen.queryByText(TYPE_LABEL)).toBeNull();
    expect(handle.data().body).toBe('a=1');
  });
});
