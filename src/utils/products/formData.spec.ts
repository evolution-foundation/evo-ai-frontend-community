import { describe, it, expect } from 'vitest';
import { appendField } from './formData';

const build = (value: unknown, key = 'product[field]'): FormData => {
  const formData = new FormData();
  appendField(formData, key, value);
  return formData;
};

const entries = (formData: FormData): [string, string][] =>
  Array.from(formData.entries()).map(([k, v]) => [k, String(v)]);

describe('appendField', () => {
  it('writes a scalar as-is', () => {
    expect(entries(build('Widget'))).toEqual([['product[field]', 'Widget']]);
    expect(entries(build(19.9))).toEqual([['product[field]', '19.9']]);
    expect(entries(build(false))).toEqual([['product[field]', 'false']]);
  });

  it('sends null as an empty string so the API nulls the column', () => {
    expect(entries(build(null))).toEqual([['product[field]', '']]);
  });

  it('skips undefined entirely', () => {
    expect(entries(build(undefined))).toEqual([]);
  });

  it('expands a string array into repeated [] keys', () => {
    expect(entries(build(['promo', 'novo'], 'product[labels]'))).toEqual([
      ['product[labels][]', 'promo'],
      ['product[labels][]', 'novo'],
    ]);
  });

  // Clearing the last label has to be expressible: an omitted key means
  // "unchanged" to the API, not "empty".
  it('sends an empty array as a single blank element', () => {
    expect(entries(build([], 'product[labels]'))).toEqual([['product[labels][]', '']]);
  });

  // EVO-2226: serialising nested attributes as a JSON string made strong
  // parameters drop the whole branch, so variant edits silently vanished on any
  // submit that carried an image.
  it('expands an array of objects into indexed Rails keys', () => {
    const value = [
      { id: 'v1', name: 'M', position: 0 },
      { name: 'G', position: 1, _destroy: true },
    ];

    expect(entries(build(value, 'product[variants_attributes]'))).toEqual([
      ['product[variants_attributes][0][id]', 'v1'],
      ['product[variants_attributes][0][name]', 'M'],
      ['product[variants_attributes][0][position]', '0'],
      ['product[variants_attributes][1][name]', 'G'],
      ['product[variants_attributes][1][position]', '1'],
      ['product[variants_attributes][1][_destroy]', 'true'],
    ]);
  });

  it('never emits a JSON blob for a nested structure', () => {
    const flat = entries(build([{ name: 'M' }], 'product[variants_attributes]'));
    expect(flat.some(([, v]) => v.startsWith('[') || v.startsWith('{'))).toBe(false);
  });

  it('expands a plain object into bracketed keys', () => {
    expect(entries(build({ origin: 'import', batch: 3 }, 'product[metadata]'))).toEqual([
      ['product[metadata][origin]', 'import'],
      ['product[metadata][batch]', '3'],
    ]);
  });

  it('expands nested objects inside array items', () => {
    const value = [{ name: 'M', attributes_data: { color: 'red' } }];
    expect(entries(build(value, 'product[variants_attributes]'))).toEqual([
      ['product[variants_attributes][0][name]', 'M'],
      ['product[variants_attributes][0][attributes_data][color]', 'red'],
    ]);
  });

  it('appends a File without stringifying it', () => {
    const file = new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' });
    const formData = new FormData();
    appendField(formData, 'product[images][]', file);

    const appended = formData.get('product[images][]');
    expect(appended).toBeInstanceOf(File);
    expect((appended as File).name).toBe('photo.png');
  });
});
