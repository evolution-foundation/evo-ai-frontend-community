import { describe, it, expect } from 'vitest';
import {
  coerceJsonValue,
  getEffectiveBodyMode,
  isValidJsonBody,
  serializeBody,
  tryParseToFields,
  validateFields,
} from './webhookBody';
import { WebhookBodyField } from '../SendWebhookNode';

const field = (key: string, value: string, type: WebhookBodyField['type'] = 'string'): WebhookBodyField => ({
  id: `${key}-${value}`,
  key,
  value,
  type,
});

describe('coerceJsonValue', () => {
  it('emits real number for numeric literal', () => {
    expect(coerceJsonValue('30', 'number')).toBe(30);
  });
  it('keeps a {{variable}} as string even when typed number', () => {
    expect(coerceJsonValue('{{contact.age}}', 'number')).toBe('{{contact.age}}');
  });
  it('keeps a non-numeric literal as string rather than NaN', () => {
    expect(coerceJsonValue('abc', 'number')).toBe('abc');
    expect(coerceJsonValue('', 'number')).toBe('');
  });
  it('emits real booleans for true/false', () => {
    expect(coerceJsonValue('true', 'boolean')).toBe(true);
    expect(coerceJsonValue('false', 'boolean')).toBe(false);
  });
  it('keeps non-boolean text as string for boolean type', () => {
    expect(coerceJsonValue('maybe', 'boolean')).toBe('maybe');
  });
});

describe('serializeBody (json)', () => {
  it('builds typed JSON, preserving variable tokens and dropping blank keys', () => {
    const fields = [
      field('name', '{{contact.name}}', 'string'),
      field('age', '30', 'number'),
      field('active', 'true', 'boolean'),
      field('', 'orphan', 'string'),
    ];
    const out = serializeBody(fields, 'json');
    expect(JSON.parse(out)).toEqual({ name: '{{contact.name}}', age: 30, active: true });
  });
  it('serializes empty fields to an empty object', () => {
    expect(serializeBody([], 'json')).toBe('{}');
  });
});

describe('serializeBody (form)', () => {
  it('joins key=value without percent-encoding so variables survive', () => {
    const fields = [field('a', '1'), field('b', '{{contact.name}}')];
    expect(serializeBody(fields, 'form')).toBe('a=1&b={{contact.name}}');
  });
});

describe('tryParseToFields (json)', () => {
  it('parses a flat object into typed rows', () => {
    const fields = tryParseToFields('{"name":"x","age":30,"active":true}', 'json');
    expect(fields).not.toBeNull();
    expect(fields!.map(f => [f.key, f.value, f.type])).toEqual([
      ['name', 'x', 'string'],
      ['age', '30', 'number'],
      ['active', 'true', 'boolean'],
    ]);
  });
  it('returns null for invalid JSON', () => {
    expect(tryParseToFields('{ "a": }', 'json')).toBeNull();
  });
  it('returns null when a top-level value is nested (guard against lossy flatten)', () => {
    expect(tryParseToFields('{"contact":{"id":"1"}}', 'json')).toBeNull();
    expect(tryParseToFields('{"tags":["a","b"]}', 'json')).toBeNull();
  });
  it('returns [] for empty body', () => {
    expect(tryParseToFields('', 'json')).toEqual([]);
  });
});

describe('tryParseToFields (form)', () => {
  it('parses urlencoded pairs into string rows', () => {
    const fields = tryParseToFields('a=1&b=2', 'form');
    expect(fields!.map(f => [f.key, f.value, f.type])).toEqual([
      ['a', '1', 'string'],
      ['b', '2', 'string'],
    ]);
  });
});

describe('validateFields', () => {
  it('passes for distinct keys', () => {
    expect(validateFields([field('a', '1'), field('b', '2')])).toEqual({ ok: true });
  });
  it('ignores a fully-empty row', () => {
    expect(validateFields([field('', ''), field('a', '1')])).toEqual({ ok: true });
  });
  it('flags a valued row with a blank key', () => {
    expect(validateFields([field('', 'x')])).toEqual({ ok: false, error: 'blankKey' });
  });
  it('flags duplicate keys', () => {
    expect(validateFields([field('a', '1'), field('a', '2')])).toEqual({ ok: false, error: 'duplicateKey' });
  });
});

describe('isValidJsonBody', () => {
  it('accepts empty', () => expect(isValidJsonBody('')).toBe(true));
  it('accepts valid JSON', () => expect(isValidJsonBody('{"a":1}')).toBe(true));
  it('tolerates {{variables}} (quoted or unquoted)', () => {
    expect(isValidJsonBody('{"name":"{{contact.name}}"}')).toBe(true);
    expect(isValidJsonBody('{"id": {{contact.id}} }')).toBe(true);
  });
  it('rejects genuinely malformed JSON', () => {
    expect(isValidJsonBody('{ "a": }')).toBe(false);
  });
});

describe('getEffectiveBodyMode', () => {
  it('forces raw for non-structured body types', () => {
    expect(getEffectiveBodyMode({ bodyType: 'xml', body: '<x/>' })).toBe('raw');
  });
  it('honors a persisted bodyMode above all', () => {
    expect(getEffectiveBodyMode({ bodyType: 'json', body: '{}', bodyMode: 'raw' })).toBe('raw');
    expect(getEffectiveBodyMode({ bodyType: 'json', bodyMode: 'structured' })).toBe('structured');
  });
  it('opens legacy raw body (no structured, no mode) in raw', () => {
    expect(getEffectiveBodyMode({ bodyType: 'json', body: '{"a":1}' })).toBe('raw');
  });
  it('opens existing structured rows in structured', () => {
    expect(getEffectiveBodyMode({ bodyType: 'json', bodyStructured: [field('a', '1')] })).toBe('structured');
  });
  it('defaults a brand-new structured-capable node to structured', () => {
    expect(getEffectiveBodyMode({ bodyType: 'json' })).toBe('structured');
  });
});
