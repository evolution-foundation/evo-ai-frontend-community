import { describe, it, expect } from 'vitest';
import { parseCsv, CsvParseError, findDuplicateHeaders } from './parseCsv';

describe('findDuplicateHeaders (EVO-1734)', () => {
  it('returns names that appear more than once', () => {
    expect(findDuplicateHeaders(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b']);
  });
  it('returns empty array when all headers are unique', () => {
    expect(findDuplicateHeaders(['a', 'b', 'c'])).toEqual([]);
  });
  it('treats empty string as a value (caller must guard separately)', () => {
    expect(findDuplicateHeaders(['', '', 'sku'])).toEqual(['']);
  });
});

describe('parseCsv (EVO-1734)', () => {
  it('parses a simple header + rows', () => {
    const out = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
    expect(out.headers).toEqual(['a', 'b', 'c']);
    expect(out.rows).toEqual([
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
    expect(out.rowLines).toEqual([2, 3]);
  });

  it('strips the UTF-8 BOM that Excel exports prepend', () => {
    const out = parseCsv('﻿name,sku\nfoo,SKU-1');
    expect(out.headers).toEqual(['name', 'sku']);
    expect(out.rows[0]).toEqual(['foo', 'SKU-1']);
  });

  it('handles CRLF and LF in the same file', () => {
    const out = parseCsv('a,b\r\n1,2\n3,4\r\n');
    expect(out.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('treats "" inside a quoted field as a literal quote', () => {
    const out = parseCsv('name\n"He said ""hi"""');
    expect(out.rows[0]).toEqual(['He said "hi"']);
  });

  it('keeps embedded commas and newlines inside quotes', () => {
    const out = parseCsv('name,description\n"Foo","Line 1\nLine 2"');
    expect(out.rows[0]).toEqual(['Foo', 'Line 1\nLine 2']);
  });

  it('skips fully blank trailing lines', () => {
    const out = parseCsv('a\n1\n\n');
    expect(out.rows).toEqual([['1']]);
    expect(out.rowLines).toEqual([2]);
  });

  it('throws on unterminated quoted field', () => {
    expect(() => parseCsv('a\n"unterminated')).toThrow(CsvParseError);
  });

  it('throws on a quote that appears inside an unquoted field', () => {
    expect(() => parseCsv('a\nfoo"bar')).toThrow(CsvParseError);
  });

  it('carries a stable error code, not free-text', () => {
    try {
      parseCsv('a\n"unterminated');
    } catch (e) {
      expect(e).toBeInstanceOf(CsvParseError);
      expect((e as CsvParseError).code).toBe('unterminated_quoted_field');
    }
  });
});
