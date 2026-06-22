import { describe, it, expect } from 'vitest';
import {
  autoMap,
  buildBulkItem,
  normalizeServerErrorMessage,
  unmappedRequiredFields,
  validateAll,
} from './bulkImport';

describe('bulkImport (EVO-1734) — autoMap', () => {
  it('matches common synonyms case/spacing-insensitively', () => {
    const m = autoMap(['Nome', 'SKU', 'Default Price', 'Currency', 'Foo']);
    expect(m).toEqual({
      Nome: 'name',
      SKU: 'sku',
      'Default Price': 'default_price',
      Currency: 'currency',
      Foo: '',
    });
  });
});

describe('bulkImport (EVO-1734) — buildBulkItem', () => {
  it('requires name', () => {
    const { item, errors } = buildBulkItem(['', 'physical'], ['name', 'kind'], { name: 'name', kind: 'kind' });
    expect(item.name).toBe('');
    expect(errors).toEqual([{ field: 'name', message: 'required' }]);
  });

  it('rejects unknown kind/status/currency', () => {
    const { errors } = buildBulkItem(
      ['x', 'service', 'BTC', 'archived'],
      ['name', 'kind', 'currency', 'status'],
      { name: 'name', kind: 'kind', currency: 'currency', status: 'status' },
    );
    const fields = errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['kind', 'currency', 'status']));
  });

  it('parses BR-style decimals (1,50 → 1.5)', () => {
    const { item, errors } = buildBulkItem(['x', '1,50'], ['name', 'price'], {
      name: 'name',
      price: 'default_price',
    });
    expect(errors).toEqual([]);
    expect(item.default_price).toBe(1.5);
  });

  it('rejects ambiguous thousand grouping instead of silently corrupting (1,000)', () => {
    const { item, errors } = buildBulkItem(['x', '1,000'], ['name', 'price'], {
      name: 'name',
      price: 'default_price',
    });
    // "1,000" is ambiguous (1000 US vs 1.000 BR) → flagged, never coerced to 1.
    expect(errors).toContainEqual({ field: 'default_price', message: 'invalid_number' });
    expect(item.default_price).toBeUndefined();
  });

  it('still accepts comma decimals that are not 3-digit grouping (10,5 → 10.5)', () => {
    const { item, errors } = buildBulkItem(['x', '10,5'], ['name', 'price'], {
      name: 'name',
      price: 'default_price',
    });
    expect(errors).toEqual([]);
    expect(item.default_price).toBe(10.5);
  });

  it('rejects non-integer stock', () => {
    const { errors } = buildBulkItem(['x', '1.5'], ['name', 'stock'], {
      name: 'name',
      stock: 'stock_quantity',
    });
    expect(errors).toContainEqual({ field: 'stock_quantity', message: 'must_be_integer' });
  });

  it('splits labels on , ; |', () => {
    const { item } = buildBulkItem(['x', 'a, b; c|d'], ['name', 'tags'], {
      name: 'name',
      tags: 'labels',
    });
    expect(item.labels).toEqual(['a', 'b', 'c', 'd']);
  });

  it('rejects non-http purchase_url', () => {
    const { errors } = buildBulkItem(['x', 'ftp://bad'], ['name', 'link'], {
      name: 'name',
      link: 'purchase_url',
    });
    expect(errors).toContainEqual({ field: 'purchase_url', message: 'invalid_url' });
  });
});

describe('bulkImport (EVO-1734) — validateAll', () => {
  it('flags duplicated SKU within the batch on the 2nd occurrence', () => {
    const headers = ['name', 'sku'];
    const mapping = { name: 'name', sku: 'sku' } as const;
    const result = validateAll(
      [
        ['A', 'DUP'],
        ['B', 'DUP'],
      ],
      headers,
      [2, 3],
      mapping,
    );
    expect(result[0].errors).toEqual([]);
    expect(result[1].errors).toContainEqual({ field: 'sku', message: 'duplicated_within_batch' });
  });

  it('carries server-style 0-based index and original csvLine', () => {
    const result = validateAll([['A']], ['name'], [5], { name: 'name' });
    expect(result[0].index).toBe(0);
    expect(result[0].csvLine).toBe(5);
  });
});

describe('bulkImport (EVO-1734) — normalizeServerErrorMessage', () => {
  it('maps raw Rails messages onto stable serverErrors codes', () => {
    expect(normalizeServerErrorMessage('has already been taken')).toBe('taken');
    expect(normalizeServerErrorMessage("can't be blank")).toBe('required');
    expect(normalizeServerErrorMessage('duplicated within batch')).toBe('duplicated_within_batch');
    expect(normalizeServerErrorMessage('is too long (maximum is 255 characters)')).toBe('too_long');
    expect(normalizeServerErrorMessage('is not a number')).toBe('invalid_number');
    expect(normalizeServerErrorMessage('must be greater than or equal to 0')).toBe('must_be_non_negative');
  });

  it('passes client-side codes through unchanged so they keep matching their key', () => {
    expect(normalizeServerErrorMessage('required')).toBe('required');
    expect(normalizeServerErrorMessage('too_long')).toBe('too_long');
    expect(normalizeServerErrorMessage('duplicated_within_batch')).toBe('duplicated_within_batch');
    expect(normalizeServerErrorMessage('invalid_number')).toBe('invalid_number');
  });

  it('falls through to the raw message when it cannot be mapped', () => {
    expect(normalizeServerErrorMessage('some brand new error')).toBe('some brand new error');
  });
});

describe('bulkImport (EVO-1734) — unmappedRequiredFields', () => {
  it('returns name when no header maps to it', () => {
    expect(unmappedRequiredFields({ foo: 'sku', bar: '' })).toEqual(['name']);
  });
  it('returns empty when name is mapped', () => {
    expect(unmappedRequiredFields({ Nome: 'name' })).toEqual([]);
  });
});
